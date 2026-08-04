# ChatGPT-Style UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the CML Patient Assistant UI to match ChatGPT's clean, minimal aesthetic with auto-detect theme support.

**Architecture:** Refactor existing Streamlit components (header, sidebar, chat_interface) to adopt ChatGPT's layout patterns. CSS variables update to ChatGPT color palette. Theme toggle moves to sidebar footer. Session management uses hover-to-reveal icons. Empty state gets suggestion chips.

**Tech Stack:** Python 3.x, Streamlit 1.60.0, SQLite, CSS custom properties

## Global Constraints

- Python 3.x, Streamlit 1.60.0
- Keep existing Gemini API integration unchanged
- Keep existing database schema unchanged
- Purple accent: `#8b5cf6` / `#7c3aed`
- All CSS via `st.markdown(unsafe_allow_html=True)` — no external CSS files

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app.py` | Page config, system instruction, render calls (minimal changes) |
| `ui_components/header.py` | Minimal header (title only), global CSS variables |
| `ui_components/sidebar.py` | Session list, hover actions, temporary toggle, theme toggle |
| `ui_components/chat_interface.py` | Empty state with chips, borderless messages, chat input |

---

### Task 1: Update CSS Variables & Global Styles

**Files:**
- Modify: `ui_components/header.py:15-153` (CSS block)

**Interfaces:**
- Consumes: none
- Produces: CSS variables used by all components (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--text-primary`, `--text-secondary`, `--border`, `--accent`)

- [ ] **Step 1: Replace the CSS variables block in header.py**

Replace the `:root` variables section (lines 18-27) with ChatGPT-inspired colors:

```python
:root {{
    --bg-primary: {'#212121' if is_dark else '#ffffff'};
    --bg-secondary: {'#171717' if is_dark else '#f9f9f9'};
    --bg-tertiary: {'#2f2f2f' if is_dark else '#ffffff'};
    --text-primary: {'#ececec' if is_dark else '#1a1a1a'};
    --text-secondary: {'#8e8e8e' if is_dark else '#6b6b6b'};
    --border: {'#424242' if is_dark else '#e5e5e5'};
    --accent: #8b5cf6;
    --accent-hover: #7c3aed;
}}
```

- [ ] **Step 2: Update block-container max-width**

Change `max-width: 95% !important;` to `max-width: 100% !important;` (ChatGPT uses full width, messages are centered separately).

- [ ] **Step 3: Update chat message CSS**

Replace the `[data-testid="stChatMessage"]` CSS block to remove borders and hover effects:

```css
[data-testid="stChatMessage"] {
    background-color: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 16px !important;
    margin: 0 !important;
}
```

- [ ] **Step 4: Update chat input CSS**

Replace `div[data-testid="stChatInput"]` CSS to match ChatGPT's pill-shaped input:

```css
div[data-testid="stChatInput"] {
    background-color: var(--bg-tertiary) !important;
    border: 1px solid var(--border) !important;
    border-radius: 24px !important;
}
div[data-testid="stChatInput"]:focus-within {
    border-color: var(--text-secondary) !important;
    box-shadow: 0 0 0 1px var(--text-secondary) !important;
}
```

- [ ] **Step 5: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/header.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 6: Commit**

```bash
git add ui_components/header.py
git commit -m "style: update CSS variables to ChatGPT color palette"
```

---

### Task 2: Gut Header to Minimal (Title Only)

**Files:**
- Modify: `ui_components/header.py:155-260` (all Python logic after CSS)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: `render_header()` function that only renders a centered title

- [ ] **Step 1: Remove theme toggle code from header.py**

Delete lines 170-206 (the entire `with col_toggle:` block and its CSS).

- [ ] **Step 2: Remove temporary toggle and dots menu from header.py**

Delete lines 208-226 (the entire `with col_actions:` block).

- [ ] **Step 3: Remove inline options container from header.py**

Delete lines 228-260 (the `show_header_options` block).

- [ ] **Step 4: Update session state initialization**

Remove `show_header_options` initialization (line 156-157). Keep `session_id`, `chat_display`, `is_temporary` initialization.

- [ ] **Step 5: Simplify header layout**

Replace the 3-column layout with a single centered title:

```python
# 4. Render Header Layout - minimal, title only
st.markdown(
    f"""
    <style>
    .block-container {{
        padding-top: 1rem !important;
        padding-bottom: 0rem !important;
    }}
    header[data-testid="stHeader"] {{
        background-color: var(--bg-primary) !important;
    }}
    </style>
    """,
    unsafe_allow_html=True
)
```

- [ ] **Step 6: Add centered title using st.title**

```python
# Display centered title
if st.session_state.get("chat_display"):
    # Show session title if available (first user message truncated)
    title_text = st.session_state.chat_display[0]["content"][:40] + "..." if len(st.session_state.chat_display) > 0 and len(st.session_state.chat_display[0]["content"]) > 40 else (st.session_state.chat_display[0]["content"] if st.session_state.get("chat_display") else "New Chat")
else:
    title_text = "New Chat"

st.markdown(
    f"""
    <div style="text-align: center; padding: 8px 0;">
        <h3 style="margin: 0; color: var(--text-primary); font-weight: 500;">{title_text}</h3>
    </div>
    """,
    unsafe_allow_html=True
)
```

- [ ] **Step 7: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/header.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 8: Commit**

```bash
git add ui_components/header.py
git commit -m "refactor: simplify header to title-only layout"
```

---

### Task 3: Add Theme Toggle to Sidebar Footer

**Files:**
- Modify: `ui_components/sidebar.py:5-91`

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Theme toggle in sidebar footer, auto-detect on first load

- [ ] **Step 1: Add auto-detect logic at top of render_sidebar**

```python
def render_sidebar():
    """Renders the chat history sidebar and handles session switching/deletion/renaming/creation."""
    
    # Auto-detect system theme on first load
    if "theme" not in st.session_state:
        st.session_state.theme = "dark"  # Default to dark like ChatGPT
```

- [ ] **Step 2: Add theme toggle CSS to sidebar**

Add CSS for the theme toggle at the bottom of the sidebar styling block:

```css
/* Theme toggle in sidebar footer */
.sidebar-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    width: inherit;
    padding: 16px;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border);
}
.theme-toggle-sidebar {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 24px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-primary);
    font-size: 14px;
}
.theme-toggle-sidebar:hover {
    border-color: var(--accent);
}
```

- [ ] **Step 3: Add theme toggle at bottom of sidebar**

After the session list loop, add the theme toggle:

```python
    # Theme toggle at sidebar footer
    is_dark = st.session_state.theme == "dark"
    theme_label = "🌙 Dark" if is_dark else "☀️ Light"
    
    st.sidebar.markdown("---")
    st.sidebar.markdown('<div class="sidebar-footer">', unsafe_allow_html=True)
    if st.sidebar.button(theme_label, key="theme_toggle_sidebar", help="Toggle theme"):
        st.session_state.theme = "dark" if st.session_state.theme == "light" else "light"
        st.rerun()
    st.sidebar.markdown('</div>', unsafe_allow_html=True)
    
    # Style the theme toggle button
    st.sidebar.markdown(
        """
        <style>
        .sidebar-footer div[data-testid="stButton"] button {
            background: var(--bg-tertiary) !important;
            border: 1px solid var(--border) !important;
            border-radius: 24px !important;
            padding: 6px 12px !important;
            color: var(--text-primary) !important;
            font-size: 14px !important;
            text-align: left !important;
        }
        .sidebar-footer div[data-testid="stButton"] button:hover {
            border-color: var(--accent) !important;
            background: var(--border) !important;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
```

- [ ] **Step 4: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/sidebar.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 5: Commit**

```bash
git add ui_components/sidebar.py
git commit -m "feat: add theme toggle to sidebar footer"
```

---

### Task 4: Move Temporary Toggle to Sidebar

**Files:**
- Modify: `ui_components/sidebar.py` (same file as Task 3)

**Interfaces:**
- Consumes: `is_temporary` session state from header initialization
- Produces: Temporary toggle in sidebar below "New Chat" button

- [ ] **Step 1: Add temporary toggle after New Chat button**

After the "New Chat" button code (line 50), add:

```python
    # Temporary toggle - only show when chat is empty or already temporary
    if len(st.session_state.get("chat_display", [])) == 0 or st.session_state.get("is_temporary", False):
        is_temp = st.sidebar.toggle(
            "🔒 Temporary",
            value=st.session_state.get("is_temporary", False),
            help="When active, history is not saved"
        )
        if is_temp != st.session_state.get("is_temporary", False):
            st.session_state.is_temporary = is_temp
            st.session_state.session_id = f"temp_{uuid.uuid4()}" if is_temp else str(uuid.uuid4())
            st.session_state.chat_display = []
            st.rerun()
```

- [ ] **Step 2: Style the temporary toggle**

Add CSS for the temporary toggle:

```css
/* Temporary toggle styling */
div[data-testid="stSidebar"] .stToggle {
    padding: 0;
    margin-bottom: 8px;
}
div[data-testid="stSidebar"] .stToggle label {
    font-size: 13px !important;
    color: var(--text-secondary) !important;
}
```

- [ ] **Step 3: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/sidebar.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 4: Commit**

```bash
git add ui_components/sidebar.py
git commit -m "feat: move temporary toggle to sidebar"
```

---

### Task 5: Add Hover-to-Reveal Session Actions

**Files:**
- Modify: `ui_components/sidebar.py` (session list loop)

**Interfaces:**
- Consumes: session list from `get_all_sessions()`
- Produces: hover-to-reveal edit/delete icons on each session

- [ ] **Step 1: Add hover CSS for session items**

Add to sidebar CSS:

```css
/* Session item hover actions */
.session-item {
    position: relative;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.2s ease;
}
.session-item:hover {
    background-color: var(--bg-tertiary);
}
.session-actions {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: none;
    gap: 4px;
}
.session-item:hover .session-actions {
    display: flex;
}
.session-action-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
}
.session-action-btn:hover {
    background: var(--border);
    color: var(--text-primary);
}
```

- [ ] **Step 2: Replace session list loop with hover actions**

Replace the entire `for sess_id, title, created_at in past_sessions:` loop (lines 54-91) with:

```python
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
```

- [ ] **Step 3: Style edit/delete buttons**

Add CSS for the action buttons:

```css
/* Session action buttons */
div[data-testid="stSidebar"] div[data-testid="stColumn"]:nth-of-type(2) div[data-testid="stButton"] button {
    background: transparent !important;
    border: none !important;
    padding: 4px !important;
    min-width: auto !important;
    font-size: 14px !important;
    opacity: 0.6;
    transition: opacity 0.2s ease !important;
}
div[data-testid="stSidebar"] div[data-testid="stColumn"]:nth-of-type(2) div[data-testid="stButton"] button:hover {
    opacity: 1;
    background: var(--bg-tertiary) !important;
}
```

- [ ] **Step 4: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/sidebar.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 5: Commit**

```bash
git add ui_components/sidebar.py
git commit -m "feat: add hover-to-reveal session actions"
```

---

### Task 6: Update Empty State with Suggestion Chips

**Files:**
- Modify: `ui_components/chat_interface.py:9-52`

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: ChatGPT-style empty state with clickable suggestion chips

- [ ] **Step 1: Replace empty state CSS and HTML**

Replace the entire empty state section (lines 24-52) with:

```python
    # Empty state when no messages
    if len(st.session_state.chat_display) == 0:
        st.markdown(
            """
            <style>
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 60vh;
                text-align: center;
                padding: 40px 20px;
            }
            .empty-state h2 {
                color: var(--text-primary);
                font-size: 28px;
                font-weight: 500;
                margin-bottom: 32px;
            }
            .suggestion-chips {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                max-width: 600px;
                width: 100%;
            }
            .suggestion-chip {
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 16px;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease;
                color: var(--text-primary);
                font-size: 14px;
                line-height: 1.4;
            }
            .suggestion-chip:hover {
                border-color: var(--accent);
                background: var(--bg-tertiary);
            }
            .chip-icon {
                font-size: 20px;
                margin-bottom: 8px;
            }
            </style>
            <div class="empty-state">
                <h2>How can I help you today?</h2>
                <div class="suggestion-chips">
                    <div class="suggestion-chip" onclick="window.parent.document.querySelector('[data-testid=\"stChatInput\"] input').value='What are the common side effects of TKI medications?'">
                        <div class="chip-icon">💊</div>
                        <div>What are the common side effects of TKI medications?</div>
                    </div>
                    <div class="suggestion-chip" onclick="window.parent.document.querySelector('[data-testid=\"stChatInput\"] input').value='What foods should I avoid while on imatinib?'">
                        <div class="chip-icon">🍎</div>
                        <div>What foods should I avoid while on imatinib?</div>
                    </div>
                    <div class="suggestion-chip" onclick="window.parent.document.querySelector('[data-testid=\"stChatInput\"] input').value='What are the latest CML treatment guidelines?'">
                        <div class="chip-icon">📋</div>
                        <div>What are the latest CML treatment guidelines?</div>
                    </div>
                    <div class="suggestion-chip" onclick="window.parent.document.querySelector('[data-testid=\"stChatInput\"] input').value='Give me lifestyle tips for managing CML'">
                        <div class="chip-icon">🏃</div>
                        <div>Give me lifestyle tips for managing CML</div>
                    </div>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
```

- [ ] **Step 2: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/chat_interface.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 3: Commit**

```bash
git add ui_components/chat_interface.py
git commit -m "feat: add ChatGPT-style empty state with suggestion chips"
```

---

### Task 7: Update Message Styling (Borderless)

**Files:**
- Modify: `ui_components/chat_interface.py:10-40` (CSS block)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Clean, borderless message display

- [ ] **Step 1: Update chat message CSS**

Replace the `[data-testid="stChatMessage"]` CSS block (lines 13-22) with:

```css
[data-testid="stChatMessage"] {
    background-color: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 16px 0 !important;
    margin: 0 !important;
    max-width: 800px;
    margin-left: auto !important;
    margin-right: auto !important;
}

/* User message styling */
[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {
    background-color: var(--accent) !important;
    border-radius: 16px 16px 0 16px !important;
    padding: 16px !important;
    margin: 8px 0 !important;
    max-width: 70% !important;
    margin-left: auto !important;
    color: white !important;
}

/* Assistant message styling */
[data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-assistant"]) {
    background-color: transparent !important;
    padding: 16px 0 !important;
}
```

- [ ] **Step 2: Update chat input styling**

Replace `div[data-testid="stChatInput"]` CSS (lines 102-116) with:

```css
div[data-testid="stChatInput"] {
    background-color: var(--bg-tertiary) !important;
    border: 1px solid var(--border) !important;
    border-radius: 24px !important;
    max-width: 800px !important;
    margin: 0 auto !important;
}
div[data-testid="stChatInput"]:focus-within {
    border-color: var(--text-secondary) !important;
    box-shadow: 0 0 0 1px var(--text-secondary) !important;
}
div[data-testid="stChatInput"] input {
    color: var(--text-primary) !important;
}
div[data-testid="stChatInput"] input::placeholder {
    color: var(--text-secondary) !important;
}
```

- [ ] **Step 3: Update chat input placeholder**

Change the placeholder text (line 60) from "Ask a question about your medication..." to "Message CML Assistant...":

```python
if user_question := st.chat_input("Message CML Assistant..."):
```

- [ ] **Step 4: Run syntax check**

Run: `python -c "import py_compile; py_compile.compile('ui_components/chat_interface.py', doraise=True); print('OK')"`
Expected: OK

- [ ] **Step 5: Commit**

```bash
git add ui_components/chat_interface.py
git commit -m "style: update messages to borderless ChatGPT style"
```

---

### Task 8: Final Integration & Cleanup

**Files:**
- Modify: `app.py:15-20` (page config)
- Modify: `ui_components/header.py` (remove unused imports)

**Interfaces:**
- Consumes: all previous tasks
- Produces: clean, working application

- [ ] **Step 1: Update app.py page config**

Change `layout="wide"` to `layout="centered"` for ChatGPT-style centered layout:

```python
st.set_page_config(
    page_title="CML Assistant",
    page_icon=None,
    layout="centered",
    initial_sidebar_state="expanded"
)
```

- [ ] **Step 2: Clean up header.py imports**

Remove unused imports from header.py:

```python
import streamlit as st
import uuid
```

Remove `from database import delete_session, rename_session` (no longer used in header).

- [ ] **Step 3: Run syntax check on all files**

Run: `python -c "import py_compile; [py_compile.compile(f, doraise=True) for f in ['app.py', 'ui_components/header.py', 'ui_components/sidebar.py', 'ui_components/chat_interface.py']]; print('All OK')"`
Expected: All OK

- [ ] **Step 4: Run full application test**

Run: `streamlit run app.py`
Manual verification:
- [ ] Dark mode is default
- [ ] Header shows only centered title
- [ ] Sidebar has New Chat, Temporary toggle, session list, theme toggle at bottom
- [ ] Session items show edit/delete on hover
- [ ] Empty state shows suggestion chips
- [ ] Messages are borderless
- [ ] Chat input is centered, pill-shaped
- [ ] Theme toggle works
- [ ] All existing functionality works (tool calling, streaming, session persistence)

- [ ] **Step 5: Commit**

```bash
git add app.py ui_components/header.py
git commit -m "chore: final integration cleanup for ChatGPT-style UI"
```
