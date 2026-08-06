import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_upload_image_empty():
    response = client.post("/api/upload-image", files={"file": ("test.png", b"", "image/png")})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["valid"] is False
    assert "Empty" in data[0]["error"]

def test_upload_image_invalid():
    response = client.post("/api/upload-image", files={"file": ("test.png", b"not an image", "image/png")})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["valid"] is False

def test_upload_image_structure():
    response = client.post("/api/upload-image", files={"file": ("test.png", b"", "image/png")})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        assert "test_type" in data[0]
        assert "valid" in data[0]
