import pytest
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from api.upload_parser import parse_image

def test_parse_image_empty():
    result = parse_image(b"")
    assert len(result) == 1
    assert result[0]["valid"] is False
    assert "Empty" in result[0]["error"]

def test_parse_image_invalid():
    result = parse_image(b"not an image")
    assert len(result) == 1
    assert result[0]["valid"] is False
    assert "Invalid" in result[0]["error"] or "Could not read" in result[0]["error"]

def test_parse_image_returns_list():
    result = parse_image(b"")
    assert isinstance(result, list)

def test_parse_image_structure():
    result = parse_image(b"")
    assert "test_type" in result[0]
    assert "value" in result[0]
    assert "unit" in result[0]
    assert "test_date" in result[0]
    assert "notes" in result[0]
    assert "valid" in result[0]
    assert "error" in result[0]
