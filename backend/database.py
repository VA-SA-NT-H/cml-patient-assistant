import sqlite3
from datetime import datetime

DB_NAME = "cml_chat_history.db"

def init_db():
    """Initializes the local SQLite database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Table for chat sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            title TEXT,
            created_at TEXT
        )
    ''')
    
    # Table for individual messages within a session
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            content TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions (session_id)
        )
    ''')
    conn.commit()
    conn.close()

def create_new_session(session_id: str, title: str):
    """Creates a new chat session."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO sessions (session_id, title, created_at) VALUES (?, ?, ?)",
        (session_id, title, datetime.now().strftime("%Y-%m-%d %H:%M"))
    )
    conn.commit()
    conn.close()

def save_message(session_id: str, role: str, content: str):
    """Saves a single message to the local database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
        (session_id, role, content)
    )
    conn.commit()
    conn.close()

def get_all_sessions():
    """Retrieves all past chat sessions for the sidebar."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, title, created_at FROM sessions ORDER BY created_at DESC")
    sessions = cursor.fetchall()
    conn.close()
    return sessions

def get_session_messages(session_id: str):
    """Retrieves all messages for a specific session ID."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT role, content FROM messages WHERE session_id = ?", (session_id,))
    messages = cursor.fetchall()
    conn.close()
    return [{"role": role, "content": content} for role, content in messages]

def delete_session(session_id: str):
    """Deletes a chat session and all associated messages from the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

def rename_session(session_id: str, new_title: str):
    """Renames the title of a specific chat session in the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("UPDATE sessions SET title = ? WHERE session_id = ?", (new_title, session_id))
    conn.commit()
    conn.close()