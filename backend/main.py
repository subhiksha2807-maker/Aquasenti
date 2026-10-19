"""AquaSentinel REST and WebSocket API backed entirely by SQLite."""
from __future__ import annotations

import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from functools import lru_cache

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

import crud
import models
import schemas
from database import Base, engine, get_db
from prediction_service import PredictionService
from websocket_manager import manager

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="AquaSentinel API", version="2.0.0", description="SQLite-backed tank monitoring, sensor ingestion and demo ML prediction API.", lifespan=lifespan)
frontend_urls = [value.strip() for value in os.getenv("FRONTEND_URL", "http://localhost:5173").split(",") if value.strip()]
app.add_middleware(CORSMiddleware, allow_origins=frontend_urls, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-API-Key", "X-Request-ID"])


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    code = status.HTTP_400_BAD_REQUEST if request.url.path == "/api/readings" else status.HTTP_422_UNPROCESSABLE_ENTITY
    return JSONResponse(status_code=code, content={"detail": "Invalid request data", "errors": jsonable_encoder(exc.errors())})


@lru_cache
def prediction_service() -> PredictionService:
    return PredictionService()


def tank_json(tank: models.Tank) -> dict:
    return {"tankId": tank.tank_id, "tankName": tank.tank_name, "locality": tank.locality, "district": tank.district, "latitude": tank.latitude, "longitude": tank.longitude, "lastCleanedDate": tank.last_cleaned_date}


def reading_json(reading: models.SensorReading | None) -> dict | None:
    if reading is None:
        return None
    return {"tankId": reading.tank_id, "turbidity": reading.turbidity, "tds": reading.tds, "waterLevel": reading.water_level, "timestamp": reading.timestamp}


def prediction_json(prediction: models.Prediction | None) -> dict | None:
    if prediction is None:
        return None
    return {"tankId": prediction.tank_id, "predictedDays": prediction.predicted_days, "predictedCleaningDate": prediction.predicted_cleaning_date, "maintenanceStatus": prediction.maintenance_status, "generatedAt": prediction.generated_at}


def dashboard_json(db: Session, tank: models.Tank) -> dict:
    return {"tank": tank_json(tank), "latestReading": reading_json(crud.get_latest_reading(db, tank.tank_id)), "prediction": prediction_json(crud.get_latest_prediction(db, tank.tank_id))}


def require_tank(db: Session, tank_id: str) -> models.Tank:
    tank = crud.get_tank(db, tank_id)
    if tank is None:
        raise HTTPException(status_code=404, detail="Tank not found")
    return tank


def verify_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    expected = os.getenv("ESP32_API_KEY", "CHANGE_ME")
    if not x_api_key or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing sensor API key")


@app.get("/health", summary="Backend health check")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/api/tanks", response_model=list[schemas.TankOut], summary="List registered tanks")
def tanks(db: Session = Depends(get_db)):
    return [tank_json(tank) for tank in crud.list_tanks(db)]


@app.get("/api/tanks/{tank_id}", response_model=schemas.TankOut, summary="Find a tank by its public Tank ID")
def tank_details(tank_id: str, db: Session = Depends(get_db)):
    return tank_json(require_tank(db, tank_id.upper()))


@app.get("/api/tanks/{tank_id}/latest", response_model=schemas.ReadingOut, summary="Get the most recent sensor reading")
def latest_reading(tank_id: str, db: Session = Depends(get_db)):
    tank = require_tank(db, tank_id.upper())
    reading = crud.get_latest_reading(db, tank.tank_id)
    if reading is None:
        raise HTTPException(status_code=404, detail="No sensor readings available")
    return reading_json(reading)


@app.get("/api/tanks/{tank_id}/readings", response_model=list[schemas.ReadingOut], summary="Get chronological sensor history")
def readings(tank_id: str, hours: int | None = Query(default=None, ge=1, le=744), days: int | None = Query(default=None, ge=1, le=365), db: Session = Depends(get_db)):
    tank = require_tank(db, tank_id.upper())
    if hours is not None and days is not None:
        raise HTTPException(status_code=400, detail="Use either hours or days, not both")
    since = datetime.now(timezone.utc) - timedelta(hours=hours) if hours else datetime.now(timezone.utc) - timedelta(days=days) if days else None
    return [reading_json(item) for item in crud.get_readings(db, tank.tank_id, since)]


@app.get("/api/tanks/{tank_id}/prediction", response_model=schemas.PredictionOut, summary="Get the latest saved prediction")
def latest_prediction(tank_id: str, db: Session = Depends(get_db)):
    tank = require_tank(db, tank_id.upper())
    prediction = crud.get_latest_prediction(db, tank.tank_id)
    if prediction is None:
        raise HTTPException(status_code=404, detail="No prediction available")
    return prediction_json(prediction)


@app.get("/api/tanks/{tank_id}/dashboard", response_model=schemas.DashboardOut, summary="Get complete tank dashboard data")
def dashboard(tank_id: str, db: Session = Depends(get_db)):
    return dashboard_json(db, require_tank(db, tank_id.upper()))


@app.post("/api/predict", response_model=schemas.PredictionOut, summary="Test the trained model without storing data")
def standalone_prediction(payload: schemas.PredictionInput):
    features = {"turbidity": payload.turbidity, "tds": payload.tds, "water_level": payload.waterLevel, "days_since_last_cleaning": payload.daysSinceLastCleaning, "turbidity_trend": payload.turbidityTrend, "tds_trend": payload.tdsTrend, "water_level_change": payload.waterLevelChange}
    try:
        result = prediction_service().predict(features)
        return {**result, "generatedAt": datetime.now(timezone.utc)}
    except Exception as exc:
        prediction_service.cache_clear()
        raise HTTPException(status_code=503, detail="ML model unavailable or invalid") from exc


@app.post("/api/readings", response_model=schemas.IngestionResponse, summary="Store a calibrated ESP32 or simulator reading")
async def ingest_reading(payload: schemas.ReadingIn, _: None = Depends(verify_api_key), x_request_id: str | None = Header(default=None, alias="X-Request-ID", max_length=128), db: Session = Depends(get_db)):
    tank = require_tank(db, payload.tankId)
    if x_request_id and crud.get_reading_by_request_id(db, x_request_id):
        return {"success": True, "tankId": tank.tank_id, "readingStored": True, "duplicate": True, "prediction": prediction_json(crud.get_latest_prediction(db, tank.tank_id))}
    prediction = None
    prediction_warning = None
    try:
        reading = crud.create_reading(db, tank.tank_id, payload.turbidity, payload.tds, payload.waterLevel, x_request_id)
        try:
            result = prediction_service().predict(crud.calculate_features(db, tank, reading))
            prediction = crud.create_prediction(db, tank.tank_id, result)
        except Exception:
            prediction_service.cache_clear()
            prediction_warning = "Sensor reading stored, but ML prediction is temporarily unavailable."
        db.commit()
    except IntegrityError:
        db.rollback()
        if x_request_id and crud.get_reading_by_request_id(db, x_request_id):
            return {"success": True, "tankId": tank.tank_id, "readingStored": True, "duplicate": True, "prediction": prediction_json(crud.get_latest_prediction(db, tank.tank_id))}
        raise HTTPException(status_code=409, detail="Duplicate reading request")
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database unavailable; reading was not stored") from exc

    event = {"type": "tank_update", "tankId": tank.tank_id, "reading": reading_json(reading), "prediction": prediction_json(prediction), "predictionWarning": prediction_warning}
    await manager.broadcast(tank.tank_id, jsonable_encoder(event))
    return {"success": True, "tankId": tank.tank_id, "readingStored": True, "prediction": prediction_json(prediction), "predictionWarning": prediction_warning}


@app.websocket("/ws/tanks/{tank_id}")
async def tank_updates(websocket: WebSocket, tank_id: str):
    normalized = tank_id.upper()
    db = next(get_db())
    try:
        exists = crud.get_tank(db, normalized) is not None
    finally:
        db.close()
    if not exists:
        await websocket.close(code=4404, reason="Tank not found")
        return
    await manager.connect(normalized, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(normalized, websocket)
