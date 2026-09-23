# AquaSentinel

AI-powered public water-tank monitoring and cleaning prediction, built for a complete localhost demonstration with FastAPI, SQLite, React, WebSockets, and a Random Forest model.

> AquaSentinel supports maintenance monitoring and prioritization. Sensor readings and model output do not prove potability, replace laboratory water-quality testing, or provide a scientifically validated cleaning date. The included training data and maintenance categories are synthetic demonstration material.

## Architecture

```text
Turbidity / TDS / Water-level sensors
                ↓
              ESP32
                ↓ Wi-Fi / phone hotspot
         FastAPI REST endpoint
                ↓
       SQLite historical storage
                ↓
     RandomForestRegressor prediction
                ↓ REST + WebSocket
          React/Vite dashboard
```

## Project structure

```text
aquasenti/
├── backend/
│   ├── data/                       # Local SQLite database directory
│   ├── ml/
│   │   ├── generate_demo_data.py   # Creates synthetic training rows
│   │   └── train_model.py          # Trains and saves the Random Forest model
│   ├── main.py                     # FastAPI routes, CORS, ingestion, WebSocket
│   ├── database.py                 # SQLAlchemy engine/session
│   ├── models.py                   # Tank, reading, and prediction tables
│   ├── schemas.py                  # Request validation and response schemas
│   ├── crud.py                     # Database queries and writes
│   ├── prediction_service.py       # Trends, inference, status selection
│   ├── websocket_manager.py        # Per-tank live connections
│   ├── seed_data.py                # Non-destructive demo seed command
│   ├── maintenance_config.json     # Demo status bands/offline setting
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/             # Layout, cards, charts, status UI
│   │   ├── config/                 # Runtime endpoint configuration
│   │   ├── hooks/                  # Reconnecting tank WebSocket hook
│   │   ├── pages/                  # Home, tank dashboard, demo simulator
│   │   ├── services/               # Fetch API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── esp32/
│   └── esp32_tank_monitor.ino       # Wi-Fi/HTTP Arduino sketch
├── .gitignore
└── README.md
```

## Windows setup

Prerequisites: Python 3.10 or newer and Node.js 20 or newer.

### 1. Backend, ML model, and database

Open Command Prompt in the project directory:

```cmd
cd backend
python -m venv venv
venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
venv\Scripts\python.exe ml\generate_demo_data.py
venv\Scripts\python.exe ml\train_model.py
venv\Scripts\python.exe seed_data.py
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The startup creates missing tables but never deletes or recreates existing data. Seeding happens only when `seed_data.py` is run, and it does not duplicate existing demo data.

Check:

- Health: http://localhost:8000/health
- Swagger API documentation: http://localhost:8000/docs
- Demo dashboard API: http://localhost:8000/api/tanks/TN-TANK-001/dashboard

To retrain later:

```cmd
cd backend
venv\Scripts\python.exe ml\generate_demo_data.py
venv\Scripts\python.exe ml\train_model.py
```

### 2. Frontend

In a second Command Prompt:

```cmd
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173, search for `TN-TANK-001`, and inspect the live readings, history, and AI maintenance card.

### 3. Complete simulator test

1. Keep both servers running.
2. Open http://localhost:5173/admin/demo.
3. Select `TN-TANK-001` and enter turbidity `50`, TDS `330`, and water level `62`.
4. Select **Send Demo Reading**.
5. Open the tank dashboard. If it is already open in another tab, the cards and prediction update automatically through WebSocket.

Local simulator requests use a dedicated `X-Demo-Mode: local-simulator` header and are accepted only from the loopback interface while `ALLOW_DEMO_SIMULATOR=true`. Set that environment variable to `false` outside local development.

## Connecting a real ESP32

1. Copy `backend/.env.example` to `.env`, set a strong `ESP32_API_KEY`, and restart FastAPI.
2. Put the same key, hotspot credentials, tank ID, sensor pins, and backend address in `esp32/esp32_tank_monitor.ino`.
3. Connect the laptop and ESP32 to the same phone hotspot.
4. On the laptop, run `ipconfig` and find the active Wi-Fi adapter's **IPv4 Address**.
5. Set `BACKEND_URL` to that address, for example `http://192.168.43.120:8000/api/readings`. Do not use `localhost`; on the ESP32, that refers to the ESP32 itself.
6. Ensure the Windows firewall permits inbound TCP traffic to port 8000, then upload the sketch.

The ESP32 sends `X-API-Key`; FastAPI validates it, stores every reading, calculates historical trends, runs the model, saves the prediction, and broadcasts the update. Real readings use the same path as simulated ones and therefore require no dashboard changes.

Raw ADC values are not NTU, ppm, or percentage values. Calibrate each sensor against appropriate references and replace the demonstration conversion coefficients before real use.

## API examples

With the backend running:

```powershell
Invoke-RestMethod http://localhost:8000/health
Invoke-RestMethod http://localhost:8000/api/tanks/TN-TANK-001/dashboard
Invoke-RestMethod 'http://localhost:8000/api/tanks/TN-TANK-001/readings?days=7'
```

Hardware-style ingestion (the key must match `.env`):

```powershell
$headers = @{ 'X-API-Key' = 'CHANGE_ME' }
$body = @{ tankId='TN-TANK-001'; turbidity=50; tds=330; waterLevel=62 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/readings -Headers $headers -ContentType 'application/json' -Body $body
```

## Data and security notes

- SQLite stays local at `backend/data/aquasentinel.db` and is ignored by Git.
- Secrets belong in `.env`, which is ignored by Git. Commit only `.env.example`.
- The prediction model is trained on synthetic data and is for workflow demonstration only.
- The configurable demo status bands are documented in `maintenance_config.json`.
- There are no Firebase or Supabase packages, imports, configuration files, or services.
