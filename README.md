# AquaSentinel

AquaSentinel is a complete public water-tank condition monitoring and maintenance-prioritization demo. Calibrated ESP32 measurements are posted to FastAPI, stored as history in SQLite, evaluated by a Python Random Forest model, and broadcast to the React dashboard over a tank-specific WebSocket.

> **IMPORTANT: The included dataset and trained model use synthetic demonstration data. They are not scientifically validated and must not be represented as a real-world maintenance or water-safety model. Replace them with labelled historical sensor data, cleaning dates, and inspection records before deployment.**

Turbidity, TDS, and level readings do not prove drinking-water safety. Continue all required calibration, laboratory testing, inspection, and public-health procedures.

## Architecture

```text
Calibrated tank sensors
  → ESP32
  → Wi-Fi / mobile hotspot
  → FastAPI REST API
  → SQLAlchemy + SQLite
  → historical sensor data
  → RandomForestRegressor
  → historical cleaning predictions
  → REST API + tank WebSocket
  → React website
```

## Project structure

```text
backend/
├── main.py                  # REST routes, ingestion and WebSocket route
├── database.py              # engine and request sessions
├── models.py                # Tank, SensorReading and Prediction ORM models
├── schemas.py               # Pydantic validation and response contracts
├── crud.py                  # database queries and trend engineering
├── prediction_service.py    # model loading, clamping and status mapping
├── websocket_manager.py     # tank-specific live client registry
├── seed_data.py             # idempotent three-tank demo seed
├── maintenance_config.json  # editable demo categories
├── requirements.txt
├── .env.example
├── ml/
│   ├── generate_demo_data.py
│   ├── train_model.py
│   ├── tank_training_data.csv
│   └── tank_cleaning_model.pkl
└── data/
    └── aquasentinel.db      # generated locally and ignored by Git
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/useTank.js     # REST load + WebSocket reconnection
│   ├── services/api.js      # all HTTP and WebSocket URLs
│   └── config/
├── .env.example
└── package.json
esp32/
└── esp32_tank_monitor.ino
```

## Windows setup

Prerequisites: Python 3.11+ and Node.js 20+.

### 1. Backend

Open PowerShell in this repository:

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python ml\generate_demo_data.py
python ml\train_model.py
python seed_data.py
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

If PowerShell blocks activation, either adjust the policy for your account or run the virtual-environment executables directly, for example `venv\Scripts\python.exe seed_data.py`.

Backend URLs:

- Health: `http://localhost:8000/health`
- Swagger API documentation: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

`0.0.0.0` makes the API listen on the laptop's network interfaces, allowing an ESP32 on the same hotspot to reach it. It is a bind address; the ESP32 must use the laptop's actual LAN address.

### 2. Frontend

In a second PowerShell window:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

If this Windows installation blocks `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev` instead. Open `http://localhost:5173`.

The development simulator sends the `VITE_ESP32_API_KEY` value. It must match `ESP32_API_KEY` in `backend/.env`. A Vite browser variable is visible to users, so this arrangement is only for the local simulator. A deployed operator simulator should use authenticated server-side sessions; physical devices should have individually managed credentials.

## Environment configuration

Backend `backend/.env`:

```dotenv
DATABASE_URL=sqlite:///./data/aquasentinel.db
ESP32_API_KEY=CHANGE_ME
FRONTEND_URL=http://localhost:5173
MODEL_PATH=./ml/tank_cleaning_model.pkl
MIN_PREDICTION_DAYS=0
MAX_PREDICTION_DAYS=90
```

Frontend `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ESP32_API_KEY=CHANGE_ME
VITE_SENSOR_OFFLINE_MINUTES=30
```

Restart both development servers after environment changes. For a hosted system use HTTPS/WSS, restrictive CORS, strong rotated device credentials, rate limiting, request logging, and a production database suited to the deployment scale.

## Seeded demonstration

`python seed_data.py` is idempotent and provides 31 recent readings for each tank:

- `TN-TANK-001` — Municipal Tank 01, Tirunelveli
- `TN-TANK-002` — North Ward Overhead Tank, Palayamkottai
- `TN-TANK-003` — Community Water Tank 03, Melapalayam

To test the complete flow:

1. Start the backend and frontend.
2. Search for `TN-TANK-001`.
3. Confirm metadata, current readings, history graphs, and an AI maintenance prediction appear.
4. Leave that dashboard open in one browser tab.
5. Open **Admin / Demo** in another tab.
6. Choose `TN-TANK-001`, enter turbidity `50`, TDS `330`, and water level `62`, then select **Send Demo Reading**.
7. FastAPI validates the key and calibrated-format values, inserts a new SQLite row, calculates trends, runs the model, saves a historical prediction, and emits a WebSocket message.
8. The open dashboard reloads its REST data automatically without a page refresh.

## Main API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Database-backed service check |
| GET | `/api/tanks` | List tank metadata |
| GET | `/api/tanks/{tank_id}` | Tank metadata or HTTP 404 |
| GET | `/api/tanks/{tank_id}/latest` | Latest reading |
| GET | `/api/tanks/{tank_id}/readings?hours=24` | Chronological history |
| GET | `/api/tanks/{tank_id}/readings?days=7` | Chronological history |
| GET | `/api/tanks/{tank_id}/prediction` | Latest historical prediction |
| GET | `/api/tanks/{tank_id}/dashboard` | Metadata, latest reading and prediction |
| POST | `/api/readings` | Protected ESP32/simulator ingestion |
| POST | `/api/predict` | Stateless model test |
| WebSocket | `/ws/tanks/{tank_id}` | Real-time tank update messages |

Every sensor update creates a `sensor_readings` row. Every successful inference creates a `predictions` row. The optional `X-Request-ID` header is unique and makes retries idempotent. If inference fails, ingestion commits the sensor row and returns `predictionWarning`; this avoids losing measurements because of a model problem.

Example sensor submission:

```powershell
$headers = @{ "X-API-Key" = "CHANGE_ME"; "X-Request-ID" = [guid]::NewGuid().ToString() }
$body = @{ tankId="TN-TANK-001"; turbidity=50; tds=330; waterLevel=62; measurementMode="calibrated" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/readings -Headers $headers -ContentType application/json -Body $body
```

## Model details

The seven features are `turbidity`, `tds`, `water_level`, `days_since_last_cleaning`, `turbidity_trend`, `tds_trend`, and `water_level_change`. The backend derives cleaning age from tank metadata. For trends it compares the current reading with the average of older readings from the preceding seven days. With no older readings, trends safely default to zero.

The target is `days_until_cleaning`. Predictions are rounded and clamped to configurable minimum/maximum days. Demo categories are maintained in `backend/maintenance_config.json`:

- 0–2: Urgent Inspection
- 3–7: Cleaning Soon
- 8–14: Monitor Closely
- 15+: Routine Monitoring

These are demonstration maintenance categories, not approved safety limits.

Run tests from the backend directory after seeding:

```powershell
pytest -q
```

## Connecting the ESP32 on a mobile hotspot

1. Connect the laptop and ESP32 to the same phone hotspot.
2. On Windows run `ipconfig` and find the laptop hotspot adapter's **IPv4 Address**, such as `192.168.43.120`.
3. Start FastAPI with `--host 0.0.0.0` and allow TCP port 8000 through Windows Firewall for the private network if prompted.
4. In `esp32/esp32_tank_monitor.ino`, set `BACKEND_URL` to `http://192.168.43.120:8000/api/readings` and configure the same API key used by the backend.
5. Never use `localhost` in the sketch: on the ESP32 it means the ESP32 itself, not the laptop.
6. Calibrate the exact sensor hardware, replace the placeholder conversion functions, and only then set `CALIBRATION_READY = true`.

The sketch uses `WiFi.h` and `HTTPClient.h`, sends JSON with `X-API-Key` and a retry-safe `X-Request-ID`, and refuses to upload uncalibrated turbidity or TDS. For an online backend, change to HTTPS with certificate verification and update all configured API/WebSocket URLs.
