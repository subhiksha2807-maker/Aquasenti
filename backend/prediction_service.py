import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

import crud

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "ml" / "tank_cleaning_model.pkl"
CONFIG = json.loads((BASE_DIR / "maintenance_config.json").read_text(encoding="utf-8"))
FEATURES = [
    "turbidity", "tds", "water_level", "days_since_last_cleaning",
    "turbidity_trend", "tds_trend", "water_level_change",
]


def calculate_trends(db: Session, reading):
    previous = crud.get_recent_before(db, reading.tank_id, reading.timestamp)
    if not previous:
        return 0.0, 0.0, 0.0
    return (
        reading.turbidity - float(np.mean([item.turbidity for item in previous])),
        reading.tds - float(np.mean([item.tds for item in previous])),
        reading.water_level - float(np.mean([item.water_level for item in previous])),
    )


def status_for_days(days: int) -> str:
    for item in CONFIG["statuses"]:
        if days >= item["min_days"] and (item["max_days"] is None or days <= item["max_days"]):
            return item["label"]
    return "Routine Monitoring"


def predict_and_save(db: Session, tank, reading):
    turbidity_trend, tds_trend, water_change = calculate_trends(db, reading)
    days_since_cleaning = max((date.today() - tank.last_cleaned_date).days, 0)
    values = pd.DataFrame([[
        reading.turbidity, reading.tds, reading.water_level, days_since_cleaning,
        turbidity_trend, tds_trend, water_change,
    ]], columns=FEATURES)

    if MODEL_PATH.exists():
        model = joblib.load(MODEL_PATH)
        predicted_days = max(0, int(round(float(model.predict(values)[0]))))
    else:
        # Deterministic local fallback keeps ingestion functional before model training.
        condition_pressure = (
            reading.turbidity * 0.22 + reading.tds * 0.018 + days_since_cleaning * 0.35
            + max(turbidity_trend, 0) * 0.25 + max(tds_trend, 0) * 0.025
        )
        predicted_days = max(0, min(30, int(round(28 - condition_pressure))))

    generated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    return crud.create_prediction(
        db,
        tank_id=tank.tank_id,
        predicted_days=predicted_days,
        predicted_cleaning_date=generated_at.date() + timedelta(days=predicted_days),
        maintenance_status=status_for_days(predicted_days),
        generated_at=generated_at,
    )
