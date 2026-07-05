import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import io
from PIL import Image
import os
import json
import joblib
import pandas as pd
from dotenv import load_dotenv
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import VisualFeatureTypes
from msrest.authentication import CognitiveServicesCredentials

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure Configuration
AZURE_KEY = os.getenv("AZURE_CV_KEY")
AZURE_ENDPOINT = os.getenv("AZURE_CV_ENDPOINT")

# Initialize Client
computervision_client = None
if AZURE_KEY and AZURE_ENDPOINT:
    try:
        computervision_client = ComputerVisionClient(AZURE_ENDPOINT, CognitiveServicesCredentials(AZURE_KEY))
    except Exception as e:
        print(f"Failed to initialize Azure Client: {e}")

def detect_waterlogging_azure(image_data):
    if not computervision_client:
        return {"error": "Azure credentials not configured. Please set AZURE_CV_KEY and AZURE_CV_ENDPOINT."}

    try:
        # Azure expects a stream
        image_stream = io.BytesIO(image_data)
        
        # Analyze Image Features
        features = [VisualFeatureTypes.tags, VisualFeatureTypes.description, VisualFeatureTypes.color]
        results = computervision_client.analyze_image_in_stream(image_stream, visual_features=features)

        # Logic to determine waterlogging from tags/captions
        # Added broader keywords to catch more contexts
        water_tags = ["water", "flood", "rain", "puddle", "reflection", "river", "lake", "wet", "storm", "drain", "sewer", "canal", "road", "street", "outdoor"]
        # Lowered confidence threshold to 0.4 to be more sensitive
        found_tags = [tag.name for tag in results.tags if tag.name in water_tags and tag.confidence > 0.4]
        
        # Check description/captions
        description = results.description.captions[0].text if results.description.captions else ""
        is_waterlogged = False
        confidence = 0.0

        if found_tags or any(w in description for w in water_tags):
            is_waterlogged = True
            
            # Weighted Confidence Calculation
            base_confidence = results.description.captions[0].confidence * 100
            
            # Boosters
            tag_boost = len(found_tags) * 15  
            keyword_boost = 0
            
            # High impact keywords
            if "flood" in description or "flood" in found_tags:
                keyword_boost += 30
            if "puddle" in description or "puddle" in found_tags:
                keyword_boost += 20
            if "street" in description and "water" in description:
                 keyword_boost += 25
            
            confidence = min(98.5, base_confidence + tag_boost + keyword_boost)
            
            # Ensure minimum confidence if "flood" is explicitly detected
            if "flood" in description or "flood" in found_tags:
                 confidence = max(confidence, 85.0)
        
        # Determine Severity based on specific keywords
        severity = "Low"
        estimated_depth = "0 ft"
        
        if is_waterlogged:
            if "flood" in found_tags or "flood" in description:
                severity = "High"
                estimated_depth = "2.5 ft" # Heuristic
            elif "puddle" in found_tags:
                severity = "Low"
                estimated_depth = "0.5 ft"
            else:
                severity = "Moderate"
                estimated_depth = "1.2 ft"
                
        # Forensic Check
        image = Image.open(image_stream)
        forensics = ForensicAnalyzer.check_metadata(image)
        is_spam_duplicate = ForensicAnalyzer.check_duplicate(image)

        return {
            "waterlogged": is_waterlogged,
            "confidence": round(confidence, 2),
            "severity": severity,
            "estimated_depth": estimated_depth,
            "details": {
                "tags": found_tags,
                "caption": description
            },
            "forensics": {
                "source": forensics["inference"],
                "camera": forensics["camera_model"],
                "is_duplicate": is_spam_duplicate
            }
        }

    except Exception as e:
        print(f"Azure API Error: {e}")
        # Fallback to local OpenCV if Azure fails
        return None

import imagehash
from PIL.ExifTags import TAGS

# In-memory cache for duplicate detection (resets on restart)
seen_hashes = set()

class ForensicAnalyzer:
    @staticmethod
    def check_metadata(image):
        """Checks for EXIF data presence as a proxy for original camera file."""
        exif_data = image.getexif()
        has_exif = False
        camera_model = "Unknown"
        
        if exif_data:
            has_exif = True
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == 'Model':
                    camera_model = str(value)
        
        # Inference: No EXIF usually means stripped metadata (Web, WhatsApp, Screenshots)
        source_inference = "Original Camera" if has_exif else "Likely Web/Digital Source"

        return {
            "has_exif": has_exif,
            "camera_model": camera_model,
            "inference": source_inference
        }

    @staticmethod
    def check_duplicate(image):
        """Checks if image has been uploaded recently using perceptual hashing."""
        phash = imagehash.phash(image)
        if phash in seen_hashes:
            return True
        seen_hashes.add(phash)
        return False

    @staticmethod
    def check_web_existence(image_path_or_bytes):
        """Checks if image exists on the web using SerpApi (Reverse Image Search)."""
        serp_key = os.getenv("SERPAPI_KEY")
        if not serp_key:
            return {"found_online": False, "source": "Check Skipped (No Key)"}
        return {"found_online": False, "source": "Requires Public URL for Search"}

    @staticmethod
    def check_bing_web_search(image_stream):
        """
        Uses Azure Bing Visual Search to check if image exists online.
        Requires BING_SEARCH_V7_KEY in .env
        """
        bing_key = os.getenv("BING_SEARCH_V7_KEY")
        if not bing_key:
             return {"found_online": False, "source": "Azure Bing Key Missing"}
        return {"found_online": False, "source": "Azure Bing Visual Search Ready (Key Needed)"}

    @staticmethod
    def check_google_vision_web_detection(image_bytes):
        """
        Uses Google Cloud Vision API (Web Detection) to find image online.
        Requires GOOGLE_VISION_KEY in .env
        """
        google_key = os.getenv("GOOGLE_VISION_KEY")
        if not google_key:
             return {"found_online": False, "source": "Google Vision Key Missing"}
        
        # Real Implementation of Google Vision REST API
        try:
            url = f"https://vision.googleapis.com/v1/images:annotate?key={google_key}"
            # Encode image to base64
            import base64
            import requests # Lazy import
            
            b64_image = base64.b64encode(image_bytes).decode('utf-8')
            payload = {
                "requests": [
                    {
                        "image": {"content": b64_image},
                        "features": [{"type": "WEB_DETECTION", "maxResults": 5}]
                    }
                ]
            }
            
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                web_detection = data.get("responses", [{}])[0].get("webDetection", {})
                
                # Check for "fullMatchingImages" or "partialMatchingImages"
                full_matches = web_detection.get("fullMatchingImages", [])
                partial_matches = web_detection.get("partialMatchingImages", [])
                
                if full_matches or partial_matches:
                    match_url = (full_matches + partial_matches)[0].get("url", "Unknown")
                    return {"found_online": True, "source": f"Found on Web: {match_url[:30]}..."}
                else:
                    return {"found_online": False, "source": "No Direct Matches Found on Google"}
            else:
                 return {"found_online": False, "source": f"Google API Error: {response.status_code}"}
        except Exception as e:
            print(f"Google Vision Error: {e}")
            return {"found_online": False, "source": "Google Vision Request Failed"}

# Models tried in order; first one the HF inference API actually serves wins.
HF_MODELS = [
    "google/siglip2-so400m-patch14-384",
    "google/siglip-so400m-patch14-384",
    "google/siglip-base-patch16-224",
    "openai/clip-vit-base-patch32",
]

# Contrastive prompts. Positive prompts describe waterlogging; the negatives give
# CLIP/SigLIP something specific to peel probability mass away to (wet-but-fine,
# water bodies, indoors) so we don't over-trigger.
HF_POSITIVE_LABELS = [
    "a flooded waterlogged street with standing water",
    "a road covered in deep water",
]
HF_NEGATIVE_LABELS = [
    "a dry street",
    "a normal road with no water",
    "a river, lake or ocean",
    "an indoor scene",
]

def detect_waterlogging_hf(image_bytes):
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        print("HF token not set (HF_TOKEN) — falling back to local OpenCV")
        return None

    # InferenceClient handles the current HF router URL + payload format for
    # zero-shot image classification. Passing raw bytes; no manual base64/JSON.
    from huggingface_hub import InferenceClient
    # provider must be pinned: the default "auto" asks HF's provider-mapping API,
    # which returns empty for these models (no third-party provider serves them)
    # and crashes with StopIteration before any HTTP request is made.
    client = InferenceClient(token=hf_token, timeout=15, provider="hf-inference")
    candidate_labels = HF_POSITIVE_LABELS + HF_NEGATIVE_LABELS
    positive_set = set(HF_POSITIVE_LABELS)

    results = None
    used_model = None
    for model in HF_MODELS:
        try:
            results = client.zero_shot_image_classification(
                image_bytes, candidate_labels=candidate_labels, model=model,
            )
            if results:
                used_model = model
                break
            print(f"HF model {model} returned no predictions — trying next")
        except Exception as e:
            # Usually a 404 (model not served) or timeout; try the next model.
            status = getattr(getattr(e, "response", None), "status_code", None)
            print(f"HF model {model} failed [{type(e).__name__} status={status}]: {repr(e)} — trying next")

    if not results:
        print("All HF models failed — falling back to local OpenCV")
        return None

    # Scores across all labels sum to ~1; the probability mass on the positive
    # prompts is our waterlogging confidence.
    positive_mass = sum(r.score for r in results if r.label in positive_set)
    confidence = positive_mass * 100
    is_waterlogged = positive_mass > 0.5

    return {
        "waterlogged": is_waterlogged,
        "confidence": round(confidence, 2),
        "severity": "High" if confidence > 80 else "Moderate" if confidence > 50 else "Low",
        "estimated_depth": "Unknown",
        "method": "huggingface_clip",
        "details": {"model": used_model},
    }

# --- Local zero-shot model (SigLIP via transformers) ---
# HF's serverless API no longer serves any zero-shot-image-classification model
# ("Model not supported by provider hf-inference"), so we run SigLIP locally.
# Lazy singleton: first request downloads ~800MB then loads once per process.
_ZS_MODEL = "google/siglip-base-patch16-224"
_zs_pipeline = None

def _get_zero_shot_pipeline():
    global _zs_pipeline
    if _zs_pipeline is None:
        from transformers import pipeline
        print(f"Loading local zero-shot model {_ZS_MODEL} (first run downloads it)...")
        _zs_pipeline = pipeline("zero-shot-image-classification", model=_ZS_MODEL)
        print("Local zero-shot model ready")
    return _zs_pipeline

def detect_waterlogging_siglip(image):
    try:
        pipe = _get_zero_shot_pipeline()
    except Exception as e:
        print(f"Local SigLIP unavailable ({type(e).__name__}: {e}) — falling back to OpenCV")
        return None

    try:
        results = pipe(image, candidate_labels=HF_POSITIVE_LABELS + HF_NEGATIVE_LABELS)
    except Exception as e:
        print(f"Local SigLIP inference failed ({type(e).__name__}: {e}) — falling back to OpenCV")
        return None

    # SigLIP scores are independent sigmoids (they don't sum to 1), so normalize:
    # confidence = positive mass / total mass. Works for softmax models too.
    positive_set = set(HF_POSITIVE_LABELS)
    pos = sum(r["score"] for r in results if r["label"] in positive_set)
    total = sum(r["score"] for r in results)
    ratio = pos / total if total > 0 else 0.0
    confidence = ratio * 100
    is_waterlogged = ratio > 0.5

    return {
        "waterlogged": is_waterlogged,
        "confidence": round(confidence, 2),
        "severity": "High" if confidence > 80 else "Moderate" if confidence > 50 else "Low",
        "estimated_depth": "Unknown",
        "method": "local_siglip",
        "details": {"model": _ZS_MODEL},
    }

def detect_waterlogging_local(image, is_duplicate=None):
    # Forensic Check
    forensics = ForensicAnalyzer.check_metadata(image)
    # Reuse duplicate result if the caller already ran the check this request.
    # Re-running check_duplicate on the same image marks it as its own duplicate.
    is_spam_duplicate = is_duplicate if is_duplicate is not None else ForensicAnalyzer.check_duplicate(image)
    
    # Check Bing (Simulated call)
    # bing_check = ForensicAnalyzer.check_bing_web_search(image)
    
    # Check Google Vision (Real call if key exists)
    import io
    buf = io.BytesIO()
    image.save(buf, format="JPEG") # Ensure we have bytes
    img_bytes = buf.getvalue()
    
    google_check = ForensicAnalyzer.check_google_vision_web_detection(img_bytes)
    
    # Update inference if Google found it
    if google_check["found_online"]:
        forensics["inference"] = "Confirmed Web Cloud Source"
        forensics["camera_model"] = "Online Image Match"

    # Convert PIL to OpenCV format (BGR)
    img_array = np.array(image)
    if len(img_array.shape) == 2:  # Grayscale
        img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2BGR)
    elif img_array.shape[2] == 4:  # RGBA
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
    else:
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

    hsv = cv2.cvtColor(img_array, cv2.COLOR_BGR2HSV)
    
    # 1. Muddy/Brown Water Range (Hue 10-30 approx for brown)
    lower_muddy = np.array([0, 40, 40])
    upper_muddy = np.array([35, 255, 255])
    mask_muddy = cv2.inRange(hsv, lower_muddy, upper_muddy)
    
    # 2. Reflection/Clear Water Range (Blueish/Greyish - usually low Saturation)
    lower_grey = np.array([0, 0, 50]) # Low saturation grey
    upper_grey = np.array([180, 50, 200])
    mask_grey = cv2.inRange(hsv, lower_grey, upper_grey)

    # Combine masks to catch both types
    mask = cv2.bitwise_or(mask_muddy, mask_grey)
    
    h, w = mask.shape
    bottom_half = mask[int(h*0.5):, :]
    logging_pixels = cv2.countNonZero(bottom_half)
    total_bottom_pixels = bottom_half.shape[0] * bottom_half.shape[1]
    
    percentage = (logging_pixels / total_bottom_pixels) * 100
    
    # Lowered threshold from 25% to 10% to catch smaller puddles
    is_waterlogged = percentage > 10.0
    
    severity = "Low"
    if percentage > 60: severity = "High"
    elif percentage > 40: severity = "Moderate"
        
    return {
        "waterlogged": bool(is_waterlogged),
        "confidence": round(percentage, 2),
        "severity": severity,
        "estimated_depth": f"{round(percentage / 20, 1)} ft" if is_waterlogged else "0 ft",
        "method": "local_opencv",
        "forensics": {
            "source": forensics["inference"],
            "camera": forensics["camera_model"],
            "is_duplicate": is_spam_duplicate
        }
    }

from fastapi.staticfiles import StaticFiles
import shutil
import uuid

# Mount static directory for images
os.makedirs("backend/static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="backend/static"), name="static")

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    
    # Save Image Locally so we can view it later
    file_ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = f"backend/static/uploads/{filename}"
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # URL for frontend to access
    image_url = f"http://localhost:8000/static/uploads/{filename}"

    image = Image.open(io.BytesIO(contents))
    forensics = ForensicAnalyzer.check_metadata(image)
    is_spam_duplicate = ForensicAnalyzer.check_duplicate(image)

    # Local SigLIP zero-shot (HF serverless API no longer serves these models)
    hf_result = detect_waterlogging_siglip(image)

    if hf_result:
        hf_result["image_url"] = image_url
        hf_result["forensics"] = {
            "source": forensics.get("inference", "Unknown"),
            "camera": forensics.get("camera_model", "Unknown"),
            "is_duplicate": is_spam_duplicate
        }
        return hf_result

    # Fallback to Local — pass the duplicate flag already computed above
    # so the same image isn't flagged as a duplicate of itself.
    local_result = detect_waterlogging_local(image, is_duplicate=is_spam_duplicate)
    local_result["image_url"] = image_url
    return local_result

# ... existing code ...

from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

# --- Data Models ---

class ReportSubmission(BaseModel):
    location: str
    lat: float
    lng: float
    image_url: str # In a real app, we'd store the image file
    analysis_result: dict
    user_id: str = "user_123" # Mock user

class Report(BaseModel):
    id: str
    timestamp: datetime
    location: str
    coordinates: dict
    image_url: str
    ai_analysis: dict
    
    # Status flags
    is_spam: bool
    admin_status: str = "pending" # pending, approved, rejected
    
    # Community
    upvotes: int = 0 # "Agree"
    downvotes: int = 0 # "Disagree"
    reporter_id: str

# --- In-Memory Database ---
reports_db: List[Report] = []

# --- Endpoints ---

class Reaction(BaseModel):
    type: str # "agree" or "disagree"

@app.get("/reports")
def get_reports(status: str = None, all: bool = False):
    """Fetches reports. Optionally filter by status. Use all=true for admin view."""
    if all:
        return reports_db
    if status:
        return [r for r in reports_db if r.admin_status == status]
    
    # By default, exclude "auto_rejected" so they don't clutter public feeds
    return [r for r in reports_db if r.admin_status != "auto_rejected"]

@app.post("/submit")
def submit_report(submission: ReportSubmission):
    """Saves a new report after AI analysis."""
    analysis = submission.analysis_result
    forensics = analysis.get("forensics", {})

    # Low-confidence gate: below 40% we don't trust the "waterlogged" label.
    # Override it so the report is not shown/treated as waterlogged.
    CONFIDENCE_THRESHOLD = 40.0
    if analysis.get("confidence", 0) < CONFIDENCE_THRESHOLD:
        analysis["waterlogged"] = False

    # Auto-flag spam
    is_spam = False
    admin_status = "pending"
    is_waterlogged = analysis.get("waterlogged", False)

    # 1. Duplicate Check
    if forensics.get("is_duplicate"):
        is_spam = True
        
    # 2. Web Check
    if analysis.get("found_online"):
        is_spam = True

    # Only auto-reject if the image is NOT waterlogged.
    # Waterlogged images always go to admin for review, even if flagged as spam/duplicate.
    if not is_waterlogged:
        admin_status = "auto_rejected"
    
    new_report = Report(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        location=submission.location,
        coordinates={"lat": submission.lat, "lng": submission.lng},
        image_url=submission.image_url, 
        ai_analysis=analysis,
        is_spam=is_spam,
        admin_status=admin_status,
        reporter_id=submission.user_id
    )
    
    reports_db.append(new_report)
    return {"status": "success", "report_id": new_report.id, "is_spam": is_spam}

@app.put("/reports/{report_id}/status")
def update_status(report_id: str, status: str): # status: approved, rejected
    for report in reports_db:
        if report.id == report_id:
            report.admin_status = status
            return {"status": "updated", "new_status": status}
    raise HTTPException(status_code=404, detail="Report not found")

@app.post("/reports/{report_id}/react")
def react_to_report(report_id: str, reaction: Reaction):
    for report in reports_db:
        if report.id == report_id:
            if reaction.type == "agree":
                report.upvotes += 1
            elif reaction.type == "disagree":
                report.downvotes += 1
            return {"status": "reaction_added", "upvotes": report.upvotes, "downvotes": report.downvotes}
    raise HTTPException(status_code=404, detail="Report not found")

# --- RF Waterlogging Predictor ---

_RF_PKL = os.path.join(os.path.dirname(__file__), "models", "rf_waterlogging.pkl")
_WARD_CSV = os.path.join(os.path.dirname(__file__), "data", "ward_features.csv")
_BASIN_JSON = os.path.join(os.path.dirname(__file__), "models", "ward_basin_map.json")

_RF_FEATURES = [
    "ISP", "road_density", "population_density", "NDVI",
    "runoff_coeff", "capacity_cusecs", "area_acres", "elevation_factor"
]

try:
    _rf_bundle = joblib.load(_RF_PKL)
    _rf_model = _rf_bundle["model"]
    _ward_df = pd.read_csv(_WARD_CSV)
    _ward_df[_RF_FEATURES] = _ward_df[_RF_FEATURES].fillna(_ward_df[_RF_FEATURES].median())
    with open(_BASIN_JSON) as _f:
        _ward_basin_map = json.load(_f)
    _rf_ready = True
except Exception as _e:
    print(f"[WARN] RF model not loaded: {_e}")
    _rf_ready = False


class RFPredictionInput(BaseModel):
    temperature: float = 30
    humidity: float = 70
    pressure: float = 1010
    cloud_cover: float = 60
    rainfall_mm: float = 0
    basin_rainfall: dict = {}


@app.post("/predict")
def predict_waterlogging(data: RFPredictionInput):
    if not _rf_ready:
        raise HTTPException(status_code=503, detail="RF model not available. Run backend/train_rf.py first.")

    ward_risks = {}
    ward_scores = {}

    ward_features = _ward_df[_RF_FEATURES].values
    base_risks = _rf_model.predict(ward_features)

    for i, row in _ward_df.iterrows():
        ward = str(row["ward_name"])
        basin = _ward_basin_map.get(ward, "Najafgarh")
        rain = data.basin_rainfall.get(basin, data.rainfall_mm)

        # Non-linear rainfall scaling: 50mm ≈ baseline, 150mm ≈ 2.4x
        rain_factor = (rain / 50.0) ** 0.65 if rain > 0 else 0.0
        risk = min(100.0, float(base_risks[i]) * rain_factor)

        score = round(risk)
        status = "High" if risk > 65 else "Medium" if risk > 35 else "Low"
        ward_risks[ward] = status
        ward_scores[ward] = score

    global_rain = data.rainfall_mm or (max(data.basin_rainfall.values()) if data.basin_rainfall else 0)

    return {
        "rainfall_mm": global_rain,
        "basin_rainfall": data.basin_rainfall,
        "ward_risks": ward_risks,
        "ward_scores": ward_scores,
        "source": "rf_model",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
