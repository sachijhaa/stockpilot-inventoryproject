"""
Generates a realistic synthetic daily sales dataset used to train the
demand forecasting model. In production this would be replaced by a
real export of historical InventoryLog (STOCK_OUT) records from Postgres.
"""
import numpy as np
import pandas as pd
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent / "sample_sales.csv"


def generate_sales_data(days: int = 730, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=days, freq="D")

    base_demand = 40
    trend = np.linspace(0, 25, days)  # gradual upward trend
    weekly_seasonality = 12 * np.sin(2 * np.pi * (dates.dayofweek / 7))
    yearly_seasonality = 18 * np.sin(2 * np.pi * (dates.dayofyear / 365))
    festival_spikes = np.zeros(days)

    # Simulate a few festival/promo spikes
    for spike_day in rng.choice(days, size=8, replace=False):
        festival_spikes[spike_day: spike_day + 3] += rng.uniform(30, 60)

    noise = rng.normal(0, 6, days)

    demand = base_demand + trend + weekly_seasonality + yearly_seasonality + festival_spikes + noise
    demand = np.clip(demand, 0, None).round().astype(int)

    return pd.DataFrame({"date": dates, "quantity": demand})


if __name__ == "__main__":
    df = generate_sales_data()
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Generated {len(df)} rows -> {OUTPUT_PATH}")
