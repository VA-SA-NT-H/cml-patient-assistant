# CML Patient Assistant (TKI Side Effect Navigator)

A Streamlit-based web application and intelligent ReAct agent designed to help Chronic Myeloid Leukemia (CML) patients navigate Tyrosine Kinase Inhibitor (TKI) side effects, food/dietary interactions, and medical guidelines.

## Features

- **TKI Info Lookup:** Instantly access common side effects and clinical "red flags" (symptoms requiring immediate medical attention) for all major TKIs (Imatinib, Dasatinib, Nilotinib, Bosutinib, Ponatinib, and Asciminib).
- **Dietary Restrictions & Food Interactions:** Retrieve crucial rules regarding food intake (e.g., fasting/meals requirements, antacid timing, and food/supplement exclusions like grapefruit or St. John's Wort).
- **RAG-based Medical Guidelines Search:** Queries an embedded vector store populated with official medical guidelines (`cml_guide.pdf`) using ChromaDB.
- **Streamlined Patient UI:** A clean, simplified chat interface that hides complex agent reasoning (tool calls and thinking cycles) to deliver clean, direct medical assistant responses.

---

## Project Structure

```
├── agent/
│   ├── .env                       # API key and model configuration
│   ├── agent.py                   # ReAct Agent logic & CLI interface
│   ├── chroma_db/                 # Persistent Chroma DB directory (vector store)
│   └── tools/                     # Modular package containing all tools
│       ├── __init__.py            # Exposes all tool functions
│       ├── tki_info.py            # lookup_tki_info (side effects & red flags)
│       ├── food_rules.py          # lookup_food_interactions (dietary restrictions)
│       ├── rag_search.py          # search_medical_guidelines (RAG search tool)
│       └── wiki_search.py         # search_wikipedia (Wikipedia fallback)
├── app.py                         # Streamlit web application
├── cml_guide.pdf                  # Reference PDF guidelines
├── requirements.txt               # Project dependencies
└── README.md                      # Documentation
```

---

## Setup Instructions

### 1. Install Dependencies
Make sure you have Python 3.9+ installed, then run:
```bash
pip install -r requirements.txt
```

### 2. Configure API Key and Model
Create or edit the `.env` file inside the `agent` folder and configure your Gemini API Key and model name:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemma-4
```

### 3. Ingest Guidelines PDF
To load and index the medical guidelines (`cml_guide.pdf`) into the Chroma vector database, run:
```bash
python agent/tools/rag_search.py
```
*(This splits the PDF into text chunks, generates vector embeddings, and persists them locally inside the `agent/chroma_db` directory).*

---

## Running the Application

### Option A: Streamlit Web UI (Recommended)
Start the web interface using:
```bash
streamlit run app.py
```
Open `http://localhost:8501` in your browser to interact with the assistant.

### Option B: CLI Interactive Chat
You can also run the agent interface directly in the command line:
```bash
python agent/agent.py
```
