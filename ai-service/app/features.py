"""Shared feature engineering for the demand forecasting model."""
import numpy as np
import pandas as pd


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Given a dataframe with columns [date, quantity], engineer time-series
    features suitable for a gradient-boosted tree regressor (XGBoost).
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["day_of_year"] = df["date"].dt.dayofyear
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Lag features
    for lag in [1, 2, 3, 7, 14]:
        df[f"lag_{lag}"] = df["quantity"].shift(lag)

    # Rolling statistics
    df["rolling_mean_7"] = df["quantity"].shift(1).rolling(window=7, min_periods=1).mean()
    df["rolling_mean_14"] = df["quantity"].shift(1).rolling(window=14, min_periods=1).mean()
    df["rolling_std_7"] = df["quantity"].shift(1).rolling(window=7, min_periods=1).std().fillna(0)

    df = df.dropna().reset_index(drop=True)
    return df


FEATURE_COLUMNS = [
    "day_of_week",
    "day_of_month",
    "month",
    "day_of_year",
    "is_weekend",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_7",
    "lag_14",
    "rolling_mean_7",
    "rolling_mean_14",
    "rolling_std_7",
]
