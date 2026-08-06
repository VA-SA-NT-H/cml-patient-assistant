import chromadb
from PyPDF2 import PdfReader
import json
import os
import logging

logger = logging.getLogger(__name__)

# 1. Setup local Vector Database
# Resolved relative to this file: agent/tools/ -> agent/chroma_db
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "chroma_db"))
chroma_client = chromadb.PersistentClient(path=db_path)
collection = chroma_client.get_or_create_collection(name="medical_guidelines")

def ingest_pdf(file_path: str):
    """Run this function ONCE to chop up the PDF and save it to the database."""
    print(f"Reading {file_path}...")
    reader = PdfReader(file_path)
    
    chunks = []
    # 2. Extract and Chunk the text
    for page in reader.pages:
        text = page.extract_text()
        if text:
            # Very simple chunking: split every 1000 characters
            for i in range(0, len(text), 1000):
                chunks.append(text[i:i+1000])
            
    print(f"Created {len(chunks)} chunks. Embedding and saving to database... (This may take a minute)")
    
    # 3. Save to Vector DB
    collection.add(
        documents=chunks,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )
    print("Done! PDF ingested.")


def warm_up_embedding_model():
    """Pre-download the ChromaDB embedding model so first queries aren't slow."""
    try:
        count = collection.count()
        if count == 0:
            # Empty collection - embedding model hasn't been loaded yet
            # Force a dummy query to trigger model download
            logger.info("Pre-downloading ChromaDB embedding model (one-time, ~80MB)...")
            collection.query(query_texts=["dummy"], n_results=1)
            logger.info("Embedding model downloaded and cached.")
        else:
            logger.info(f"ChromaDB collection has {count} chunks, embedding model already loaded.")
    except Exception as e:
        logger.warning(f"Failed to pre-download embedding model: {e}")


def ensure_pdf_ingested():
    """Ingest the CML PDF into ChromaDB if the collection is empty."""
    count = collection.count()
    if count > 0:
        logger.info(f"ChromaDB already has {count} chunks, skipping ingestion.")
        return
    
    # Search for PDF file
    pdf_filename = "cml_guide.pdf"
    target_path = None
    
    # Check multiple locations
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", pdf_filename)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", pdf_filename)),
        os.path.join(os.getcwd(), pdf_filename),
    ]
    
    for path in candidates:
        if os.path.exists(path):
            target_path = path
            break
    
    if target_path:
        logger.info(f"Ingesting PDF from {target_path} into ChromaDB...")
        ingest_pdf(target_path)
    else:
        logger.warning(f"PDF not found at any of: {candidates}. RAG search will have no data.")

def search_medical_guidelines(search_query: str) -> str:
    """The tool our Agent will use to search the PDF."""
    results = collection.query(
        query_texts=[search_query],
        n_results=2 # Return the top 2 most relevant chunks
    )
    
    # Format the chunks into a JSON string for the agent to read
    if results['documents'] and results['documents'][0]:
        retrieved_text = "\n...\n".join(results['documents'][0])
        return json.dumps({"source": "PDF Guidelines", "relevant_text": retrieved_text})
    
    return json.dumps({"error": "No relevant information found in the PDF."})

if __name__ == "__main__":
    # Resolve pdf path dynamically by searching current, parent, and root directories
    pdf_filename = "cml_guide.pdf"
    target_path = pdf_filename
    if not os.path.exists(target_path):
        # Check parent directories (from agent/tools/ -> agent/ -> root)
        parent_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", pdf_filename))
        if os.path.exists(parent_path):
            target_path = parent_path
        else:
            # Check script's parent directory (agent/)
            local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", pdf_filename))
            if os.path.exists(local_path):
                target_path = local_path
                
    ingest_pdf(target_path)
