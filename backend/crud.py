from datetime import datetime, timedelta

from sqlalchemy.orm import Session

import models


def get_tank(db: Session, tank_id: str):
    return db.query(models.Tank).filter(models.Tank.tank_id == tank_id.upper()).first()


def get_latest_reading(db: Session, tank_id: str):
    return (
        db.query(models.SensorReading)
        .filter(models.SensorReading.tank_id == tank_id.upper())
        .order_by(models.SensorReading.timestamp.desc())
        .first()
    )


def get_readings(db: Session, tank_id: str, since: datetime | None = None):
    query = db.query(models.SensorReading).filter(models.SensorReading.tank_id == tank_id.upper())
    if since:
        query = query.filter(models.SensorReading.timestamp >= since)
    return query.order_by(models.SensorReading.timestamp.asc()).all()


def get_recent_before(db: Session, tank_id: str, before: datetime, limit: int = 12):
    return (
        db.query(models.SensorReading)
        .filter(models.SensorReading.tank_id == tank_id.upper(), models.SensorReading.timestamp < before)
        .order_by(models.SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )


def create_reading(
    db: Session, tank_id: str, turbidity: float, ph: float, ultrasonic_distance: float
):
    # Legacy fields remain populated for compatibility with databases created by v1.
    water_level = max(0.0, min(100.0, 100.0 - (ultrasonic_distance / 2.0)))
    reading = models.SensorReading(
        tank_id=tank_id.upper(),
        turbidity=turbidity,
        ph=ph,
        ultrasonic_distance=ultrasonic_distance,
        tds=0.0,
        water_level=water_level,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


def get_latest_prediction(db: Session, tank_id: str):
    return (
        db.query(models.Prediction)
        .filter(models.Prediction.tank_id == tank_id.upper())
        .order_by(models.Prediction.generated_at.desc())
        .first()
    )


def create_prediction(db: Session, **values):
    prediction = models.Prediction(**values)
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction
