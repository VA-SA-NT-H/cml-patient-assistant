import pytest
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Set test environment
os.environ["JWT_SECRET"] = "test-secret-key"
os.environ["GOOGLE_CLIENT_ID"] = "test-client-id"

def test_create_jwt_token():
    from auth import create_jwt_token
    
    token = create_jwt_token(
        user_id="google_123",
        email="test@example.com",
        name="Test User"
    )
    
    assert token is not None
    assert isinstance(token, str)

def test_verify_jwt_token():
    from auth import create_jwt_token, verify_jwt_token
    
    token = create_jwt_token(
        user_id="google_123",
        email="test@example.com",
        name="Test User"
    )
    
    payload = verify_jwt_token(token)
    assert payload is not None
    assert payload["sub"] == "google_123"
    assert payload["email"] == "test@example.com"

def test_verify_invalid_token():
    from auth import verify_jwt_token
    
    payload = verify_jwt_token("invalid-token")
    assert payload is None
