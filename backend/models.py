from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Tank(Base):
    __tablename__ = "tanks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tank_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    tank_name: Mapped[str] = mapped_column(String(120))
    locality: Mapped[str] = mapped_column(String(120))
    district: Mapped[str] = mapped_column(String(120))
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_cleaned_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    readings: Mapped[list["SensorReading"]] = relationship(back_populates="tank")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="tank")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tank_id: Mapped[str] = mapped_column(ForeignKey("tanks.tank_id"), index=True)
    turbidity: Mapped[float] = mapped_column(Float)
    tds: Mapped[float] = mapped_column(Float)
    water_level: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)

    tank: Mapped[Tank] = relationship(back_populates="readings")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tank_id: Mapped[str] = mapped_column(ForeignKey("tanks.tank_id"), index=True)
    predicted_days: Mapped[int] = mapped_column(Integer)
    predicted_cleaning_date: Mapped[date] = mapped_column(Date)
    maintenance_status: Mapped[str] = mapped_column(String(50))
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)

    tank: Mapped[Tank] = relationship(back_populates="predictions")
