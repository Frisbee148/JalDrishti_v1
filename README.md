# JalDrishti — Urban Waterlogging Intelligence for Delhi

*Citizen-reported flooding + machine-learned ward risk, on one live map.*

This README is written as a questionnaire: every section is a question someone actually asks about the project, answered directly.

---

## 1. The Problem

### Q. What problem does JalDrishti solve?

Every monsoon, Delhi's roads flood. The information about *where* it is flooding is scattered — stuck in phone calls to control rooms, tweets, and WhatsApp forwards. Municipal teams end up reacting late, with no way to rank which of the city's 250+ wards need pumps and crews *first*.

JalDrishti solves three pieces of that:

1. **Collection** — citizens photograph waterlogging and submit it with location in seconds.
2. **Verification** — AI checks the photo is genuinely waterlogging (and not a duplicate, meme, or web image) before an admin ever sees it.
3. **Prediction** — a Random Forest model scores every ward's waterlogging risk for any rainfall amount, so teams can pre-position resources *before* the water rises.

### Q. Who uses it?

- **Citizens** — report incidents (`/reports`), see verified flooding live on the map (`/dashboard`).
- **Admins / municipal operators** — review AI-screened reports, approve/reject, sort by severity, dispatch via "View on Live Map" (`/admin`).
- **Planners** — drag the virtual-rain slider and watch predicted ward risk change in real time, including the **Top Risk Wards** leaderboard.

---

## 2. The Random Forest Model

### Q. What exactly does the Random Forest predict?

A continuous **base waterlogging risk score (0–100)** for each of Delhi's wards. "Base" means: risk under a reference rainfall (~50 mm). Rainfall is then applied on top at query time (see the scaling formula below), so one trained model serves *any* rainfall scenario without retraining.

### Q. Which features does each ward have?

Eight features per ward, from `backend/data/ward_features.csv`:

| Feature | What it captures | Effect on risk |
|---|---|---|
| `ISP` | Impervious Surface Percentage (concrete/asphalt cover) | ↑ more sealed ground → more runoff |
| `runoff_coeff` | Runoff coefficient of the ward's surface mix | ↑ water flows instead of soaking in |
| `elevation_factor` | Low-lying (1.0) vs elevated (≈0.4) terrain | ↑ water collects in low areas |
| `NDVI` | Vegetation index (greenness) | ↓ vegetation absorbs water |
| `population_density` | People per km² | ↑ proxy for congestion + drainage load |
| `road_density` | Road km per km² | context for runoff channeling |
| `capacity_cusecs` | Drainage capacity of the ward's basin | ↓ bigger drains empty faster |
| `area_acres` | Ward area | normalizes the others |

### Q. What is the exact formula behind the training labels?

Ground-truth flooding data per ward doesn't exist publicly at this granularity, so labels are **synthesized with a physics-weighted formula and calibrated against known chronic hotspots** (`backend/prepare_ward_data.py`):

```
base_risk = ( 0.30 × ISP_norm
            + 0.25 × runoff_norm
            + 0.20 × elevation_factor
            + 0.15 × (1 − NDVI_norm)
            + 0.10 × pop_density_norm
            − 0.15 × drain_capacity_norm ) × 100
```

- Each `*_norm` is min-max normalized to [0, 1] across all wards.
- Result clipped to [5, 95].
- **Hotspot calibration:** wards known to flood every year are floored at `base_risk ≥ 72`.
- Gaussian noise `N(0, 4)` is added so the forest learns the feature→risk relationship rather than memorizing an exact linear formula.

### Q. Why train a Random Forest at all if the label came from a formula?

Fair question — three reasons:

1. **The forest learns non-linear interactions** the linear formula can't express once noise and hotspot calibration break the pure linearity (e.g., high ISP matters *more* when drainage capacity is also low).
2. **It generalizes to new/edited feature data** — update a ward's features and the model re-scores it without touching any formula.
3. **It's the standard upgrade path** — when real historical flooding labels become available (MCD complaint logs, news-scraped incidents), they drop into the same training script and everything downstream keeps working.

### Q. What are the model's hyperparameters and metrics?

From `backend/train_rf.py`:

```python
RandomForestRegressor(
    n_estimators=200,     # 200 trees
    max_depth=12,         # limits overfitting on ~250 rows
    min_samples_leaf=2,
    random_state=42,
)
```

- 80/20 train/test split; the script prints **RMSE**, **R²**, and per-feature importances on every run.
- Saved as `backend/models/rf_waterlogging.pkl` (a `joblib` bundle: `{"model", "features"}`).
- Retrain any time: `python3 backend/train_rf.py`.

### Q. How does rainfall enter the prediction?

At query time (`POST /predict` in `backend/main.py`), each ward's model output is scaled by a non-linear rain factor:

```
rain_factor = (rainfall_mm / 50) ^ 0.65
risk        = min(100, base_risk × rain_factor)
```

Why the 0.65 exponent? Flood response to rain is **concave** — the jump from 0→50 mm matters much more than 100→150 mm, because drains are already overwhelmed. Concretely: 50 mm ≈ 1.0× (baseline), 100 mm ≈ 1.6×, 150 mm ≈ 2.4×.

Rainfall can be supplied globally or **per drainage basin** (`basin_rainfall`), since a cloudburst over Najafgarh basin shouldn't raise risk in the Yamuna East wards.

### Q. How do scores become the High / Medium / Low statuses?

```
risk > 65  →  High
risk > 35  →  Medium
otherwise  →  Low
```

The dashboard's ward choropleth, extrusion heights, and the Top Risk Wards leaderboard all derive from these scores.

---

## 3. Image Verification Pipeline

### Q. What happens when a citizen uploads a photo?

`POST /analyze` runs a layered pipeline:

1. **Forensics**
   - **EXIF check** — no camera metadata suggests a screenshot/web image ("Likely Web/Digital Source").
   - **Perceptual hash (pHash) duplicate check** — resubmitting the same or near-identical image is flagged. (Checked **once** per upload; the result is passed down so the image is never compared against itself.)
   - Optional **Google Vision reverse-image search** if a key is configured.
2. **Zero-shot classification — SigLIP, running locally** (`google/siglip-base-patch16-224` via `transformers`). The image is scored against contrastive prompts — positives ("a flooded waterlogged street with standing water") vs negatives ("a dry street", "a river, lake or ocean", "an indoor scene"). Confidence = positive probability mass ÷ total mass; waterlogged if > 0.5. *(HF's serverless inference API no longer serves zero-shot image models — "Model not supported by provider hf-inference" — hence local inference.)*
3. **OpenCV fallback** — if the model isn't installed/loaded: HSV color masks for muddy water and grey reflective water over the bottom half of the frame. Waterlogged if > 10% of pixels match; severity High > 60%, Moderate > 40%; estimated depth ≈ `percentage / 20` ft.

### Q. What guards exist against bad or low-confidence reports?

- **40% confidence gate** — if AI confidence is below 40%, the report is *never* labeled waterlogged, regardless of what the classifier said. Enforced server-side in `/submit` and mirrored in the admin UI.
- **Auto-reject** — non-waterlogged submissions are `auto_rejected` and never clutter the public map or the admin queue.
- **Duplicates/web-sourced images** are flagged `is_spam` but still reach admin review *if* genuinely waterlogged — a real flood photo forwarded twice is still a real flood.
- **Community votes** — agree/disagree counts on each report give admins a crowd signal.
- **Human-in-the-loop always** — nothing appears on the public map without admin approval.

---

## 4. Architecture

### Q. What's the stack?

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router) + Tailwind + Mapbox GL |
| Backend | FastAPI (Python) |
| ML — ward risk | scikit-learn RandomForestRegressor |
| ML — image check | SigLIP (transformers, local) → OpenCV fallback |
| Forensics | Pillow EXIF + imagehash pHash |
| Storage | In-memory (demo); uploads on disk at `backend/static/uploads/` |

### Q. What are the main pages?

- `/dashboard` — live Mapbox map: verified reports, ward risk choropleth, virtual-rain slider, chronic hotspots, **Top Risk Wards** leaderboard.
- `/reports` — citizen submission flow with instant AI analysis feedback.
- `/admin` — command center: stats, severity sorting, AI + forensics panel per report, approve/reject.
- `/methodology` — how the science works, in-app.

### Q. What are the key API endpoints?

| Endpoint | Purpose |
|---|---|
| `POST /analyze` | Run the image verification pipeline on an upload |
| `POST /submit` | Save a report (applies confidence gate + spam flags) |
| `GET /reports` | List reports (`?all=true` for admin view) |
| `PUT /reports/{id}/status` | Admin approve/reject |
| `POST /reports/{id}/react` | Community agree/disagree |
| `POST /predict` | RF ward-risk scores for a rainfall scenario |

---

## 5. Running It

### Q. How do I set it up?

```bash
# 1. Frontend deps
npm install

# 2. Backend deps (CPU-only torch keeps it ~200MB instead of 2.5GB)
pip install -r backend/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# 3. Environment — create .env in the project root:
NEXT_PUBLIC_MAPBOX_TOKEN=<your mapbox token>
HF_TOKEN=<optional, HuggingFace>
AZURE_CV_KEY=<optional>
GOOGLE_VISION_KEY=<optional>

# 4. Train the RF model (only needed once, or after editing ward data)
python3 backend/train_rf.py

# 5. Run
uvicorn backend.main:app --reload --port 8000   # backend
npm run dev                                      # frontend → http://localhost:3000
```

Notes:
- First image upload downloads the SigLIP model (~800 MB) and is slow; subsequent uploads take a few hundred ms. Without `transformers`/`torch` installed, everything still works via the OpenCV fallback.
- Mapbox tiles can be slow on first load — give the map a moment.
- The report store is in-memory: restarting the backend clears reports (uploaded images persist on disk).

### Q. What would production hardening look like?

- Swap in-memory storage for Postgres/PostGIS; move uploads to object storage.
- Real rainfall from the IMD feed instead of the manual slider.
- Retrain RF on real incident labels (MCD complaints, historical callouts).
- AuthN/AuthZ for the admin console; rate limiting on submissions.
