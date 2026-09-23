from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SensorReadingCreate(BaseModel):
    tank_id: str = Field(alias="tankId", min_length=3, max_length=50)
    turbidity: float = Field(ge=0, le=4000)
    tds: float = Field(ge=0, le=10000)
    water_level: float = Field(alias="waterLevel", ge=0, le=100)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("tank_id")
    @classmethod
    def normalize_tank_id(cls, value: str) -> str:
        return value.strip().upper()


class TankResponse(BaseModel):
    tank_id: str = Field(serialization_alias="tankId")
    tank_name: str = Field(serialization_alias="tankName")
    locality: str
    district: str
    latitude: float | None
    longitude: float | None
    last_cleaned_date: date = Field(serialization_alias="lastCleanedDate")

    model_config = ConfigDict(from_attributes=True, serialize_by_alias=True)


class ReadingResponse(BaseModel):
    turbidity: float
    tds: float
    water_level: float = Field(serialization_alias="waterLevel")
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True, serialize_by_alias=True)


class PredictionResponse(BaseModel):
    predicted_days: int = Field(serialization_alias="predictedDays")
    predicted_cleaning_date: date = Field(serialization_alias="predictedCleaningDate")
    maintenance_status: str = Field(serialization_alias="maintenanceStatus")
    generated_at: datetime = Field(serialization_alias="generatedAt")

    model_config = ConfigDict(from_attributes=True, serialize_by_alias=True)
