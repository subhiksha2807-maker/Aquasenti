"""SQLAlchemy ORM models for tanks, readings and historical predictions."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Tank(Base):
    __tablename__ = "tanks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tank_id: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    tank_name: Mapped[str] = mapped_column(String(160), nullable=False)
    locality: Mapped[str] = mapped_column(String(160), nullable=False)
    district: Mapped[str] = mapped_column(String(160), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    last_cleaned_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    readings: Mapped[list["SensorReading"]] = relationship(back_populates="tank", cascade="all, delete-orphan")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="tank", cascade="all, delete-orphan")


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (Index("ix_readings_tank_timestamp", "tank_id", "timestamp"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tank_id: Mapped[str] = mapped_column(ForeignKey("tanks.tank_id", ondelete="CASCADE"), nullable=False)
    turbidity: Mapped[float] = mapped_column(Float, nullable=False)
    tds: Mapped[float] = mapped_column(Float, nullable=False)
    water_level: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    request_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)

    tank: Mapped[Tank] = relationship(back_populates="readings")


class Prediction(Base):
    __tablename__ = "predictions"
    __table_args__ = (Index("ix_predictions_tank_generated", "tank_id", "generated_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tank_id: Mapped[str] = mapped_column(ForeignKey("tanks.tank_id", ondelete="CASCADE"), nullable=False)
    predicted_days: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_cleaning_date: Mapped[date] = mapped_column(Date, nullable=False)
    maintenance_status: Mapped[str] = mapped_column(String(80), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    tank: Mapped[Tank] = relationship(back_populates="predictions")
