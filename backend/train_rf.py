"""
Train RandomForestRegressor on ward feature data.
Saves model to backend/models/rf_waterlogging.pkl

Run from project root: python3 backend/train_rf.py
"""
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

FEATURES = [
    "ISP", "road_density", "population_density", "NDVI",
    "runoff_coeff", "capacity_cusecs", "area_acres", "elevation_factor"
]
TARGET = "base_risk"
IN_CSV = "backend/data/ward_features.csv"
OUT_PKL = "backend/models/rf_waterlogging.pkl"


def main():
    df = pd.read_csv(IN_CSV)
    print(f"Loaded {len(df)} ward rows")

    # Fill any NaN from malformed source CSVs with column medians
    df[FEATURES] = df[FEATURES].fillna(df[FEATURES].median())
    df[TARGET] = df[TARGET].fillna(df[TARGET].median())

    X = df[FEATURES].values
    y = df[TARGET].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)
    print(f"Test RMSE : {rmse:.2f}")
    print(f"Test R²   : {r2:.4f}")

    importances = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
    print("\nFeature importances:")
    for feat, imp in importances:
        print(f"  {feat:<22} {imp:.4f}")

    joblib.dump({"model": model, "features": FEATURES}, OUT_PKL)
    print(f"\nModel saved to {OUT_PKL}")


if __name__ == "__main__":
    main()
