import streamlit as st
import uuid

def render_header():
    """Renders the minimal header area with centered title."""
    
    # 1. Theme State Initialization
    if "theme" not in st.session_state:
        st.session_state.theme = "light"
    
    is_dark = st.session_state.theme == "dark"
    
    # 2. Custom CSS Styling with Theme-Aware Variables
    st.markdown(
        f"""
        <style>
        :root {{
            --bg-primary: {'#212121' if is_dark else '#f5f5f5'};
            --bg-secondary: {'#171717' if is_dark else '#f0f0f0'};
            --bg-tertiary: {'#2f2f2f' if is_dark else '#e8e8e8'};
            --text-primary: {'#ececec' if is_dark else '#1a1a1a'};
            --text-secondary: {'#8e8e8e' if is_dark else '#6b6b6b'};
            --border: {'#424242' if is_dark else '#d0d0d0'};
            --accent: #8b5cf6;
            --accent-hover: #7c3aed;
        }}
        
        .stApp {{
            background-color: var(--bg-primary) !important;
        }}
        
        .block-container {{
            padding-top: 1rem !important;
            padding-bottom: 0rem !important;
            max-width: 100% !important;
        }}
        div[data-testid="stVerticalBlock"] > div:first-child {{
            margin-top: 0rem !important;
        }}
        
        h1, h2, h3, h4, h5, h6 {{
            color: var(--text-primary) !important;
        }}
        
        p, span, li, label {{
            color: var(--text-primary) !important;
        }}
        
        div[data-testid="stButton"] button[kind="primary"] {{
            background-color: var(--accent) !important;
            color: white !important;
            border-color: var(--accent) !important;
            transition: all 0.2s ease !important;
        }}
        div[data-testid="stButton"] button[kind="primary"]:hover {{
            background-color: var(--accent-hover) !important;
            border-color: var(--accent-hover) !important;
            color: white !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
        }}
        div[data-testid="stButton"] button[kind="primary"]:focus {{
            outline: 2px solid var(--accent) !important;
            outline-offset: 2px !important;
        }}
        
        div[data-testid="stButton"] button[kind="secondary"] {{
            background-color: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
            transition: all 0.2s ease !important;
        }}
        div[data-testid="stButton"] button[kind="secondary"]:hover {{
            background-color: var(--border) !important;
        }}
        
        div[data-testid="stButton"] button {{
            transition: all 0.2s ease !important;
        }}
        div[data-testid="stButton"] button:focus {{
            outline: 2px solid var(--accent) !important;
            outline-offset: 2px !important;
        }}
        
        div[data-testid="collapsedControl"] {{
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }}
        
        [data-testid="stChatMessage"] {{
            background-color: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 16px !important;
            margin: 0 !important;
        }}
        
        div[data-testid="stChatInput"] {{
            background-color: var(--bg-tertiary) !important;
            border: 1px solid var(--border) !important;
            border-radius: 24px !important;
            transition: all 0.3s ease !important;
        }}
        div[data-testid="stChatInput"]:focus-within {{
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2) !important;
        }}
        div[data-testid="stChatInput"] input {{
            color: var(--text-primary) !important;
            background-color: transparent !important;
        }}
        div[data-testid="stChatInput"] input::placeholder {{
            color: var(--text-secondary) !important;
        }}
        
        [data-testid="stSidebar"] {{
            background-color: var(--bg-secondary) !important;
        }}
        [data-testid="stSidebar"] h1 {{
            color: var(--text-primary) !important;
        }}
        [data-testid="stSidebar"] p {{
            color: var(--text-primary) !important;
        }}
        
        .stAlert {{
            background-color: var(--bg-secondary) !important;
            border: 1px solid var(--border) !important;
            color: var(--text-primary) !important;
        }}
        
        [data-testid="stStatusWidget"] {{
            background-color: var(--bg-tertiary) !important;
            border: 1px solid var(--border) !important;
        }}
        
        [data-testid="stSpinner"] {{
            color: var(--text-primary) !important;
        }}
        
        hr {{
            border-color: var(--border) !important;
        }}
        
        .stApp, .stApp * {{
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
        }}
        </style>
        """,
        unsafe_allow_html=True
    )

    # 3. Session State Initialization
    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.chat_display = []
    if "is_temporary" not in st.session_state:
        st.session_state.is_temporary = False

    # 4. Render Header Layout - minimal, title only
    st.markdown(
        f"""
        <style>
        header[data-testid="stHeader"] {{
            background-color: var(--bg-primary) !important;
        }}
        </style>
        """,
        unsafe_allow_html=True
    )
