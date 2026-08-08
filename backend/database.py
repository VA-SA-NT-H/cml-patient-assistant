import os
import psycopg2
import psycopg2.extras
from datetime import datetime
from encryption import encrypt_value, decrypt_value

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_db_connection():
    """Get a PostgreSQL connection with RealDictCursor."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


def create_user(user_id: str, email: str, name: str = None, picture_url: str = None) -> dict:
    """Create or update a user from Google OAuth."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("""
        INSERT INTO users (user_id, email, name, picture_url, created_at, last_login)
        VALUES (%s, %s, %s, %s, NOW(), NOW())
        ON CONFLICT(user_id) DO UPDATE SET
            last_login = NOW(),
            name = COALESCE(EXCLUDED.name, users.name),
            picture_url = COALESCE(EXCLUDED.picture_url, users.picture_url)
    """, (user_id, email, name, picture_url))
    conn.commit()
    user = get_user_by_id(user_id)
    conn.close()
    return user


def get_user_by_id(user_id: str) -> dict:
    """Get user by Google OAuth subject ID."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email: str) -> dict:
    """Get user by email address."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def init_db():
    """Initializes the PostgreSQL database schema."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT,
                picture_url TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                title TEXT,
                created_at TEXT,
                user_id TEXT REFERENCES users(user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                session_id TEXT,
                role TEXT,
                content TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions (session_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lab_results (
                id SERIAL PRIMARY KEY,
                test_type TEXT NOT NULL,
                value TEXT NOT NULL,
                unit TEXT NOT NULL,
                reference_range TEXT,
                test_date TEXT NOT NULL,
                notes TEXT,
                created_at TEXT NOT NULL,
                user_id TEXT REFERENCES users(user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS treatments (
                id SERIAL PRIMARY KEY,
                drug_name TEXT NOT NULL,
                dosage_mg INTEGER NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT,
                reason_for_change TEXT,
                created_at TEXT NOT NULL,
                user_id TEXT REFERENCES users(user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS milestones (
                id SERIAL PRIMARY KEY,
                milestone_type TEXT NOT NULL,
                achieved INTEGER NOT NULL DEFAULT 0,
                achieved_date TEXT,
                value_at_achievement TEXT,
                user_id TEXT REFERENCES users(user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS checkup_records (
                id SERIAL PRIMARY KEY,
                checkup_date TEXT NOT NULL,
                doctor_advice TEXT,
                medications_bought TEXT,
                medication_cost TEXT,
                created_at TEXT NOT NULL,
                user_id TEXT REFERENCES users(user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_settings (
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                user_id TEXT REFERENCES users(user_id),
                PRIMARY KEY (key, user_id)
            )
        ''')

        # Indexes for performance on user_id lookups
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_lab_results_user_id ON lab_results(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_treatments_user_id ON treatments(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_checkup_records_user_id ON checkup_records(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)')

        conn.commit()
        conn.close()
        print("[init_db] Database initialized successfully")
    except Exception as e:
        print(f"[init_db] WARNING: Database initialization failed: {e}")
        print("[init_db] The app will continue starting. Tables will be created on first successful connection.")


def create_new_session(session_id: str, title: str, user_id: str = None):
    """Creates a new chat session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO sessions (session_id, title, created_at, user_id) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING",
        (session_id, title, datetime.now().strftime("%Y-%m-%d %H:%M"), user_id)
    )
    conn.commit()
    conn.close()
    return session_id


def save_message(session_id: str, role: str, content: str):
    """Saves a single message to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (session_id, role, content) VALUES (%s, %s, %s)",
        (session_id, role, content)
    )
    conn.commit()
    conn.close()


def get_all_sessions(user_id: str = None):
    """Retrieves all past chat sessions for the sidebar."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT session_id, title, created_at FROM sessions WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
    else:
        cursor.execute("SELECT session_id, title, created_at FROM sessions ORDER BY created_at DESC")
    sessions = cursor.fetchall()
    conn.close()
    return sessions


def get_session_messages(session_id: str):
    """Retrieves all messages for a specific session ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, role, content FROM messages WHERE session_id = %s", (session_id,))
    messages = cursor.fetchall()
    conn.close()
    return [{"id": id, "role": role, "content": content} for id, role, content in messages]


def update_message(message_id: int, content: str) -> bool:
    """Updates a message's content. Returns True if updated."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE messages SET content = %s WHERE id = %s", (content, message_id))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def delete_message_and_reply(message_id: int) -> bool:
    """Deletes a message and the next AI reply in sequence. Returns True if deleted."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get the message to find its session
    cursor.execute("SELECT session_id FROM messages WHERE id = %s", (message_id,))
    result = cursor.fetchone()
    if not result:
        conn.close()
        return False
    
    session_id = result[0]
    
    # Get all messages in order to find the next AI reply
    cursor.execute(
        "SELECT id, role FROM messages WHERE session_id = %s ORDER BY id",
        (session_id,)
    )
    messages = cursor.fetchall()
    
    # Find the index of the target message
    target_index = None
    for i, (id, role) in enumerate(messages):
        if id == message_id:
            target_index = i
            break
    
    if target_index is None:
        conn.close()
        return False
    
    # Delete the user message
    cursor.execute("DELETE FROM messages WHERE id = %s", (message_id,))
    
    # Delete the next AI reply if it exists
    if target_index + 1 < len(messages):
        next_id, next_role = messages[target_index + 1]
        if next_role == "assistant":
            cursor.execute("DELETE FROM messages WHERE id = %s", (next_id,))
    
    conn.commit()
    conn.close()
    return True


def delete_session(session_id: str):
    """Deletes a chat session and all associated messages from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE session_id = %s", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE session_id = %s", (session_id,))
    conn.commit()
    conn.close()


def rename_session(session_id: str, new_title: str):
    """Renames the title of a specific chat session in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE sessions SET title = %s WHERE session_id = %s", (new_title, session_id))
    conn.commit()
    conn.close()


def save_lab_result(test_type: str, value: str, unit: str, test_date: str,
                    reference_range: str = None, notes: str = None, user_id: str = None) -> int:
    """Save a lab result with encrypted value. Returns the new row ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    encrypted_value = encrypt_value(value)
    cursor.execute(
        """INSERT INTO lab_results (test_type, value, unit, reference_range, test_date, notes, created_at, user_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (test_type, encrypted_value, unit, reference_range, test_date, notes,
         datetime.now().strftime("%Y-%m-%d %H:%M"), user_id)
    )
    row_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return row_id


def get_lab_results(test_type: str = None, user_id: str = None):
    """Retrieve lab results with decrypted values. Optional filter by test_type and user_id."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT id, test_type, value, unit, reference_range, test_date, notes, created_at FROM lab_results"
    params = []
    conditions = []

    if user_id:
        conditions.append("user_id = %s")
        params.append(user_id)

    if test_type:
        conditions.append("test_type = %s")
        params.append(test_type)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY test_date ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        try:
            decrypted_value = decrypt_value(r[2])
        except Exception as e:
            print(f"[get_lab_results] Decryption failed for row {r[0]}: {e}")
            decrypted_value = "[decryption error]"
        results.append({
            "id": r[0], "test_type": r[1], "value": decrypted_value,
            "unit": r[3], "reference_range": r[4], "test_date": r[5],
            "notes": r[6], "created_at": r[7]
        })
    return results


def update_lab_result(row_id: int, **kwargs):
    """Update a lab result. Only provided fields are updated."""
    conn = get_db_connection()
    cursor = conn.cursor()
    allowed = {"test_type", "value", "unit", "reference_range", "test_date", "notes"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if "value" in updates:
        updates["value"] = encrypt_value(updates["value"])
    if not updates:
        conn.close()
        return
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [row_id]
    cursor.execute(f"UPDATE lab_results SET {set_clause} WHERE id = %s", values)
    conn.commit()
    conn.close()


def delete_lab_result(row_id: int):
    """Delete a lab result."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM lab_results WHERE id = %s", (row_id,))
    conn.commit()
    conn.close()


def save_treatment(drug_name: str, dosage_mg: int, start_date: str,
                   end_date: str = None, reason_for_change: str = None, user_id: str = None) -> int:
    """Save a treatment record. Returns the new row ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO treatments (drug_name, dosage_mg, start_date, end_date, reason_for_change, created_at, user_id)
           VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (drug_name, dosage_mg, start_date, end_date, reason_for_change,
         datetime.now().strftime("%Y-%m-%d %H:%M"), user_id)
    )
    row_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return row_id


def get_treatments(user_id: str = None):
    """Retrieve all treatments ordered by start_date. Optional filter by user_id."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT id, drug_name, dosage_mg, start_date, end_date, reason_for_change FROM treatments"
    params = []

    if user_id:
        query += " WHERE user_id = %s"
        params.append(user_id)

    query += " ORDER BY start_date ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": r[0], "drug_name": r[1], "dosage_mg": r[2], "start_date": r[3],
         "end_date": r[4], "reason_for_change": r[5]}
        for r in rows
    ]


def update_treatment(row_id: int, **kwargs):
    """Update a treatment record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    allowed = {"drug_name", "dosage_mg", "start_date", "end_date", "reason_for_change"}
    updates = {k: v for k, v in kwargs.items() if k in allowed and v is not None}
    if not updates:
        conn.close()
        return
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [row_id]
    cursor.execute(f"UPDATE treatments SET {set_clause} WHERE id = %s", values)
    conn.commit()
    conn.close()


def delete_treatment(row_id: int):
    """Delete a treatment record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM treatments WHERE id = %s", (row_id,))
    conn.commit()
    conn.close()


def delete_all_lab_data(user_id: str = None):
    """Delete all lab results, treatments, milestones, settings, checkup records, and sessions for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("DELETE FROM lab_results WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM treatments WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM milestones WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM user_settings WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM checkup_records WHERE user_id = %s", (user_id,))
        cursor.execute("SELECT session_id FROM sessions WHERE user_id = %s", (user_id,))
        session_ids = [row[0] for row in cursor.fetchall()]
        if session_ids:
            placeholders = ','.join(['%s'] * len(session_ids))
            cursor.execute(f"DELETE FROM messages WHERE session_id IN ({placeholders})", session_ids)
        cursor.execute("DELETE FROM sessions WHERE user_id = %s", (user_id,))
    else:
        cursor.execute("DELETE FROM lab_results")
        cursor.execute("DELETE FROM treatments")
        cursor.execute("DELETE FROM milestones")
        cursor.execute("DELETE FROM user_settings")
        cursor.execute("DELETE FROM checkup_records")
        cursor.execute("DELETE FROM messages")
        cursor.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()

    # Re-initialize default milestones
    conn = get_db_connection()
    cursor = conn.cursor()
    for m in ['ccyr', 'mmr', 'mr4', 'mr4_5']:
        if user_id:
            cursor.execute(
                "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement, user_id) VALUES (%s, 0, NULL, NULL, %s)",
                (m, user_id)
            )
        else:
            cursor.execute(
                "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (%s, 0, NULL, NULL)",
                (m,)
            )
    conn.commit()
    conn.close()


def save_milestone(milestone_type: str, achieved: bool, achieved_date: str = None,
                   value_at_achievement: str = None):
    """Save or update a milestone."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE milestones SET achieved = %s, achieved_date = %s, value_at_achievement = %s WHERE milestone_type = %s",
        (1 if achieved else 0, achieved_date, value_at_achievement, milestone_type)
    )
    if cursor.rowcount == 0:
        cursor.execute(
            "INSERT INTO milestones (milestone_type, achieved, achieved_date, value_at_achievement) VALUES (%s, %s, %s, %s)",
            (milestone_type, 1 if achieved else 0, achieved_date, value_at_achievement)
        )
    conn.commit()
    conn.close()


def get_milestones(user_id: str = None):
    """Retrieve all milestones. Optional filter by user_id."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT id, milestone_type, achieved, achieved_date, value_at_achievement FROM milestones"
    params = []

    if user_id:
        query += " WHERE user_id = %s"
        params.append(user_id)

    cursor.execute(query, params)
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE milestones SET achieved = %s, achieved_date = %s, value_at_achievement = %s WHERE milestone_type = %s",
        (1 if achieved else 0, achieved_date, value_at_achievement, milestone_type)
    )
    conn.commit()
    conn.close()


def save_checkup_record(checkup_date: str, doctor_advice: str = None,
                        medications_bought: str = None, medication_cost: str = None,
                        user_id: str = None) -> int:
    """Save a checkup record. Returns the new row ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO checkup_records (checkup_date, doctor_advice, medications_bought, medication_cost, created_at, user_id)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (checkup_date, doctor_advice, medications_bought, medication_cost,
         datetime.now().strftime("%Y-%m-%d %H:%M"), user_id)
    )
    row_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()
    return row_id


def get_checkup_records(user_id: str = None):
    """Retrieve all checkup records. Optional filter by user_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT id, checkup_date, doctor_advice, medications_bought, medication_cost, created_at FROM checkup_records WHERE user_id = %s ORDER BY checkup_date DESC", (user_id,))
    else:
        cursor.execute("SELECT id, checkup_date, doctor_advice, medications_bought, medication_cost, created_at FROM checkup_records ORDER BY checkup_date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {"id": r[0], "checkup_date": r[1], "doctor_advice": r[2],
         "medications_bought": r[3], "medication_cost": r[4], "created_at": r[5]}
        for r in rows
    ]


def update_checkup_record(record_id: int, checkup_date: str = None,
                          doctor_advice: str = None, medications_bought: str = None,
                          medication_cost: str = None):
    """Update a checkup record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    updates = {}
    if checkup_date is not None:
        updates["checkup_date"] = checkup_date
    if doctor_advice is not None:
        updates["doctor_advice"] = doctor_advice
    if medications_bought is not None:
        updates["medications_bought"] = medications_bought
    if medication_cost is not None:
        updates["medication_cost"] = medication_cost
    if updates:
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        cursor.execute(f"UPDATE checkup_records SET {set_clause} WHERE id = %s", (*updates.values(), record_id))
    conn.commit()
    conn.close()


def delete_checkup_record(record_id: int):
    """Delete a checkup record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM checkup_records WHERE id = %s", (record_id,))
    conn.commit()
    conn.close()


def get_setting(key: str, user_id: str = None) -> str | None:
    """Get a user setting by key. Optional filter by user_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT value FROM user_settings WHERE key = %s AND user_id = %s", (key, user_id))
    else:
        cursor.execute("SELECT value FROM user_settings WHERE key = %s", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None


def save_setting(key: str, value: str, user_id: str = None):
    """Save or update a user setting."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute(
            "INSERT INTO user_settings (key, value, user_id) VALUES (%s, %s, %s) ON CONFLICT (key, user_id) DO UPDATE SET value = EXCLUDED.value",
            (key, value, user_id)
        )
    else:
        cursor.execute(
            "INSERT INTO user_settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
            (key, value)
        )
    conn.commit()
    conn.close()
