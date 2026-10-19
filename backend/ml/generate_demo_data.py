"""Generate a synthetic dataset for testing the AquaSentinel ML pipeline.

This dataset is synthetic demonstration data and is NOT scientifically validated.
Replace it with actual historical tank sensor and cleaning records before
real-world deployment.
"""
from pathlib import Path

import numpy as np
import pandas as pd

OUTPUT = Path(__file__).resolve().parent / "tank_training_data.csv"
ROWS = 1_000


def main() -> None:
    rng = np.random.default_rng(42)
    values = {
        "turbidity": rng.uniform(3, 80, ROWS),
        "tds": rng.uniform(90, 650, ROWS),
        "water_level": rng.uniform(8, 100, ROWS),
        "days_since_last_cleaning": rng.integers(0, 91, ROWS),
        "turbidity_trend": rng.normal(2, 10, ROWS),
        "tds_trend": rng.normal(5, 35, ROWS),
        "water_level_change": rng.normal(-2, 16, ROWS),
    }
    target = (
        43.5 - 0.45 * values["turbidity"] - 0.025 * values["tds"]
        - 0.45 * values["days_since_last_cleaning"] - 0.08 * values["turbidity_trend"]
        - 0.03 * values["tds_trend"] + 0.02 * values["water_level"]
        + 0.04 * values["water_level_change"] + rng.normal(0, 2.2, ROWS)
    )
    values["days_until_cleaning"] = np.clip(target, 0, 60)
    frame = pd.DataFrame(values).round(2)
    frame.to_csv(OUTPUT, index=False)
    print(f"Wrote {len(frame)} synthetic demonstration rows to {OUTPUT}")


if __name__ == "__main__":
    main()
