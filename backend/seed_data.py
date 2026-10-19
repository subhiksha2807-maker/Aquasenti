"""Idempotently seed three demo tanks, history, and initial predictions."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import crud
import models
from database import Base, SessionLocal, engine
from prediction_service import PredictionService

TANKS = [
    {"tank_id": "TN-TANK-001", "tank_name": "Municipal Tank 01", "locality": "Tirunelveli", "district": "Tirunelveli", "latitude": 8.7139, "longitude": 77.7567, "last_cleaned_date": date(2026, 9, 12), "base": (38.4, 276.2, 74.0)},
    {"tank_id": "TN-TANK-002", "tank_name": "North Ward Overhead Tank", "locality": "Palayamkottai", "district": "Tirunelveli", "latitude": 8.7257, "longitude": 77.7333, "last_cleaned_date": date(2026, 9, 2), "base": (21.7, 228.5, 62.0)},
    {"tank_id": "TN-TANK-003", "tank_name": "Community Water Tank 03", "locality": "Melapalayam", "district": "Tirunelveli", "latitude": 8.7022, "longitude": 77.7081, "last_cleaned_date": date(2026, 7, 28), "base": (57.1, 401.6, 44.0)},
]


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    model = PredictionService()
    try:
        now = datetime.now(timezone.utc)
        for item in TANKS:
            base = item["base"]
            tank_values = {key: value for key, value in item.items() if key != "base"}
            tank = crud.get_tank(db, item["tank_id"])
            if tank is None:
                tank = models.Tank(**tank_values)
                db.add(tank)
                db.flush()
            if crud.get_latest_reading(db, tank.tank_id) is None:
                latest = None
                for age in range(30, -1, -1):
                    latest = crud.create_reading(
                        db, tank.tank_id,
                        max(0.5, base[0] - age * (12 / 7)),
                        max(1, base[1] - age * (31 / 7)),
                        max(0, min(100, base[2] + age * (8 / 7))),
                        timestamp=now - timedelta(days=age),
                    )
                result = model.predict(crud.calculate_features(db, tank, latest))
                crud.create_prediction(db, tank.tank_id, result)
        db.commit()
        print("Seeded TN-TANK-001, TN-TANK-002 and TN-TANK-003 with 31 readings each.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
