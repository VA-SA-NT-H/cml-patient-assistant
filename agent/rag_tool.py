import chromadb
from PyPDF2 import PdfReader
import json

import os

# 1. Setup local Vector Database
# This creates a folder called 'chroma_db' in your project to save the data permanently
db_path = os.path.join(os.path.dirname(__file__), "chroma_db")
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
    # Chroma automatically converts the text to vector embeddings behind the scenes!
    collection.add(
        documents=chunks,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )
    print("Done! PDF ingested.")

# 4. THE NEW AGENT TOOL
def search_medical_guidelines(search_query: str) -> str:
    """The tool our Agent will use to search the PDF."""
    
    # Search the database for the most mathematically relevant paragraphs
    results = collection.query(
        query_texts=[search_query],
        n_results=2 # Return the top 2 most relevant chunks
    )
    
    # Format the chunks into a JSON string for the agent to read
    if results['documents'] and results['documents'][0]:
        retrieved_text = "\n...\n".join(results['documents'][0])
        return json.dumps({"source": "PDF Guidelines", "relevant_text": retrieved_text})
    
    return json.dumps({"error": "No relevant information found in the PDF."})

# Run this script directly to ingest your PDF!
if __name__ == "__main__":
    # Resolve pdf path dynamically by searching current, parent, and script directories
    pdf_filename = "cml_guide.pdf"
    target_path = pdf_filename
    if not os.path.exists(target_path):
        # Check parent directory (if run from agent/)
        parent_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", pdf_filename))
        if os.path.exists(parent_path):
            target_path = parent_path
        else:
            # Check script's directory
            local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), pdf_filename))
            if os.path.exists(local_path):
                target_path = local_path
                
    ingest_pdf(target_path)