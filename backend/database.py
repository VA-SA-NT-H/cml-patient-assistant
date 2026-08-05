import sqlite3
from datetime import datetime
from encryption import encrypt_value, decrypt_value

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
    
    # Table for lab test results
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lab_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            test_type TEXT NOT NULL,
            value TEXT NOT NULL,
            unit TEXT NOT NULL,
            reference_range TEXT,
            test_date TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Table for TKI treatments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            drug_name TEXT NOT NULL,
            dosage_mg INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            reason_for_change TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Table for milestone tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS milestones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            milestone_type TEXT NOT NULL,
            achieved INTEGER NOT NULL DEFAULT 0,
            achieved_date TEXT,
            value_at_achievement TEXT
        )
    ''')
    conn.commit()
    conn.close()
    
    # Ensure default milestones exist
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    default_milestones = ['ccyr', 'mmr', 'mr4', 'mr4_5']
    for m in default_milestones:
        cursor.execute("SELECT 1 FROM milestones WHERE milestone_type = ?", (m,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (?, 0, NULL, NULL)",
                (m,)
            )
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

def save_lab_result(test_type: str, value: str, unit: str, test_date: str,
                    reference_range: str = None, notes: str = None) -> int:
    """Save a lab result with encrypted value. Returns the new row ID."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    encrypted_value = encrypt_value(value)
    cursor.execute(
        "INSERT INTO lab_results (test_type, value, unit, reference_range, test_date, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (test_type, encrypted_value, unit, reference_range, test_date, notes,
         datetime.now().strftime("%Y-%m-%d %H:%M"))
    )
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_lab_results(test_type: str = None):
    """Retrieve lab results with decrypted values. Optional filter by test_type."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    if test_type:
        cursor.execute("SELECT id, test_type, value, unit, reference_range, test_date, notes, created_at FROM lab_results WHERE test_type = ? ORDER BY test_date ASC", (test_type,))
    else:
        cursor.execute("SELECT id, test_type, value, unit, reference_range, test_date, notes, created_at FROM lab_results ORDER BY test_date ASC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "id": r[0], "test_type": r[1], "value": decrypt_value(r[2]),
            "unit": r[3], "reference_range": r[4], "test_date": r[5],
            "notes": r[6], "created_at": r[7]
        }
        for r in rows
    ]


def update_lab_result(row_id: int, **kwargs):
    """Update a lab result. Only provided fields are updated."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    allowed = {"test_type", "value", "unit", "reference_range", "test_date", "notes"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if "value" in updates:
        updates["value"] = encrypt_value(updates["value"])
    if not updates:
        conn.close()
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [row_id]
    cursor.execute(f"UPDATE lab_results SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_lab_result(row_id: int):
    """Delete a lab result."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lab_results WHERE id = ?", (row_id,))
    conn.commit()
    conn.close()

def save_treatment(drug_name: str, dosage_mg: int, start_date: str,
                   end_date: str = None, reason_for_change: str = None) -> int:
    """Save a treatment record. Returns the new row ID."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO treatments (drug_name, dosage_mg, start_date, end_date, reason_for_change, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (drug_name, dosage_mg, start_date, end_date, reason_for_change,
         datetime.now().strftime("%Y-%m-%d %H:%M"))
    )
    row_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return row_id


def get_treatments():
    """Retrieve all treatments ordered by start_date."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, drug_name, dosage_mg, start_date, end_date, reason_for_change FROM treatments ORDER BY start_date ASC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": r[0], "drug_name": r[1], "dosage_mg": r[2], "start_date": r[3],
         "end_date": r[4], "reason_for_change": r[5]}
        for r in rows
    ]


def update_treatment(row_id: int, **kwargs):
    """Update a treatment record."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    allowed = {"drug_name", "dosage_mg", "start_date", "end_date", "reason_for_change"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        conn.close()
        return
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [row_id]
    cursor.execute(f"UPDATE treatments SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_treatment(row_id: int):
    """Delete a treatment record."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM treatments WHERE id = ?", (row_id,))
    conn.commit()
    conn.close()


def delete_all_lab_data():
    """Delete all lab results and treatments. Used for dashboard reset."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lab_results")
    cursor.execute("DELETE FROM treatments")
    cursor.execute("DELETE FROM milestones")
    conn.commit()
    conn.close()
    # Re-initialize default milestones
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    for m in ['ccyr', 'mmr', 'mr4', 'mr4_5']:
        cursor.execute(
            "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (?, 0, NULL, NULL)",
            (m,)
        )
    conn.commit()
    conn.close()

def save_milestone(milestone_type: str, achieved: bool, achieved_date: str = None,
                   value_at_achievement: str = None):
    """Save or update a milestone."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE milestones SET achieved = ?, achieved_date = ?, value_at_achievement = ? WHERE milestone_type = ?",
        (1 if achieved else 0, achieved_date, value_at_achievement, milestone_type)
    )
    if cursor.rowcount == 0:
        cursor.execute(
            "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (?, ?, ?, ?)",
            (milestone_type, 1 if achieved else 0, achieved_date, value_at_achievement)
        )
    conn.commit()
    conn.close()


def get_milestones():
    """Retrieve all milestones."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("SELECT id, milestone_type, achieved, achieved_date, value_at_achievement FROM milestones")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": r[0], "milestone_type": r[1], "achieved": bool(r[2]),
         "achieved_date": r[3],
         "value_at_achievement": r[4]}
        for r in rows
    ]


def update_milestone(milestone_type: str, achieved: bool, achieved_date: str = None,
                     value_at_achievement: str = None):
    """Update a milestone by type."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE milestones SET achieved = ?, achieved_date = ?, value_at_achievement = ? WHERE milestone_type = ?",
        (1 if achieved else 0, achieved_date, value_at_achievement, milestone_type)
    )
    conn.commit()
    conn.close()