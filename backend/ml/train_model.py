"""Validate data, evaluate, and save the demonstration Random Forest model."""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "tank_training_data.csv"
MODEL_PATH = BASE_DIR / "tank_cleaning_model.pkl"
FEATURES = ["turbidity", "tds", "water_level", "days_since_last_cleaning", "turbidity_trend", "tds_trend", "water_level_change"]
TARGET = "days_until_cleaning"


def main() -> None:
    data = pd.read_csv(DATA_PATH)
    missing = set(FEATURES + [TARGET]) - set(data.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")
    clean = data[FEATURES + [TARGET]].apply(pd.to_numeric, errors="coerce").dropna()
    clean = clean[clean.turbidity.between(0, 1_000) & clean.tds.between(0, 5_000) & clean.water_level.between(0, 100) & clean.days_since_last_cleaning.ge(0) & clean.days_until_cleaning.ge(0)]
    if len(clean) < 100:
        raise ValueError("At least 100 valid labelled rows are required")
    X_train, X_test, y_train, y_test = train_test_split(clean[FEATURES], clean[TARGET], test_size=0.2, random_state=42)
    model = RandomForestRegressor(n_estimators=300, max_depth=14, min_samples_leaf=2, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    predicted = model.predict(X_test)
    print(f"Training rows: {len(X_train)}")
    print(f"Test rows: {len(X_test)}")
    print(f"MAE: {mean_absolute_error(y_test, predicted):.3f} days")
    print(f"R²: {r2_score(y_test, predicted):.3f}")
    print("Metrics apply only to synthetic demonstration data, not field performance.")
    joblib.dump(model, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
