"""Generate synthetic demonstration data; it is not scientifically validated."""
from pathlib import Path
import numpy as np
import pandas as pd

OUTPUT = Path(__file__).resolve().parent / "tank_training_data.csv"


def main():
    rng = np.random.default_rng(2026)
    rows = 1200
    turbidity = rng.uniform(5, 90, rows)
    tds = rng.uniform(90, 650, rows)
    water_level = rng.uniform(10, 100, rows)
    days_since = rng.uniform(0, 80, rows)
    turbidity_trend = rng.normal(2, 8, rows)
    tds_trend = rng.normal(5, 25, rows)
    water_change = rng.normal(-2, 12, rows)
    pressure = (
        turbidity * 0.19 + tds * 0.014 + days_since * 0.2
        + np.maximum(turbidity_trend, 0) * 0.18 + np.maximum(tds_trend, 0) * 0.012
    )
    target = np.clip(35 - pressure + rng.normal(0, 2.2, rows), 0, 45)
    data = pd.DataFrame({
        "turbidity": turbidity.round(2), "tds": tds.round(2), "water_level": water_level.round(2),
        "days_since_last_cleaning": days_since.round(2), "turbidity_trend": turbidity_trend.round(2),
        "tds_trend": tds_trend.round(2), "water_level_change": water_change.round(2),
        "days_until_cleaning": target.round(2),
    })
    data.to_csv(OUTPUT, index=False)
    print(f"Generated {rows} synthetic demo rows at {OUTPUT}")
    print("WARNING: This dataset is synthetic and not scientifically validated for real maintenance decisions.")


if __name__ == "__main__":
    main()
