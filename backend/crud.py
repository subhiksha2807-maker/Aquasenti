"""Database queries and feature engineering kept separate from HTTP routes."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

import models


def get_tank(db: Session, tank_id: str) -> models.Tank | None:
    return db.scalar(select(models.Tank).where(models.Tank.tank_id == tank_id.upper()))


def list_tanks(db: Session) -> list[models.Tank]:
    return list(db.scalars(select(models.Tank).order_by(models.Tank.tank_id)))


def get_latest_reading(db: Session, tank_id: str) -> models.SensorReading | None:
    return db.scalar(select(models.SensorReading).where(models.SensorReading.tank_id == tank_id).order_by(desc(models.SensorReading.timestamp), desc(models.SensorReading.id)).limit(1))


def get_readings(db: Session, tank_id: str, since: datetime | None = None) -> list[models.SensorReading]:
    query = select(models.SensorReading).where(models.SensorReading.tank_id == tank_id)
    if since is not None:
        query = query.where(models.SensorReading.timestamp >= since)
    return list(db.scalars(query.order_by(models.SensorReading.timestamp, models.SensorReading.id)))


def get_latest_prediction(db: Session, tank_id: str) -> models.Prediction | None:
    return db.scalar(select(models.Prediction).where(models.Prediction.tank_id == tank_id).order_by(desc(models.Prediction.generated_at), desc(models.Prediction.id)).limit(1))


def get_reading_by_request_id(db: Session, request_id: str) -> models.SensorReading | None:
    return db.scalar(select(models.SensorReading).where(models.SensorReading.request_id == request_id))


def create_reading(db: Session, tank_id: str, turbidity: float, tds: float, water_level: float, request_id: str | None = None, timestamp: datetime | None = None) -> models.SensorReading:
    reading = models.SensorReading(tank_id=tank_id, turbidity=turbidity, tds=tds, water_level=water_level, request_id=request_id, timestamp=timestamp or datetime.now(timezone.utc))
    db.add(reading)
    db.flush()
    return reading


def calculate_features(db: Session, tank: models.Tank, current: models.SensorReading) -> dict[str, float]:
    cutoff = current.timestamp - timedelta(days=7)
    history = get_readings(db, tank.tank_id, cutoff)
    older = [row for row in history if row.id != current.id]
    if older:
        baseline_turbidity = sum(row.turbidity for row in older) / len(older)
        baseline_tds = sum(row.tds for row in older) / len(older)
        baseline_level = sum(row.water_level for row in older) / len(older)
    else:
        baseline_turbidity, baseline_tds, baseline_level = current.turbidity, current.tds, current.water_level
    today = current.timestamp.date()
    return {
        "turbidity": current.turbidity,
        "tds": current.tds,
        "water_level": current.water_level,
        "days_since_last_cleaning": float(max(0, (today - tank.last_cleaned_date).days)),
        "turbidity_trend": current.turbidity - baseline_turbidity,
        "tds_trend": current.tds - baseline_tds,
        "water_level_change": current.water_level - baseline_level,
    }


def create_prediction(db: Session, tank_id: str, result: dict[str, object]) -> models.Prediction:
    prediction = models.Prediction(tank_id=tank_id, predicted_days=int(result["predictedDays"]), predicted_cleaning_date=result["predictedCleaningDate"], maintenance_status=str(result["maintenanceStatus"]), generated_at=datetime.now(timezone.utc))
    db.add(prediction)
    db.flush()
    return prediction
