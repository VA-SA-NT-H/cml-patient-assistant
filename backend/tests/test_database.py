import pytest
import os
import sys
import tempfile
import sqlite3

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_create_user():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["DATA_DIR"] = tmpdir
        # Reload database module to pick up new DATA_DIR
        import database
        database.DB_NAME = os.path.join(tmpdir, "cml_chat_history.db")
        database.init_db()
        
        user = database.create_user(
            user_id="google_123",
            email="test@example.com",
            name="Test User",
            picture_url="https://example.com/pic.jpg"
        )
        
        assert user["user_id"] == "google_123"
        assert user["email"] == "test@example.com"
        assert user["name"] == "Test User"

def test_get_user_by_id():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["DATA_DIR"] = tmpdir
        import database
        database.DB_NAME = os.path.join(tmpdir, "cml_chat_history.db")
        database.init_db()
        
        database.create_user(user_id="google_123", email="test@example.com", name="Test")
        user = database.get_user_by_id("google_123")
        
        assert user is not None
        assert user["email"] == "test@example.com"

def test_get_user_by_email():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["DATA_DIR"] = tmpdir
        import database
        database.DB_NAME = os.path.join(tmpdir, "cml_chat_history.db")
        database.init_db()
        
        database.create_user(user_id="google_123", email="test@example.com", name="Test")
        user = database.get_user_by_email("test@example.com")
        
        assert user is not None
        assert user["user_id"] == "google_123"

def test_add_user_id_columns():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["DATA_DIR"] = tmpdir
        import database
        database.DB_NAME = os.path.join(tmpdir, "cml_chat_history.db")
        database.init_db()
        
        # Verify user_id columns exist
        conn = sqlite3.connect(os.path.join(tmpdir, "cml_chat_history.db"))
        cursor = conn.cursor()
        
        # Check sessions table
        cursor.execute("PRAGMA table_info(sessions)")
        columns = [row[1] for row in cursor.fetchall()]
        assert "user_id" in columns
        
        # Check lab_results table
        cursor.execute("PRAGMA table_info(lab_results)")
        columns = [row[1] for row in cursor.fetchall()]
        assert "user_id" in columns
        
        # Check treatments table
        cursor.execute("PRAGMA table_info(treatments)")
        columns = [row[1] for row in cursor.fetchall()]
        assert "user_id" in columns
        
        conn.close()

def test_database_functions_accept_user_id():
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["DATA_DIR"] = tmpdir
        import database
        database.DB_NAME = os.path.join(tmpdir, "cml_chat_history.db")
        database.init_db()
        
        database.create_user(user_id="user1", email="user1@test.com", name="User 1")
        database.create_user(user_id="user2", email="user2@test.com", name="User 2")
        
        # Create session for user1
        import uuid
        session_id = str(uuid.uuid4())
        database.create_new_session(session_id, "Test Session", user_id="user1")
        sessions = database.get_all_sessions(user_id="user1")
        assert len(sessions) == 1
        assert sessions[0][0] == session_id  # session_id is first column
        
        # Create lab result for user1
        database.save_lab_result("bcr_abl1", "0.5", "%", "2024-01-15", user_id="user1")
        
        # Verify user2 can't see user1's data
        user1_results = database.get_lab_results(user_id="user1")
        user2_results = database.get_lab_results(user_id="user2")
        
        assert len(user1_results) == 1
        assert len(user2_results) == 0
