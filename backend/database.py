from pathlib import Path
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_DB = f"sqlite:///{(BASE_DIR / 'data' / 'aquasentinel.db').as_posix()}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DB)

if DATABASE_URL.startswith("sqlite"):
    (BASE_DIR / "data").mkdir(parents=True, exist_ok=True)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def migrate_sensor_readings():
    """Add the current sensor columns without deleting legacy readings."""
    inspector = inspect(engine)
    if "sensor_readings" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("sensor_readings")}
    with engine.begin() as connection:
        if "ph" not in columns:
            connection.execute(text("ALTER TABLE sensor_readings ADD COLUMN ph FLOAT NOT NULL DEFAULT 7.0"))
        if "ultrasonic_distance" not in columns:
            connection.execute(text("ALTER TABLE sensor_readings ADD COLUMN ultrasonic_distance FLOAT NOT NULL DEFAULT 0.0"))
            if "water_level" in columns:
                connection.execute(text(
                    "UPDATE sensor_readings SET ultrasonic_distance = "
                    "CASE WHEN water_level < 0 THEN 200 WHEN water_level > 100 THEN 0 "
                    "ELSE 200 - (water_level * 2) END"
                ))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
