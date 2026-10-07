"""
Trains an XGBoost regression model on historical daily sales data to
predict next-day demand, then saves it with joblib for the FastAPI
inference endpoint to load.

Run:
    python train_model.py
"""
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

sys.path.append(str(Path(__file__).parent))
from features import build_features, FEATURE_COLUMNS  # noqa: E402

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_PATH = BASE_DIR / "data" / "sample_sales.csv"

MODELS_DIR.mkdir(exist_ok=True)


def train_demand_model():
    if not DATA_PATH.exists():
        from data.generate_sample_data import generate_sales_data

        df = generate_sales_data()
        df.to_csv(DATA_PATH, index=False)
    else:
        df = pd.read_csv(DATA_PATH)

    features_df = build_features(df)
    X = features_df[FEATURE_COLUMNS]
    y = features_df["quantity"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, shuffle=False)

    model = XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        objective="reg:squarederror",
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))

    print(f"Demand model trained. MAE={mae:.2f}  RMSE={rmse:.2f}")

    joblib.dump(model, MODELS_DIR / "demand_model.joblib")
    metadata = {"mae": mae, "rmse": rmse, "features": FEATURE_COLUMNS, "trained_rows": len(features_df)}
    joblib.dump(metadata, MODELS_DIR / "demand_model_metadata.joblib")

    return model, metadata


def train_anomaly_model():
    """Trains an Isolation Forest on synthetic transaction quantities for anomaly detection."""
    rng = np.random.default_rng(7)
    normal = rng.normal(loc=50, scale=15, size=950)
    anomalies = rng.uniform(low=200, high=500, size=50)
    data = np.concatenate([normal, anomalies]).reshape(-1, 1)
    data = np.clip(data, 0, None)

    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    model.fit(data)

    joblib.dump(model, MODELS_DIR / "anomaly_model.joblib")
    print("Anomaly detection model trained and saved.")
    return model


if __name__ == "__main__":
    train_demand_model()
    train_anomaly_model()
