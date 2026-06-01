"""
Comprehensive test suite for the JalDrishti RF waterlogging prediction model.

Tests cover:
  A. Model Loading — file existence, deserialization, structure
  B. Data Integrity — CSV shape, columns, ranges, NaN handling
  C. Prediction Sanity — output shape/range, determinism, edge cases
  D. Integration — full pipeline smoke test matching /predict endpoint

Run from project root:
    python3 -m pytest backend/test_model.py -v
"""

import json
import os

import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import RandomForestRegressor

# ---------------------------------------------------------------------------
# Paths (relative to this file, which lives in backend/)
# ---------------------------------------------------------------------------
_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PKL = os.path.join(_DIR, "models", "rf_waterlogging.pkl")
WARD_CSV = os.path.join(_DIR, "data", "ward_features.csv")
BASIN_JSON = os.path.join(_DIR, "models", "ward_basin_map.json")

EXPECTED_FEATURES = [
    "ISP", "road_density", "population_density", "NDVI",
    "runoff_coeff", "capacity_cusecs", "area_acres", "elevation_factor",
]
EXPECTED_BASINS = {"Najafgarh", "Barapullah", "Shahdara-Yamuna"}


# ============================  FIXTURES  ============================

@pytest.fixture(scope="module")
def model_bundle():
    """Load the pickled model bundle once for all tests in this module."""
    return joblib.load(MODEL_PKL)


@pytest.fixture(scope="module")
def rf_model(model_bundle):
    return model_bundle["model"]


@pytest.fixture(scope="module")
def ward_df():
    """Load and clean ward features exactly like main.py does."""
    df = pd.read_csv(WARD_CSV)
    df[EXPECTED_FEATURES] = df[EXPECTED_FEATURES].fillna(df[EXPECTED_FEATURES].median())
    return df


@pytest.fixture(scope="module")
def basin_map():
    with open(BASIN_JSON) as f:
        return json.load(f)


# ==================  A. MODEL LOADING TESTS  ========================

class TestModelLoading:
    """Verify the pickled model file can be loaded and has the correct structure."""

    def test_model_file_exists(self):
        """rf_waterlogging.pkl must exist on disk."""
        assert os.path.isfile(MODEL_PKL), (
            f"Model file not found at {MODEL_PKL}. Run 'python3 backend/train_rf.py' first."
        )

    def test_model_loads_successfully(self, model_bundle):
        """joblib.load should return a non-None object without errors."""
        assert model_bundle is not None, "joblib.load returned None"

    def test_model_has_correct_keys(self, model_bundle):
        """Bundle must contain 'model' and 'features' keys."""
        assert "model" in model_bundle, "Missing 'model' key in pickle bundle"
        assert "features" in model_bundle, "Missing 'features' key in pickle bundle"

    def test_model_has_correct_features(self, model_bundle):
        """Features list must match the 8 expected spatial features."""
        assert model_bundle["features"] == EXPECTED_FEATURES, (
            f"Feature mismatch.\n  Expected: {EXPECTED_FEATURES}\n  Got: {model_bundle['features']}"
        )

    def test_model_is_random_forest(self, rf_model):
        """Model must be a RandomForestRegressor instance."""
        assert isinstance(rf_model, RandomForestRegressor), (
            f"Expected RandomForestRegressor, got {type(rf_model).__name__}"
        )

    def test_model_has_estimators(self, rf_model):
        """Model must have at least 1 fitted tree estimator."""
        assert hasattr(rf_model, "estimators_"), "Model appears unfitted (no estimators_)"
        assert len(rf_model.estimators_) > 0, "Model has 0 estimators"
        assert len(rf_model.estimators_) >= 50, (
            f"Only {len(rf_model.estimators_)} estimators — expected ≥50 for production"
        )


# ==================  B. DATA INTEGRITY TESTS  =======================

class TestDataIntegrity:
    """Verify ward feature data and basin map are correct and clean."""

    def test_ward_csv_exists(self):
        """ward_features.csv must exist on disk."""
        assert os.path.isfile(WARD_CSV), f"Ward CSV not found at {WARD_CSV}"

    def test_ward_csv_has_correct_columns(self, ward_df):
        """All 8 feature columns plus base_risk must be present."""
        required = set(EXPECTED_FEATURES + ["base_risk", "ward_name"])
        missing = required - set(ward_df.columns)
        assert not missing, f"Missing columns in ward CSV: {missing}"

    def test_ward_csv_row_count(self, ward_df):
        """Should have approximately 288 ward rows (±10 tolerance)."""
        count = len(ward_df)
        assert 278 <= count <= 298, (
            f"Expected ~288 ward rows, got {count}"
        )

    def test_ward_csv_no_nan_in_features(self, ward_df):
        """After median-fill, no NaN should remain in feature columns."""
        nan_counts = ward_df[EXPECTED_FEATURES].isna().sum()
        bad = nan_counts[nan_counts > 0]
        assert bad.empty, f"NaN remaining after median fill:\n{bad}"

    def test_base_risk_in_valid_range(self, ward_df):
        """All base_risk values should be between 0 and 100."""
        risks = ward_df["base_risk"].dropna()
        assert risks.min() >= 0, f"base_risk below 0: {risks.min()}"
        assert risks.max() <= 100, f"base_risk above 100: {risks.max()}"

    def test_basin_map_exists_and_valid(self, basin_map):
        """ward_basin_map.json must exist and contain expected basins."""
        assert isinstance(basin_map, dict), "Basin map is not a dict"
        assert len(basin_map) > 0, "Basin map is empty"
        basins_found = set(basin_map.values())
        assert basins_found.issubset(EXPECTED_BASINS), (
            f"Unexpected basins: {basins_found - EXPECTED_BASINS}"
        )
        # Every expected basin should appear at least once
        for basin in EXPECTED_BASINS:
            assert basin in basins_found, f"Basin '{basin}' not found in map"

    def test_feature_value_ranges(self, ward_df):
        """Spot-check that feature values are in physically plausible ranges."""
        assert ward_df["ISP"].between(0, 100).all(), "ISP out of 0-100 range"
        assert ward_df["NDVI"].between(-1, 1).all(), "NDVI out of -1 to 1 range"
        assert (ward_df["population_density"] >= 0).all(), "Negative population density"
        assert (ward_df["road_density"] >= 0).all(), "Negative road density"


# ==================  C. PREDICTION SANITY TESTS  ====================

class TestPredictionSanity:
    """Verify the model produces correct, stable, bounded predictions."""

    def test_prediction_shape(self, rf_model, ward_df):
        """model.predict(X) must return array with one value per ward."""
        X = ward_df[EXPECTED_FEATURES].values
        preds = rf_model.predict(X)
        assert preds.shape == (len(ward_df),), (
            f"Prediction shape {preds.shape} != expected ({len(ward_df)},)"
        )

    def test_prediction_range(self, rf_model, ward_df):
        """All raw predictions should be in [0, 100]."""
        X = ward_df[EXPECTED_FEATURES].values
        preds = rf_model.predict(X)
        assert preds.min() >= 0, f"Prediction below 0: {preds.min():.2f}"
        assert preds.max() <= 100, f"Prediction above 100: {preds.max():.2f}"

    def test_high_risk_ward_detection(self, ward_df):
        """At least 5 wards should have base_risk > 65 (known hotspots)."""
        high_risk = ward_df[ward_df["base_risk"] > 65]
        assert len(high_risk) >= 5, (
            f"Only {len(high_risk)} high-risk wards (>65). Expected ≥5. "
            f"Model may be under-predicting risk."
        )

    def test_prediction_consistency(self, rf_model, ward_df):
        """Calling predict twice must return identical results (deterministic within float precision)."""
        X = ward_df[EXPECTED_FEATURES].values
        preds1 = rf_model.predict(X)
        preds2 = rf_model.predict(X)
        np.testing.assert_allclose(preds1, preds2, rtol=1e-5, atol=1e-8, err_msg="Predictions are non-deterministic")

    def test_single_ward_prediction(self, rf_model, ward_df):
        """Predicting on a single row should work without error."""
        single = ward_df[EXPECTED_FEATURES].iloc[[0]].values
        pred = rf_model.predict(single)
        assert pred.shape == (1,), f"Single-row prediction shape: {pred.shape}"
        assert 0 <= pred[0] <= 100, f"Single prediction out of range: {pred[0]}"

    def test_extreme_input_all_zeros(self, rf_model):
        """Model should handle an all-zeros feature vector without crashing."""
        X = np.zeros((1, len(EXPECTED_FEATURES)))
        pred = rf_model.predict(X)
        assert np.isfinite(pred[0]), f"Non-finite prediction for all-zeros: {pred[0]}"

    def test_extreme_input_all_max(self, rf_model):
        """Model should handle extreme high values without crashing."""
        X = np.full((1, len(EXPECTED_FEATURES)), 100.0)
        pred = rf_model.predict(X)
        assert np.isfinite(pred[0]), f"Non-finite prediction for all-max: {pred[0]}"

    def test_rainfall_scaling_zero_rain(self, rf_model, ward_df):
        """At rainfall=0, scaled risk should be 0 for all wards."""
        X = ward_df[EXPECTED_FEATURES].values
        base_risks = rf_model.predict(X)
        rain = 0
        rain_factor = (rain / 50.0) ** 0.65 if rain > 0 else 0.0
        scaled = np.minimum(100.0, base_risks * rain_factor)
        assert (scaled == 0).all(), "Scaled risk should be 0 when rainfall is 0"

    def test_rainfall_scaling_moderate_rain(self, rf_model, ward_df):
        """At rainfall=50mm, scaled risk should ≈ base_risk."""
        X = ward_df[EXPECTED_FEATURES].values
        base_risks = rf_model.predict(X)
        rain = 50
        rain_factor = (rain / 50.0) ** 0.65  # = 1.0
        scaled = np.minimum(100.0, base_risks * rain_factor)
        np.testing.assert_allclose(scaled, np.minimum(100.0, base_risks), rtol=0.01,
                                   err_msg="At 50mm rain, scaling factor should be ~1.0")

    def test_rainfall_scaling_heavy_rain(self, rf_model, ward_df):
        """At rainfall=150mm, risk should be higher than at 50mm."""
        X = ward_df[EXPECTED_FEATURES].values
        base_risks = rf_model.predict(X)

        factor_50 = (50 / 50.0) ** 0.65
        factor_150 = (150 / 50.0) ** 0.65

        scaled_50 = np.minimum(100.0, base_risks * factor_50)
        scaled_150 = np.minimum(100.0, base_risks * factor_150)

        # At least for wards with moderate base_risk, 150mm should produce higher risk
        moderate_mask = (base_risks > 30) & (base_risks < 80)
        if moderate_mask.any():
            assert (scaled_150[moderate_mask] >= scaled_50[moderate_mask]).all(), (
                "Heavy rain (150mm) should produce >= risk than moderate rain (50mm)"
            )


# ==================  D. INTEGRATION SMOKE TEST  =====================

class TestIntegration:
    """End-to-end smoke test replicating the /predict endpoint logic."""

    def test_full_prediction_pipeline(self, rf_model, ward_df, basin_map):
        """
        Simulate the full /predict endpoint:
          1. Load model + data
          2. Predict base_risk for all wards
          3. Apply per-basin rainfall scaling
          4. Produce ward_risks (status) and ward_scores (numeric)
          5. Verify output structure
        """
        test_rainfall_mm = 80
        test_basin_rainfall = {
            "Najafgarh": 100,
            "Barapullah": 60,
            "Shahdara-Yamuna": 80,
        }

        X = ward_df[EXPECTED_FEATURES].values
        base_risks = rf_model.predict(X)

        ward_risks = {}
        ward_scores = {}

        for i, row in ward_df.iterrows():
            ward = str(row["ward_name"])
            basin = basin_map.get(ward, "Najafgarh")
            rain = test_basin_rainfall.get(basin, test_rainfall_mm)

            rain_factor = (rain / 50.0) ** 0.65 if rain > 0 else 0.0
            risk = min(100.0, float(base_risks[i]) * rain_factor)

            score = round(risk)
            status = "High" if risk > 65 else "Medium" if risk > 35 else "Low"
            ward_risks[ward] = status
            ward_scores[ward] = score

        # Verify output structure
        assert len(ward_risks) == len(ward_df), (
            f"ward_risks has {len(ward_risks)} entries, expected {len(ward_df)}"
        )
        assert len(ward_scores) == len(ward_df), (
            f"ward_scores has {len(ward_scores)} entries, expected {len(ward_df)}"
        )

        # All statuses must be valid
        valid_statuses = {"High", "Medium", "Low"}
        for ward, status in ward_risks.items():
            assert status in valid_statuses, f"Invalid status '{status}' for ward '{ward}'"

        # All scores must be in [0, 100]
        for ward, score in ward_scores.items():
            assert 0 <= score <= 100, f"Score {score} out of range for ward '{ward}'"

        # At 80-100mm rainfall, some wards should show High risk
        high_count = sum(1 for s in ward_risks.values() if s == "High")
        assert high_count >= 3, (
            f"Only {high_count} High-risk wards at 80-100mm rainfall. "
            f"Expected ≥3 given known hotspots."
        )

        print(f"\n✅ Pipeline smoke test passed:")
        print(f"   {len(ward_risks)} wards processed")
        print(f"   High: {high_count}, Medium: {sum(1 for s in ward_risks.values() if s == 'Medium')}, "
              f"Low: {sum(1 for s in ward_risks.values() if s == 'Low')}")
