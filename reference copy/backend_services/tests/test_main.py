from fastapi.testclient import TestClient
import sys
import os

# Add parent dir to path so we can import 'server'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "JalDrishti AI Backend Running"}

def test_predict_no_auth():
    # Should fail with 403 Forbidden
    response = client.post("/predict", json={
        "temperature": 30,
        "humidity": 80,
        "pressure": 1000,
        "cloud_cover": 50
    })
    assert response.status_code == 403

def test_predict_with_auth():
    # Should pass with 200 OK
    response = client.post(
        "/predict", 
        json={
            "temperature": 30,
            "humidity": 80,
            "pressure": 1000,
            "cloud_cover": 50
        },
        headers={"X-API-Key": "jal-drishti-secure-key-2025"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "rainfall_mm" in data
    assert "locations" in data
