"""Insert non-destructive demonstration tanks, history, and predictions."""
import math
import random
from datetime import date, datetime, timedelta, timezone

from database import Base, SessionLocal, engine
import models
from prediction_service import predict_and_save

TANKS = [
    ("TN-TANK-001", "Municipal Water Tank 01", "Nagercoil", "Kanyakumari", 8.1833, 77.4119, date(2026, 9, 12)),
    ("TN-TANK-002", "Community Overhead Tank 02", "Marthandam", "Kanyakumari", 8.3084, 77.2211, date(2026, 9, 8)),
    ("TN-TANK-003", "Public Water Tank 03", "Suchindram", "Kanyakumari", 8.1544, 77.4670, date(2026, 9, 17)),
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    random.seed(42)
    try:
        for index, values in enumerate(TANKS):
            tank_id = values[0]
            tank = db.query(models.Tank).filter_by(tank_id=tank_id).first()
            if not tank:
                tank = models.Tank(
                    tank_id=values[0], tank_name=values[1], locality=values[2], district=values[3],
                    latitude=values[4], longitude=values[5], last_cleaned_date=values[6],
                )
                db.add(tank)
                db.commit()

            if not db.query(models.SensorReading).filter_by(tank_id=tank_id).first():
                start = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
                for hour in range(0, 30 * 24 + 1, 3):
                    progress = hour / (30 * 24)
                    reading = models.SensorReading(
                        tank_id=tank_id,
                        turbidity=round(18 + index * 3 + progress * 20 + random.uniform(-3, 3), 1),
                        tds=round(210 + index * 18 + progress * 70 + random.uniform(-12, 12), 1),
                        water_level=round(max(15, min(100, 72 + 18 * math.sin(hour / 30) + random.uniform(-4, 4))), 1),
                        timestamp=start + timedelta(hours=hour),
                    )
                    db.add(reading)
                db.commit()

            latest = db.query(models.SensorReading).filter_by(tank_id=tank_id).order_by(models.SensorReading.timestamp.desc()).first()
            if not db.query(models.Prediction).filter_by(tank_id=tank_id).first():
                predict_and_save(db, tank, latest)
        print("Demo data ready: TN-TANK-001, TN-TANK-002, TN-TANK-003")
    finally:
        db.close()


if __name__ == "__main__":
    main()
