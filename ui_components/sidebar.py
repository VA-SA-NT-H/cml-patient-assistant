import streamlit as st
import uuid
from database import get_all_sessions, get_session_messages, delete_session, rename_session

def render_sidebar():
    """Renders the chat history sidebar and handles session switching/deletion/renaming/creation."""
    
    # Theme-aware sidebar styling
    st.sidebar.markdown(
        f"""
        <style>
        [data-testid="stSidebar"] .stButton button {{
            background-color: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
            transition: all 0.2s ease !important;
        }}
        [data-testid="stSidebar"] .stButton button:hover {{
            background-color: var(--border) !important;
            border-color: var(--accent) !important;
        }}
        [data-testid="stSidebar"] .stButton button:focus {{
            outline: 2px solid var(--accent) !important;
            outline-offset: 2px !important;
        }}
        [data-testid="stSidebar"] .stTextInput input {{
            background-color: var(--bg-tertiary) !important;
            color: var(--text-primary) !important;
            border: 1px solid var(--border) !important;
        }}
        [data-testid="stSidebar"] .stTextInput input:focus {{
            border-color: var(--accent) !important;
            box-shadow: 0 0 0 2px rgba(239,68,68,0.2) !important;
        }}
        [data-testid="stSidebar"] hr {{
            border-color: var(--border) !important;
        }}
        [data-testid="stSidebar"] label {{
            color: var(--text-primary) !important;
        }}
        </style>
        """,
        unsafe_allow_html=True
    )
    
    st.sidebar.title("History")

    if st.sidebar.button("New Chat", use_container_width=True, help="Start a new chat"):
        st.session_state.session_id = str(uuid.uuid4())
        st.session_state.chat_display = []
        st.session_state.is_temporary = False
        st.session_state.show_header_options = False
        st.rerun()

    # Load past sessions from local SQLite DB
    past_sessions = get_all_sessions()
    for sess_id, title, created_at in past_sessions:
        # Create columns to fit the select button and the options button side-by-side
        col_btn, col_dots = st.sidebar.columns([6, 1.5])
        
        with col_btn:
            if st.button(f"{title}", key=sess_id, use_container_width=True, help=f"Load chat: {title}"):
                st.session_state.session_id = sess_id
                st.session_state.chat_display = get_session_messages(sess_id)
                st.session_state.is_temporary = False
                st.session_state.show_header_options = False
                st.rerun()
                
        with col_dots:
            # 3-dots options menu toggle button (tertiary/borderless)
            if st.button("⋮", key=f"dots_{sess_id}", use_container_width=True, help=f"Options for {title}", type="tertiary"):
                st.session_state[f"show_options_{sess_id}"] = not st.session_state.get(f"show_options_{sess_id}", False)
                st.rerun()
                
        # Inline options shown under the chat item if toggled active
        if st.session_state.get(f"show_options_{sess_id}", False):
            new_title = st.sidebar.text_input("Rename", value=title, key=f"ren_input_{sess_id}", label_visibility="collapsed")
            col_save, col_del = st.sidebar.columns(2)
            with col_save:
                if st.button("Save", key=f"ren_save_{sess_id}", use_container_width=True, help="Save new title"):
                    if new_title.strip():
                        rename_session(sess_id, new_title.strip())
                        st.session_state[f"show_options_{sess_id}"] = False
                        st.rerun()
            with col_del:
                if st.button("Delete", key=f"del_btn_{sess_id}", use_container_width=True, type="primary", help=f"Delete chat: {title}"):
                    delete_session(sess_id)
                    # If deleted session is the currently active one, automatically load a new chat session
                    if st.session_state.session_id == sess_id:
                        st.session_state.session_id = str(uuid.uuid4())
                        st.session_state.chat_display = []
                        st.session_state.is_temporary = False
                    st.session_state[f"show_options_{sess_id}"] = False
                    st.rerun()
            # Visual separator between historical items
            st.sidebar.markdown("---")
