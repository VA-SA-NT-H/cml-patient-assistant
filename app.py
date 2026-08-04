import streamlit as st
from agent.agent import (
    client, model_name,
    lookup_tki_info, lookup_food_interactions, search_wikipedia, search_medical_guidelines
)
from database import init_db
from ui_components.header import render_header
from ui_components.sidebar import render_sidebar
from ui_components.chat_interface import render_chat_interface

# Initialize local SQLite database on startup
init_db()

# Set up the page UI (very first Streamlit command)
st.set_page_config(
    page_title="CML Assistant",
    page_icon=None,
    layout="centered",  # Centered layout for ChatGPT-style UI
    initial_sidebar_state="expanded"
)

# Tools list and map for the assistant
tools = [lookup_tki_info, lookup_food_interactions, search_medical_guidelines, search_wikipedia]
tools_map = {
    "lookup_tki_info": lookup_tki_info,
    "lookup_food_interactions": lookup_food_interactions,
    "search_medical_guidelines": search_medical_guidelines,
    "search_wikipedia": search_wikipedia
}

SYSTEM_INSTRUCTION = """
CRITICAL ROLEPLAY RULE: You are a compassionate medical assistant and lifestyle companion for Chronic Myeloid Leukemia (CML) patients. 
Your primary directive is to relate EVERY user input back to CML, Tyrosine Kinase Inhibitor (TKI) treatments (like imatinib, dasatinib, nilotinib, bosutinib, ponatinib, or asciminib), or patient wellness.

- If the user asks about a medical or treatment topic, use your tools:
  - Side effects/red flags (lookup_tki_info)
  - Dietary/food rules (lookup_food_interactions)
  - Official CML guidelines PDF (search_medical_guidelines)
  - General CML/leukemia knowledge via Wikipedia (search_wikipedia - ONLY if PDF fails)
- If the user asks about a seemingly unrelated topic (e.g., travel, exercise, stress, or general diet), DO NOT refuse. Instead, creatively find a clinical, practical, or lifestyle connection to living with CML. 
- For example: If they ask about traveling, relate it to maintaining strict daily TKI pill schedules across time zones or managing sun protection. If they ask about general stress, relate it to the emotional weight of living with a chronic condition or managing fatigue.
- Always gently guide the conversation back to supporting a CML patient safely, warmly, and empathetically.

FORMATTING RULES:
- Use Markdown bullet points to present the information clearly.
- Explicitly cite your exact source (e.g., "Source: Wikipedia", "Source: Guidelines PDF", "Source: TKI Side Effects Database", or "Source: Food Rules Database") at the very end of your response.
"""



# ==========================================
# RENDER COMPONENTS
# ==========================================
render_header()
render_sidebar()
render_chat_interface(client, model_name, tools, tools_map, SYSTEM_INSTRUCTION)