import streamlit as st
import uuid
from database import get_all_sessions, get_session_messages, delete_session, rename_session

def render_sidebar():
    """Renders the chat history sidebar and handles session switching/deletion/renaming/creation."""
    
    # Auto-detect system theme on first load
    if "theme" not in st.session_state:
        st.session_state.theme = "dark"  # Default to dark like ChatGPT
    
    # Theme-aware sidebar styling
    st.sidebar.markdown(
        """
        <style>
        [data-testid="stSidebar"] .stButton button {
            background-color: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
            transition: all 0.2s ease !important;
        }
        [data-testid="stSidebar"] .stButton button:hover {
            background-color: var(--border) !important;
            border-color: var(--accent) !important;
        }
        [data-testid="stSidebar"] .stButton button:focus {
            outline: 2px solid var(--accent) !important;
            outline-offset: 2px !important;
        }
        [data-testid="stSidebar"] .stTextInput input {
            background-color: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
        }
        [data-testid="stSidebar"] .stTextInput input:focus {
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 2px rgba(139,92,246,0.2) !important;
        }
        [data-testid="stSidebar"] label {
            color: var(--text-primary) !important;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    
    st.sidebar.title("History")

    if st.sidebar.button("New Chat", use_container_width=True, help="Start a new chat"):
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.chat_display = []
        st.session_state.is_temporary = False
        st.rerun()

    # Load past sessions from local SQLite DB
    past_sessions = get_all_sessions()
    for sess_id, title, created_at in past_sessions:
        is_active = st.session_state.session_id == sess_id
        
        # Session item container
        col_session, col_actions = st.sidebar.columns([6, 1])
        
        with col_session:
            # Session button with active state
            if st.button(
                f"{'→ ' if is_active else ''}{title}",
                key=sess_id,
                use_container_width=True,
                help=f"Load chat: {title}"
            ):
                st.session_state.session_id = sess_id
                st.session_state.chat_display = get_session_messages(sess_id)
                st.session_state.is_temporary = False
                st.rerun()
        
        with col_actions:
            # Edit button (pencil icon)
            if st.button("✏️", key=f"edit_{sess_id}", help=f"Rename: {title}"):
                st.session_state[f"renaming_{sess_id}"] = True
                st.rerun()
            
            # Delete button (trash icon)
            if st.button("🗑️", key=f"del_{sess_id}", help=f"Delete: {title}"):
                delete_session(sess_id)
                if st.session_state.session_id == sess_id:
                    st.session_state.session_id = str(uuid.uuid4())
                    st.session_state.chat_display = []
                    st.session_state.is_temporary = False
                st.rerun()
        
        # Inline rename mode
        if st.session_state.get(f"renaming_{sess_id}", False):
            new_title = st.sidebar.text_input(
                "Rename",
                value=title,
                key=f"ren_input_{sess_id}",
                label_visibility="collapsed"
            )
            col_save, col_cancel = st.sidebar.columns(2)
            with col_save:
                if st.button("✓ Save", key=f"ren_save_{sess_id}", use_container_width=True):
                    if new_title.strip():
                        rename_session(sess_id, new_title.strip())
                    st.session_state[f"renaming_{sess_id}"] = False
                    st.rerun()
            with col_cancel:
                if st.button("✕ Cancel", key=f"ren_cancel_{sess_id}", use_container_width=True):
                    st.session_state[f"renaming_{sess_id}"] = False
                    st.rerun()
    
    # Theme toggle at sidebar footer - ALWAYS at bottom (sticky)
    st.sidebar.markdown(
        """
        <style>
        .theme-toggle-fixed {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 300px;
            padding: 16px;
            background: var(--bg-secondary);
            z-index: 999;
            border-top: 1px solid var(--border);
        }
        </style>
        """,
        unsafe_allow_html=True
    )
    
    # Create a container for the theme toggle
    st.sidebar.markdown('<div class="theme-toggle-fixed">', unsafe_allow_html=True)
    
    is_dark = st.session_state.theme == "dark"
    theme_label = "🌙 Dark" if is_dark else "☀️ Light"
    
    if st.sidebar.button(theme_label, key="theme_toggle_sidebar", help="Toggle theme", use_container_width=True):
        st.session_state.theme = "dark" if st.session_state.theme == "light" else "light"
        st.rerun()
    
    st.sidebar.markdown('</div>', unsafe_allow_html=True)
