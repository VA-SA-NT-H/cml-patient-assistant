import streamlit as st
import uuid
from database import delete_session, rename_session

def render_header():
    """Renders the top header area with title, temporary session toggle, theme toggle, and options menu."""
    
    # 1. Theme State Initialization
    if "theme" not in st.session_state:
        st.session_state.theme = "light"
    
    is_dark = st.session_state.theme == "dark"
    
    # 2. Custom CSS Styling with Theme-Aware Variables
    st.markdown(
        f"""
        <style>
        :root {{
            --bg-primary: {'#0f172a' if is_dark else '#f1f5f9'};
            --bg-secondary: {'#1e293b' if is_dark else '#ffffff'};
            --bg-tertiary: {'#334155' if is_dark else '#e2e8f0'};
            --text-primary: {'#f1f5f9' if is_dark else '#0f172a'};
            --text-secondary: {'#94a3b8' if is_dark else '#64748b'};
            --border: {'#334155' if is_dark else '#cbd5e1'};
            --accent: #ef4444;
            --accent-hover: #dc2626;
        }}
        
        .stApp {{
            background-color: var(--bg-primary) !important;
        }}
        
        .block-container {{
            padding-top: 1.5rem !important;
            padding-bottom: 0rem !important;
            max-width: 95% !important;
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
            transform: translateY(-1px) !important;
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
        
        div[data-testid="stButton"] button[kind="tertiary"] p,
        div[data-testid="stButton"] button[kind="tertiary"] span {{
            font-size: 26px !important;
            font-weight: bold !important;
            line-height: 1 !important;
            color: var(--text-primary) !important;
        }}
        div[data-testid="stButton"] button[kind="tertiary"]:hover {{
            color: var(--accent) !important;
        }}
        div[data-testid="stButton"] button[kind="tertiary"]:focus {{
            outline: 2px solid var(--accent) !important;
            outline-offset: 2px !important;
        }}
        
        div[data-testid="collapsedControl"] {{
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }}
        
        .theme-toggle-pill {{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 4px;
            border-radius: 24px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 80px;
        }}
        .theme-toggle-pill:hover {{
            border-color: var(--accent);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: scale(1.05);
        }}
        .theme-toggle-pill:active {{
            transform: scale(0.95);
        }}
        
        .theme-toggle-knob {{
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: {'#fbbf24' if is_dark else '#ffffff'};
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: transform 0.2s ease, background 0.3s ease;
            transform: translateX({'36px' if is_dark else '0px'});
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }}
        
        .theme-toggle-icon {{
            font-size: 14px;
            transition: opacity 0.2s ease;
        }}
        
        [data-testid="stChatMessage"] {{
            background-color: var(--bg-secondary) !important;
            border: 1px solid var(--border) !important;
            border-radius: 12px !important;
            padding: 16px !important;
            margin: 8px 0 !important;
        }}
        [data-testid="stChatMessage"]:hover {{
            border-color: var(--accent) !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }}
        
        div[data-testid="stChatInput"] {{
            background-color: var(--bg-secondary) !important;
            border: 1px solid var(--border) !important;
            border-radius: 12px !important;
        }}
        div[data-testid="stChatInput"]:focus-within {{
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 2px rgba(239,68,68,0.2) !important;
        }}
        div[data-testid="stChatInput"] input {{
            color: var(--text-primary) !important;
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
    if "show_header_options" not in st.session_state:
        st.session_state.show_header_options = False
    if "session_id" not in st.session_state:
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.chat_display = []
    if "is_temporary" not in st.session_state:
        st.session_state.is_temporary = False

    # 4. Render Header Layout
    col_title, col_toggle, col_actions = st.columns([4, 1.2, 2])

    with col_title:
        st.title("CML Patient Assistant")

    with col_toggle:
        st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)
        theme_icon = "☀️" if is_dark else "🌙"
        knob_style = "transform: translateX(36px);" if is_dark else "transform: translateX(0px);"
        st.markdown(
            f"""
            <div class="theme-toggle-pill" onclick="window.parent.document.querySelector('[data-testid=\"stSidebar\"]').click()">
                <div class="theme-toggle-knob" style="{knob_style}">
                    <span class="theme-toggle-icon">{theme_icon}</span>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
        if st.button("Toggle Theme", key="theme_toggle_btn", help="Switch between dark and light mode"):
            st.session_state.theme = "dark" if st.session_state.theme == "light" else "light"
            st.rerun()

    with col_actions:
        st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)
        col_temp, col_dots = st.columns([3, 1])
        
        with col_temp:
            if len(st.session_state.chat_display) == 0 or st.session_state.is_temporary:
                is_temp = st.toggle("🔒 Temporary", value=st.session_state.is_temporary, help="When active, history is not saved")
                if is_temp != st.session_state.is_temporary:
                    st.session_state.is_temporary = is_temp
                    st.session_state.session_id = f"temp_{uuid.uuid4()}" if is_temp else str(uuid.uuid4())
                    st.session_state.chat_display = []
                    st.session_state.show_header_options = False
                    st.rerun()

        with col_dots:
            if not st.session_state.is_temporary:
                if st.button("⋮", key="header_dots_btn", use_container_width=True, help="Toggle options", type="tertiary"):
                    st.session_state.show_header_options = not st.session_state.show_header_options
                    st.rerun()

    # Inline options container shown right below the header when active
    if st.session_state.show_header_options and not st.session_state.is_temporary:
        st.markdown(
            f"""
            <style>
            .options-container {{
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 12px;
                margin: 8px 0;
            }}
            </style>
            """,
            unsafe_allow_html=True
        )
        opt_col1, opt_col2, opt_col3 = st.columns([2.5, 0.8, 1.2])
        with opt_col1:
            new_title = st.text_input("Rename Chat", placeholder="New title...", label_visibility="collapsed")
        with opt_col2:
            if st.button("Save", key="header_save_name_btn", use_container_width=True):
                if new_title.strip():
                    rename_session(st.session_state.session_id, new_title.strip())
                    st.session_state.show_header_options = False
                    st.rerun()
        with opt_col3:
            if st.button("Delete Chat", key="header_del_chat_btn", use_container_width=True, type="primary"):
                delete_session(st.session_state.session_id)
                st.session_state.session_id = str(uuid.uuid4())
                st.session_state.chat_display = []
                st.session_state.is_temporary = False
                st.session_state.show_header_options = False
                st.rerun()
