"""
Shared pytest fixtures for JalDrishti RF model tests.
"""
import os
import json

import joblib
import pandas as pd
import pytest

# ── Paths (relative to this file, which lives in backend/) ────────────────────
_BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(_BASE_DIR, "models", "rf_waterlogging.pkl")
WARD_CSV_PATH = os.path.join(_BASE_DIR, "data", "ward_features.csv")
BASIN_JSON_PATH = os.path.join(_BASE_DIR, "models", "ward_basin_map.json")

EXPECTED_FEATURES = [
    "ISP", "road_density", "population_density", "NDVI",
    "runoff_coeff", "capacity_cusecs", "area_acres", "elevation_factor",
]

EXPECTED_BASINS = {"Najafgarh", "Barapullah", "Shahdara-Yamuna"}


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def rf_bundle():
    """Load the pickled RF bundle once for the entire test session."""
    return joblib.load(MODEL_PATH)


@pytest.fixture(scope="session")
def rf_model(rf_bundle):
    """Extract the trained RandomForestRegressor from the bundle."""
    return rf_bundle["model"]


@pytest.fixture(scope="session")
def rf_features(rf_bundle):
    """Extract the feature-name list from the bundle."""
    return rf_bundle["features"]


@pytest.fixture(scope="session")
def ward_df():
    """Load and median-fill the ward feature CSV (mirrors main.py startup)."""
    df = pd.read_csv(WARD_CSV_PATH)
    df[EXPECTED_FEATURES] = df[EXPECTED_FEATURES].fillna(
        df[EXPECTED_FEATURES].median()
    )
    return df


@pytest.fixture(scope="session")
def basin_map():
    """Load the ward → basin JSON mapping."""
    with open(BASIN_JSON_PATH) as f:
        return json.load(f)
