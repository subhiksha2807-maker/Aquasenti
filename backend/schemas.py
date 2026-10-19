"""Validated API input and output schemas."""
from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class TankOut(CamelModel):
    tankId: str
    tankName: str
    locality: str
    district: str
    latitude: float | None = None
    longitude: float | None = None
    lastCleanedDate: date


class ReadingIn(CamelModel):
    tankId: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    turbidity: float = Field(ge=0, le=1_000)
    tds: float = Field(ge=0, le=5_000)
    waterLevel: float = Field(ge=0, le=100)
    measurementMode: str = Field(default="calibrated", pattern=r"^calibrated$")

    @field_validator("tankId")
    @classmethod
    def normalize_id(cls, value: str) -> str:
        return value.upper()


class ReadingOut(CamelModel):
    tankId: str
    turbidity: float
    tds: float
    waterLevel: float
    timestamp: datetime


class PredictionInput(CamelModel):
    turbidity: float = Field(ge=0, le=1_000)
    tds: float = Field(ge=0, le=5_000)
    waterLevel: float = Field(ge=0, le=100)
    daysSinceLastCleaning: float = Field(ge=0, le=10_000)
    turbidityTrend: float = Field(ge=-1_000, le=1_000)
    tdsTrend: float = Field(ge=-5_000, le=5_000)
    waterLevelChange: float = Field(ge=-100, le=100)


class PredictionOut(CamelModel):
    tankId: str | None = None
    predictedDays: int
    predictedCleaningDate: date | None = None
    maintenanceStatus: str
    generatedAt: datetime | None = None


class DashboardOut(CamelModel):
    tank: TankOut
    latestReading: ReadingOut | None
    prediction: PredictionOut | None


class IngestionResponse(CamelModel):
    success: bool
    tankId: str
    readingStored: bool
    duplicate: bool = False
    prediction: PredictionOut | None = None
    predictionWarning: str | None = None
