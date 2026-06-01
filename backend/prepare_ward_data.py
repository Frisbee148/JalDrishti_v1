"""
Merge all available data sources into a 290-row ward feature table.
Generates synthetic waterlogging base_risk labels calibrated against
14 known chronic hotspot wards.

Run from project root: python3 backend/prepare_ward_data.py
"""
import json
import os
import numpy as np
import pandas as pd

GEOJSON = "public/data/delhi-wards.geojson"
HOTSPOTS = "public/data/hotspots.json"
DEMO_LOC = "reference copy/backend_services/data/demo_locations.csv"
WARD_POP = "reference copy/backend_services/data/SEC_WW_POP_2022.csv"
WARD_DRAIN = "public/data/delhi-wards-data.csv"
OUT_CSV = "backend/data/ward_features.csv"
OUT_BASIN = "backend/models/ward_basin_map.json"

ELEVATION_DEFAULTS = {
    "Low-lying":       {"runoff_coeff": 0.88, "capacity_cusecs": 350, "elevation_factor": 1.0},
    "Topographic Sink":{"runoff_coeff": 0.92, "capacity_cusecs": 210, "elevation_factor": 1.0},
    "High-Density":    {"runoff_coeff": 0.92, "capacity_cusecs": 380, "elevation_factor": 0.8},
    "Moderate":        {"runoff_coeff": 0.80, "capacity_cusecs": 400, "elevation_factor": 0.7},
    "Residential":     {"runoff_coeff": 0.75, "capacity_cusecs": 420, "elevation_factor": 0.6},
    "Sub-basin":       {"runoff_coeff": 0.70, "capacity_cusecs": 600, "elevation_factor": 0.6},
    "Modern-Planned":  {"runoff_coeff": 0.65, "capacity_cusecs": 950, "elevation_factor": 0.4},
    "High-Vegetation": {"runoff_coeff": 0.55, "capacity_cusecs": 350, "elevation_factor": 0.3},
}

# Heuristics for basin inference from ward name substrings
BASIN_KEYWORDS = {
    "Najafgarh": [
        "ROHINI", "DWARKA", "CIVIL LINES", "MODEL TOWN", "KAROL BAGH",
        "PITAMPURA", "SHALIMAR", "PASCHIM", "PATEL NAGAR", "RAJOURI",
        "KIRTI NAGAR", "RAMESH NAGAR", "MOTI NAGAR", "JANAK", "UTTAM NAGAR",
        "VIKASPURI", "JANAKPURI", "NIHAL", "SULTANPURI", "MUNDKA",
        "KIRARI", "BAWANA", "NARELA", "ALIPUR", "BANKNER", "HOLAMBI",
        "KESHOPUR", "KAPASHERA", "NAJAFGARH",
    ],
    "Barapullah": [
        "JANGPURA", "LAJPAT", "MINTO", "SAROJINI", "LODHI", "NIZAMUDDIN",
        "OKHLA", "BADARPUR", "SANGAM VIHAR", "AMBEDKAR NAGAR", "TIGRI",
        "DEOLI", "TUGHLAKABAD", "GOVINDPURI", "KALKAJI", "GREATER KAILASH",
        "MALVIYA", "SAKET", "MEHRAULI", "CHATTARPUR", "VASANT",
        "MUNIRKA", "RK PURAM", "SAFDARJUNG", "SOUTH", "EAST OF KAILASH",
        "HAUZ KHAS", "GREEN PARK",
    ],
    "Shahdara-Yamuna": [
        "SEELAMPUR", "SHAHDARA", "MUSTAFABAD", "GOKULPURI", "MAUJPUR",
        "JAFRABAD", "GHONDA", "BHAJANPURA", "YAMUNA VIHAR", "KARAVEL",
        "LONI", "SEEMAPURI", "NAND NAGRI", "BRAHMPURI", "GAMRI",
        "SHASTRI PARK", "SEELAMPUR", "DARYAGANJ", "CHANDNI CHOWK",
        "KASHMERE GATE", "MORI GATE", "SADAR BAZAR",
    ],
}

np.random.seed(42)


def norm(series):
    mn, mx = series.min(), series.max()
    if mx == mn:
        return pd.Series(0.5, index=series.index)
    return (series - mn) / (mx - mn)


def infer_basin(ward_name: str) -> str:
    w = ward_name.upper()
    for basin, keywords in BASIN_KEYWORDS.items():
        for kw in keywords:
            if kw in w:
                return basin
    return "Najafgarh"  # default (largest basin in Delhi)


def main():
    # Load GeoJSON wards
    with open(GEOJSON) as f:
        geojson = json.load(f)
    wards = [
        {"ward_name": feat["properties"]["Ward_Name"].upper().strip(),
         "ward_no": feat["properties"]["Ward_No"]}
        for feat in geojson["features"]
        if feat["properties"].get("Ward_Name")
    ]
    df = pd.DataFrame(wards).drop_duplicates("ward_name").reset_index(drop=True)
    print(f"GeoJSON wards: {len(df)}")

    # Known hotspot ward names (for calibration)
    with open(HOTSPOTS) as f:
        hotspot_data = json.load(f)
    hotspot_names = set()
    for feat in hotspot_data["features"]:
        name = feat["properties"].get("name", "").upper()
        # Extract ward name component (before parenthesis)
        ward_part = name.split("(")[0].strip()
        hotspot_names.add(ward_part)
    print(f"Known hotspot names: {hotspot_names}")

    # Population data
    pop_df = pd.read_csv(WARD_POP)
    pop_df["ward_name"] = pop_df["ward"].str.upper().str.strip()
    pop_map = dict(zip(pop_df["ward_name"], pop_df["total_population"]))

    # Demo locations (ISP, road_density, NDVI, population_density)
    demo_df = pd.read_csv(DEMO_LOC)
    demo_df["ward_name"] = demo_df["ward_name"].str.upper().str.strip()
    demo_agg = demo_df.groupby("ward_name").agg({
        "isp": "mean", "road_density": "mean",
        "population_density": "mean", "ndvi": "mean"
    }).reset_index()
    demo_map = {row["ward_name"]: row for _, row in demo_agg.iterrows()}

    # Drainage data
    drain_df = pd.read_csv(WARD_DRAIN)
    drain_df.columns = [c.strip() for c in drain_df.columns]
    # Fix multiline parsing artifact — re-read with proper handling
    drain_df = pd.read_csv(WARD_DRAIN, skipinitialspace=True)
    drain_df.columns = [c.strip() for c in drain_df.columns]
    drain_df["ward_name"] = drain_df["ward_name"].str.upper().str.strip()
    # Remove rows with NaN ward_name (artefacts from multiline csv)
    drain_df = drain_df.dropna(subset=["ward_name"])
    drain_map = {row["ward_name"]: row for _, row in drain_df.iterrows()}

    # Compute elevation_type group averages from demo data
    elev_isp_avg = {}
    elev_road_avg = {}
    elev_ndvi_avg = {}
    elev_pop_avg = {}
    for elev_type in ELEVATION_DEFAULTS:
        # Use all demo locations, assign elevation heuristically by ISP
        # High ISP (>80) ↔ High-Density/Topographic Sink; low ISP (<50) ↔ High-Vegetation
        if elev_type in ("High-Density", "Topographic Sink", "Low-lying"):
            subset = demo_df[demo_df["isp"] >= 75]
        elif elev_type in ("Moderate", "Residential", "Sub-basin"):
            subset = demo_df[(demo_df["isp"] >= 55) & (demo_df["isp"] < 75)]
        else:
            subset = demo_df[demo_df["isp"] < 55]
        if len(subset) == 0:
            subset = demo_df
        elev_isp_avg[elev_type] = subset["isp"].mean()
        elev_road_avg[elev_type] = subset["road_density"].mean()
        elev_ndvi_avg[elev_type] = subset["ndvi"].mean()
        elev_pop_avg[elev_type] = subset["population_density"].mean()

    rows = []
    ward_basin_map = {}

    for _, ward_row in df.iterrows():
        wname = ward_row["ward_name"]

        # Basin assignment
        if wname in drain_map and not pd.isna(drain_map[wname].get("basin_name", None)):
            basin_raw = str(drain_map[wname]["basin_name"]).strip()
            # Normalize basin names
            if "barapullah" in basin_raw.lower():
                basin = "Barapullah"
            elif "shahdara" in basin_raw.lower() or "yamuna" in basin_raw.lower():
                basin = "Shahdara-Yamuna"
            else:
                basin = "Najafgarh"
        else:
            basin = infer_basin(wname)
        ward_basin_map[wname] = basin

        # Drainage features
        if wname in drain_map:
            dr = drain_map[wname]
            try:
                runoff_coeff = float(dr["runoff_coeff"])
                capacity_cusecs = float(dr["existing_capacity_cusecs"])
                area_acres = float(dr["area_acres"])
                elev_type = str(dr["elevation_type"]).strip()
            except (ValueError, KeyError):
                elev_type = "Moderate"
                runoff_coeff = ELEVATION_DEFAULTS[elev_type]["runoff_coeff"]
                capacity_cusecs = ELEVATION_DEFAULTS[elev_type]["capacity_cusecs"]
                area_acres = 500.0
        else:
            # Assign elevation_type from basin + ward name heuristics
            wupper = wname.upper()
            if any(k in wupper for k in ["SINK", "MINTO", "BRIDGE", "UNDERPASS"]):
                elev_type = "Topographic Sink"
            elif any(k in wupper for k in ["ROHINI", "DWARKA", "VASANT", "JANAKPURI"]):
                elev_type = "Modern-Planned"
            elif any(k in wupper for k in ["SANJAY", "RIDGE", "FOREST", "GARDEN", "PARK"]):
                elev_type = "High-Vegetation"
            elif basin == "Barapullah":
                elev_type = "Low-lying"
            elif basin == "Shahdara-Yamuna":
                elev_type = "Low-lying"
            else:
                elev_type = "Moderate"
            defaults = ELEVATION_DEFAULTS[elev_type]
            runoff_coeff = defaults["runoff_coeff"]
            capacity_cusecs = defaults["capacity_cusecs"]
            area_acres = 500.0

        elev_defaults = ELEVATION_DEFAULTS.get(elev_type, ELEVATION_DEFAULTS["Moderate"])
        elevation_factor = elev_defaults["elevation_factor"]

        # ISP / road_density / NDVI / population_density
        if wname in demo_map:
            dm = demo_map[wname]
            isp = float(dm["isp"])
            road_density = float(dm["road_density"])
            ndvi = float(dm["ndvi"])
            pop_density = float(dm["population_density"])
        else:
            isp = elev_isp_avg.get(elev_type, 70.0) + np.random.normal(0, 5)
            road_density = elev_road_avg.get(elev_type, 12.0) + np.random.normal(0, 1)
            ndvi = elev_ndvi_avg.get(elev_type, 0.2) + np.random.normal(0, 0.03)
            pop_density = elev_pop_avg.get(elev_type, 20000) + np.random.normal(0, 3000)

        isp = np.clip(isp, 10, 100)
        road_density = np.clip(road_density, 2, 25)
        ndvi = np.clip(ndvi, 0, 1)
        pop_density = max(1000, pop_density)

        # Population
        population = pop_map.get(wname, None)
        if population is None:
            population = pop_density * 1.5 + np.random.normal(0, 5000)
        population = max(5000, float(population))

        rows.append({
            "ward_name": wname,
            "basin": basin,
            "elevation_type": elev_type,
            "elevation_factor": elevation_factor,
            "ISP": isp,
            "road_density": road_density,
            "NDVI": ndvi,
            "population_density": pop_density,
            "total_population": population,
            "runoff_coeff": runoff_coeff,
            "capacity_cusecs": capacity_cusecs,
            "area_acres": area_acres,
        })

    feat_df = pd.DataFrame(rows)

    # Compute base_risk using physics-weighted formula
    isp_n = norm(feat_df["ISP"])
    runoff_n = norm(feat_df["runoff_coeff"])
    ndvi_n = norm(feat_df["NDVI"])
    pop_n = norm(feat_df["population_density"])
    cap_n = norm(feat_df["capacity_cusecs"])

    feat_df["base_risk"] = (
        0.30 * isp_n
        + 0.25 * runoff_n
        + 0.20 * feat_df["elevation_factor"]
        + 0.15 * (1 - ndvi_n)
        + 0.10 * pop_n
        - 0.15 * cap_n
    ) * 100

    feat_df["base_risk"] = feat_df["base_risk"].clip(5, 95)

    # Calibrate known hotspot wards to base_risk >= 70
    for hotspot_fragment in hotspot_names:
        if not hotspot_fragment:
            continue
        mask = feat_df["ward_name"].str.contains(hotspot_fragment, regex=False, na=False)
        if mask.any():
            current = feat_df.loc[mask, "base_risk"]
            feat_df.loc[mask, "base_risk"] = current.apply(lambda x: max(x, 72.0))

    # Add realism noise
    feat_df["base_risk"] = (feat_df["base_risk"] + np.random.normal(0, 4, len(feat_df))).clip(5, 95)

    feat_df.to_csv(OUT_CSV, index=False)
    print(f"\nSaved {len(feat_df)} wards to {OUT_CSV}")
    print(f"base_risk: min={feat_df['base_risk'].min():.1f}  max={feat_df['base_risk'].max():.1f}  mean={feat_df['base_risk'].mean():.1f}")
    print(f"\nHigh-risk wards (>65):")
    high = feat_df[feat_df["base_risk"] > 65][["ward_name", "basin", "elevation_type", "base_risk"]].sort_values("base_risk", ascending=False)
    print(high.to_string(index=False))

    os.makedirs("backend/models", exist_ok=True)
    with open(OUT_BASIN, "w") as f:
        json.dump(ward_basin_map, f, indent=2)
    print(f"\nSaved basin map to {OUT_BASIN}")


if __name__ == "__main__":
    main()
