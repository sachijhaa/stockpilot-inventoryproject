"""
Loads trained models from disk once at startup and exposes inference
helpers used by the FastAPI routes. Falls back gracefully to a
statistical (moving-average + seasonal) model if no trained XGBoost
model is present yet, so the service is usable immediately after
`docker compose up` even before `train_model.py` has been run manually.
"""
from pathlib import Path
from typing import List

import joblib
import numpy as np
import pandas as pd

from .features import build_features, FEATURE_COLUMNS

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"

_demand_model = None
_demand_metadata = None
_anomaly_model = None


def load_models():
    global _demand_model, _demand_metadata, _anomaly_model
    demand_path = MODELS_DIR / "demand_model.joblib"
    metadata_path = MODELS_DIR / "demand_model_metadata.joblib"
    anomaly_path = MODELS_DIR / "anomaly_model.joblib"

    if demand_path.exists():
        _demand_model = joblib.load(demand_path)
        _demand_metadata = joblib.load(metadata_path) if metadata_path.exists() else {}
    if anomaly_path.exists():
        _anomaly_model = joblib.load(anomaly_path)


def is_demand_model_ready() -> bool:
    return _demand_model is not None


def is_anomaly_model_ready() -> bool:
    return _anomaly_model is not None


def forecast_with_xgboost(history_df: pd.DataFrame, horizon_days: int):
    """Iteratively forecasts `horizon_days` ahead using lag/rolling features,
    feeding each prediction back in as history for the next day's features."""
    working = history_df.copy()
    predictions = []

    for _ in range(horizon_days):
        feats = build_features(working)
        if feats.empty:
            break
        last_row = feats.iloc[[-1]][FEATURE_COLUMNS]
        pred = float(_demand_model.predict(last_row)[0])
        pred = max(0.0, pred)

        next_date = pd.to_datetime(working["date"].iloc[-1]) + pd.Timedelta(days=1)
        predictions.append((next_date, pred))
        working = pd.concat(
            [working, pd.DataFrame({"date": [next_date], "quantity": [pred]})],
            ignore_index=True,
        )

    return predictions


def forecast_with_moving_average(history_df: pd.DataFrame, horizon_days: int):
    """Fallback: seasonal-naive + moving average blend when no trained model exists yet."""
    if history_df.empty:
        avg = 20.0
        last_date = pd.Timestamp.today().normalize()
    else:
        avg = history_df["quantity"].tail(14).mean()
        last_date = pd.to_datetime(history_df["date"].iloc[-1])

    predictions = []
    for i in range(1, horizon_days + 1):
        day = last_date + pd.Timedelta(days=i)
        weekday_factor = 1.15 if day.dayofweek >= 5 else 1.0
        predictions.append((day, max(0.0, avg * weekday_factor)))
    return predictions


def run_forecast(history: List[dict], horizon_days: int):
    history_df = pd.DataFrame(history) if history else pd.DataFrame(columns=["date", "quantity"])

    if is_demand_model_ready() and len(history_df) >= 20:
        raw_predictions = forecast_with_xgboost(history_df, horizon_days)
        model_used = "xgboost"
        confidence_base = 0.85
    else:
        raw_predictions = forecast_with_moving_average(history_df, horizon_days)
        model_used = "moving_average_fallback"
        confidence_base = 0.6

    predictions = []
    for idx, (day, value) in enumerate(raw_predictions):
        # Confidence decays slightly further into the horizon
        confidence = max(0.4, confidence_base - idx * 0.01)
        predictions.append({"date": day.strftime("%Y-%m-%d"), "value": round(value, 2), "confidence": round(confidence, 2)})

    return predictions, model_used, len(history_df)


def run_anomaly_detection(points: List[dict]):
    if not points:
        return []

    quantities = np.array([[p["quantity"]] for p in points])

    if is_anomaly_model_ready():
        preds = _anomaly_model.predict(quantities)  # -1 = anomaly, 1 = normal
        scores = _anomaly_model.score_samples(quantities)
    else:
        # Fallback: simple z-score based flagging
        mean, std = quantities.mean(), quantities.std() or 1
        z_scores = (quantities.flatten() - mean) / std
        preds = np.where(np.abs(z_scores) > 2.5, -1, 1)
        scores = -np.abs(z_scores)

    results = []
    for point, pred, score in zip(points, preds, scores):
        results.append(
            {
                **point,
                "isAnomaly": bool(pred == -1),
                "anomalyScore": round(float(score), 4),
            }
        )
    return results
