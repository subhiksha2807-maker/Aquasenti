"""Train the AquaSentinel demonstration RandomForest model."""
from pathlib import Path
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "tank_training_data.csv"
MODEL_PATH = BASE_DIR / "tank_cleaning_model.pkl"
FEATURES = [
    "turbidity", "tds", "water_level", "days_since_last_cleaning",
    "turbidity_trend", "tds_trend", "water_level_change",
]


def main():
    data = pd.read_csv(DATA_PATH)
    x_train, x_test, y_train, y_test = train_test_split(
        data[FEATURES], data["days_until_cleaning"], test_size=0.2, random_state=42
    )
    model = RandomForestRegressor(n_estimators=220, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(x_train, y_train)
    mae = mean_absolute_error(y_test, model.predict(x_test))
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")
    print(f"Demo test MAE: {mae:.2f} days")
    print("WARNING: Trained on synthetic demonstration data; not scientifically validated.")


if __name__ == "__main__":
    main()
