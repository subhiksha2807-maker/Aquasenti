import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import crud, models, schemas
from database import Base, engine, get_db
from prediction_service import CONFIG, predict_and_save
from websocket_manager import manager

load_dotenv()
app = FastAPI(
    title="AquaSentinel API",
    description="Local-first tank monitoring and demonstration maintenance prediction API.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


def ensure_tank(db: Session, tank_id: str):
    tank = crud.get_tank(db, tank_id)
    if not tank:
        raise HTTPException(status_code=404, detail="Tank not found. Please check the Tank ID.")
    return tank


def tank_payload(tank):
    return schemas.TankResponse.model_validate(tank).model_dump(mode="json", by_alias=True)


def reading_payload(reading):
    return schemas.ReadingResponse.model_validate(reading).model_dump(mode="json", by_alias=True)


def prediction_payload(prediction):
    return schemas.PredictionResponse.model_validate(prediction).model_dump(mode="json", by_alias=True)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/tanks/{tank_id}")
def get_tank(tank_id: str, db: Session = Depends(get_db)):
    return tank_payload(ensure_tank(db, tank_id))


@app.get("/api/tanks/{tank_id}/latest")
def get_latest(tank_id: str, db: Session = Depends(get_db)):
    ensure_tank(db, tank_id)
    reading = crud.get_latest_reading(db, tank_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Sensor data currently unavailable.")
    return reading_payload(reading)


@app.get("/api/tanks/{tank_id}/readings")
def get_readings(
    tank_id: str,
    hours: int | None = Query(None, ge=1, le=720),
    days: int | None = Query(None, ge=1, le=365),
    db: Session = Depends(get_db),
):
    ensure_tank(db, tank_id)
    interval = timedelta(hours=hours) if hours else timedelta(days=days or 7)
    now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
    readings = crud.get_readings(db, tank_id, now_utc - interval)
    return [reading_payload(item) for item in readings]


@app.get("/api/tanks/{tank_id}/prediction")
def get_prediction(tank_id: str, db: Session = Depends(get_db)):
    ensure_tank(db, tank_id)
    prediction = crud.get_latest_prediction(db, tank_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="AI prediction temporarily unavailable.")
    return prediction_payload(prediction)


@app.get("/api/tanks/{tank_id}/dashboard")
def get_dashboard(tank_id: str, db: Session = Depends(get_db)):
    tank = ensure_tank(db, tank_id)
    reading = crud.get_latest_reading(db, tank_id)
    prediction = crud.get_latest_prediction(db, tank_id)
    return {
        "tank": tank_payload(tank),
        "latestReading": reading_payload(reading) if reading else None,
        "prediction": prediction_payload(prediction) if prediction else None,
        "offlineAfterMinutes": CONFIG["offline_minutes"],
    }


@app.post("/api/readings", status_code=201)
async def ingest_reading(
    payload: schemas.SensorReadingCreate,
    request: Request,
    x_api_key: str | None = Header(None),
    x_demo_mode: str | None = Header(None),
    db: Session = Depends(get_db),
):
    expected_key = os.getenv("ESP32_API_KEY", "CHANGE_ME")
    demo_allowed = os.getenv("ALLOW_DEMO_SIMULATOR", "true").lower() == "true"
    local_client = request.client and request.client.host in {"127.0.0.1", "::1", "testclient"}
    local_demo = demo_allowed and local_client and x_demo_mode == "local-simulator"
    if x_api_key != expected_key and not local_demo:
        raise HTTPException(status_code=401, detail="Invalid API key")

    tank = ensure_tank(db, payload.tank_id)
    try:
        reading = crud.create_reading(
            db, payload.tank_id, payload.turbidity, payload.tds, payload.water_level
        )
        prediction = predict_and_save(db, tank, reading)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while saving reading")

    update = {
        "type": "tank_update",
        "tankId": tank.tank_id,
        "latestReading": reading_payload(reading),
        "prediction": prediction_payload(prediction),
    }
    await manager.broadcast(tank.tank_id, update)
    return {
        "success": True,
        "tankId": tank.tank_id,
        "prediction": {
            "predictedDays": prediction.predicted_days,
            "maintenanceStatus": prediction.maintenance_status,
        },
    }


@app.websocket("/ws/tanks/{tank_id}")
async def tank_socket(websocket: WebSocket, tank_id: str):
    await manager.connect(tank_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(tank_id, websocket)
