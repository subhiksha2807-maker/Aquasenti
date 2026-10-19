import uuid

from fastapi.testclient import TestClient

from main import app


def test_complete_rest_and_websocket_flow() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        dashboard = client.get("/api/tanks/TN-TANK-001/dashboard")
        assert dashboard.status_code == 200
        assert dashboard.json()["tank"]["locality"] == "Tirunelveli"
        request_id = f"pytest-{uuid.uuid4()}"
        headers = {"X-API-Key": "CHANGE_ME", "X-Request-ID": request_id}
        payload = {"tankId": "TN-TANK-001", "turbidity": 50, "tds": 330, "waterLevel": 62, "measurementMode": "calibrated"}
        with client.websocket_connect("/ws/tanks/TN-TANK-001") as websocket:
            response = client.post("/api/readings", json=payload, headers=headers)
            message = websocket.receive_json()
        assert response.status_code == 200
        assert response.json()["readingStored"] is True
        assert message["type"] == "tank_update"
        assert message["reading"]["turbidity"] == 50
        duplicate = client.post("/api/readings", json=payload, headers=headers)
        assert duplicate.status_code == 200
        assert duplicate.json()["duplicate"] is True


def test_api_errors_and_prediction() -> None:
    with TestClient(app) as client:
        assert client.get("/api/tanks/UNKNOWN/dashboard").status_code == 404
        assert client.post("/api/readings", headers={"X-API-Key": "CHANGE_ME"}, json={}).status_code == 400
        invalid = client.post("/api/readings", headers={"X-API-Key": "CHANGE_ME"}, json={"tankId": "TN-TANK-001", "turbidity": 4, "tds": 200, "waterLevel": 150})
        assert invalid.status_code == 400
        prediction = client.post("/api/predict", json={"turbidity": 38, "tds": 276, "waterLevel": 74, "daysSinceLastCleaning": 35, "turbidityTrend": 12, "tdsTrend": 25, "waterLevelChange": -6})
        assert prediction.status_code == 200
        assert 0 <= prediction.json()["predictedDays"] <= 90


def test_history_is_chronological() -> None:
    with TestClient(app) as client:
        response = client.get("/api/tanks/TN-TANK-001/readings?days=30")
        assert response.status_code == 200
        timestamps = [row["timestamp"] for row in response.json()]
        assert timestamps == sorted(timestamps)
