import os
import json
import logging
import math
from typing import List, Optional
from PyPDF2 import PdfReader
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# In-memory fallback cache if database is not configured
_MEMORY_CHUNKS: List[str] = []


def _get_embedding(text: str) -> Optional[List[float]]:
    """Generate text embedding using Gemini API (text-embedding-004)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text
        )
        if response and hasattr(response, "embedding") and response.embedding:
            return response.embedding.values
        if response and hasattr(response, "embeddings") and response.embeddings:
            return response.embeddings[0].values
    except Exception as e:
        logger.warning(f"Gemini embed_content failed: {e}")
    return None


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def init_vector_table():
    """Ensure medical_guidelines table exists in PostgreSQL / Supabase if DATABASE_URL is set."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        return
    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        # Enable pgvector if extension is available, else store embedding as json/text or vector
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS medical_guidelines (
                    id SERIAL PRIMARY KEY,
                    chunk_text TEXT NOT NULL,
                    embedding vector(768)
                );
            """)
            conn.commit()
        except Exception as ext_err:
            conn.rollback()
            # If pgvector extension is not installed or permitted, use jsonb for embedding
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS medical_guidelines (
                    id SERIAL PRIMARY KEY,
                    chunk_text TEXT NOT NULL,
                    embedding_json JSONB
                );
            """)
            conn.commit()
        cursor.close()
        conn.close()
        logger.info("Initialized medical_guidelines table in PostgreSQL.")
    except Exception as e:
        logger.warning(f"Could not initialize PostgreSQL vector table: {e}")


def ingest_pdf(file_path: str):
    """Chunk the PDF, calculate embeddings, and store in PostgreSQL/Supabase or memory."""
    global _MEMORY_CHUNKS
    if not os.path.exists(file_path):
        logger.warning(f"PDF not found at {file_path}")
        return

    logger.info(f"Reading {file_path} for guideline ingestion...")
    reader = PdfReader(file_path)
    chunks = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            # Split every 1000 characters
            for i in range(0, len(text), 1000):
                chunk = text[i:i+1000].strip()
                if chunk:
                    chunks.append(chunk)

    _MEMORY_CHUNKS = chunks

    db_url = os.environ.get("DATABASE_URL")
    if db_url and chunks:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()
            init_vector_table()

            # Check if pgvector column or json column exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'medical_guidelines' AND column_name = 'embedding';
            """)
            has_vector_col = bool(cursor.fetchone())

            # Check existing count
            cursor.execute("SELECT COUNT(*) FROM medical_guidelines;")
            count = cursor.fetchone()[0]
            if count == 0:
                logger.info(f"Inserting {len(chunks)} guideline chunks into PostgreSQL...")
                for chunk in chunks:
                    emb = _get_embedding(chunk)
                    if has_vector_col and emb:
                        cursor.execute(
                            "INSERT INTO medical_guidelines (chunk_text, embedding) VALUES (%s, %s::vector);",
                            (chunk, emb)
                        )
                    else:
                        cursor.execute(
                            "INSERT INTO medical_guidelines (chunk_text, embedding_json) VALUES (%s, %s);",
                            (chunk, json.dumps(emb) if emb else None)
                        )
                conn.commit()
                logger.info("PDF guidelines successfully stored in PostgreSQL.")
            cursor.close()
            conn.close()
        except Exception as e:
            logger.warning(f"PostgreSQL ingestion failed: {e}")


def warm_up_embedding_model():
    """No local model weights to download since we use cloud embeddings."""
    pass


def ensure_pdf_ingested():
    """Ingest the CML PDF if guidelines are not already loaded."""
    pdf_filename = "cml_guide.pdf"
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", pdf_filename)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", pdf_filename)),
        os.path.join(os.getcwd(), pdf_filename),
    ]

    target_path = None
    for path in candidates:
        if os.path.exists(path):
            target_path = path
            break

    if target_path:
        ingest_pdf(target_path)
    else:
        logger.warning(f"PDF not found at any candidate paths: {candidates}")


def search_medical_guidelines(search_query: str) -> str:
    """Tool used by the agent to search CML guidelines via pgvector or semantic search."""
    db_url = os.environ.get("DATABASE_URL")
    query_emb = _get_embedding(search_query)

    # 1. Try PostgreSQL / Supabase pgvector search
    if db_url and query_emb:
        try:
            import psycopg2
            conn = psycopg2.connect(db_url)
            cursor = conn.cursor()

            # Check if pgvector column exists
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'medical_guidelines' AND column_name = 'embedding';
            """)
            has_vector_col = bool(cursor.fetchone())

            if has_vector_col:
                cursor.execute("""
                    SELECT chunk_text 
                    FROM medical_guidelines 
                    ORDER BY embedding <=> %s::vector 
                    LIMIT 2;
                """, (query_emb,))
                rows = cursor.fetchall()
                cursor.close()
                conn.close()
                if rows:
                    retrieved_text = "\n...\n".join([r[0] for r in rows])
                    return json.dumps({"source": "PDF Guidelines", "relevant_text": retrieved_text})
            else:
                # Fallback to jsonb cosine similarity in python
                cursor.execute("SELECT chunk_text, embedding_json FROM medical_guidelines;")
                rows = cursor.fetchall()
                cursor.close()
                conn.close()
                if rows:
                    scored = []
                    for text, emb_json in rows:
                        if emb_json:
                            sim = _cosine_similarity(query_emb, emb_json)
                            scored.append((sim, text))
                    scored.sort(key=lambda x: x[0], reverse=True)
                    top_chunks = [item[1] for item in scored[:2]]
                    if top_chunks:
                        return json.dumps({"source": "PDF Guidelines", "relevant_text": "\n...\n".join(top_chunks)})
        except Exception as e:
            logger.warning(f"PostgreSQL guideline search failed: {e}")

    # 2. In-memory fallback if DB unavailable
    if not _MEMORY_CHUNKS:
        ensure_pdf_ingested()

    if _MEMORY_CHUNKS:
        # Simple keyword / token overlap matching if embeddings unavailable
        keywords = search_query.lower().split()
        scored = []
        for chunk in _MEMORY_CHUNKS:
            score = sum(1 for kw in keywords if kw in chunk.lower())
            scored.append((score, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [item[1] for item in scored[:2] if item[0] > 0]
        if not top_chunks:
            top_chunks = _MEMORY_CHUNKS[:2]
        return json.dumps({"source": "PDF Guidelines", "relevant_text": "\n...\n".join(top_chunks)})

    return json.dumps({"error": "No relevant information found in the PDF."})
