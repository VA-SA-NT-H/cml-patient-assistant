import pytest
import sys
import os
import io

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from api.main import app
from PIL import Image

client = TestClient(app)

def create_test_image(width=400, height=200, color='white'):
    """Create a simple test image."""
    img = Image.new('RGB', (width, height), color=color)
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()

def test_upload_image_with_empty_image():
    image_bytes = create_test_image()
    response = client.post(
        "/api/upload-image",
        files={"file": ("lab_report.png", image_bytes, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Empty image should return no recognized values
    assert len(data) >= 1
    assert data[0]["valid"] is False

def test_upload_image_file_structure():
    image_bytes = create_test_image()
    response = client.post(
        "/api/upload-image",
        files={"file": ("test.png", image_bytes, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        row = data[0]
        assert "test_type" in row
        assert "value" in row
        assert "unit" in row
        assert "test_date" in row
        assert "notes" in row
        assert "valid" in row
        assert "error" in row

def test_upload_jpg_image():
    # Create a JPEG image
    img = Image.new('RGB', (400, 200), color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    image_bytes = buffer.getvalue()
    
    response = client.post(
        "/api/upload-image",
        files={"file": ("lab_report.jpg", image_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_upload_multiple_image_formats():
    formats = [
        ("test.png", "image/png", "PNG"),
        ("test.jpg", "image/jpeg", "JPEG"),
        ("test.jpeg", "image/jpeg", "JPEG"),
    ]
    
    for filename, content_type, format_name in formats:
        img = Image.new('RGB', (400, 200), color='white')
        buffer = io.BytesIO()
        img.save(buffer, format=format_name)
        image_bytes = buffer.getvalue()
        
        response = client.post(
            "/api/upload-image",
            files={"file": (filename, image_bytes, content_type)}
        )
        assert response.status_code == 200, f"Failed for {format_name}"

def test_upload_image_no_external_binary():
    """Test that upload-image works without external Tesseract binary."""
    image_bytes = create_test_image()
    response = client.post(
        "/api/upload-image",
        files={"file": ("test.png", image_bytes, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # RapidOCR is pure Python, should work without external binaries
    # Empty image should return no recognized values
    assert len(data) >= 1
    assert data[0]["valid"] is False
