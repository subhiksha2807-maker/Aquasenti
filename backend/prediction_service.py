"""Model loading and inference for the AquaSentinel demo model."""
from __future__ import annotations

import json
import os
from datetime import date, timedelta
from pathlib import Path

import joblib
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = BASE_DIR / "ml" / "tank_cleaning_model.pkl"
FEATURES = [
    "turbidity",
    "tds",
    "water_level",
    "days_since_last_cleaning",
    "turbidity_trend",
    "tds_trend",
    "water_level_change",
]


class PredictionService:
    def __init__(self) -> None:
        configured_path = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH)))
        if not configured_path.is_absolute():
            configured_path = (BASE_DIR / configured_path).resolve()
        if not configured_path.exists():
            raise FileNotFoundError(
                f"Model not found at {configured_path}. Run: python ml/train_model.py"
            )
        self.model = joblib.load(configured_path)
        self.minimum = int(os.getenv("MIN_PREDICTION_DAYS", "0"))
        self.maximum = int(os.getenv("MAX_PREDICTION_DAYS", "90"))
        with (BASE_DIR / "maintenance_config.json").open(encoding="utf-8") as handle:
            self.categories = json.load(handle)

    def status_for(self, days: int) -> str:
        for category in self.categories:
            if days <= category["max_days"]:
                return category["label"]
        return self.categories[-1]["label"]

    def predict(self, values: dict[str, float]) -> dict[str, object]:
        frame = pd.DataFrame([[values[name] for name in FEATURES]], columns=FEATURES)
        raw_prediction = float(self.model.predict(frame)[0])
        days = round(max(self.minimum, min(self.maximum, raw_prediction)))
        predicted_date = date.today() + timedelta(days=days)
        return {
            "predictedDays": days,
            "predictedCleaningDate": predicted_date,
            "maintenanceStatus": self.status_for(days),
        }
