# UI Issues Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 UI issues in the CML Patient Assistant Streamlit app: sticky theme toggle, ChatGPT-style temporary toggle, 3-dot session menu, and theme-aware chat input.

**Architecture:** Modify existing UI component files to add CSS styling and JavaScript interactivity for the 4 issues. No new files needed — all changes go into existing `ui_components/sidebar.py`, `ui_components/chat_interface.py`, and `ui_components/header.py`.

**Tech Stack:** Streamlit, Python, CSS, HTML/JavaScript (for interactivity)

## Global Constraints

- Python 3.x, Streamlit 1.60.0
- Dark theme colors: `#212121` (bg-primary), `#171717` (bg-secondary), `#2f2f2f` (bg-tertiary), `#ececec` (text-primary), `#8e8e8e` (text-secondary), `#424242` (border)
- Light theme colors: `#f5f5f5` (bg-primary), `#f0f0f0` (bg-secondary), `#e8e8e8` (bg-tertiary), `#1a1a1a` (text-primary), `#6b6b6b` (text-secondary), `#d0d0d0` (border)
- Accent color: `#8b5cf6` (purple)
- All CSS must use CSS variables for theme support
- Streamlit buttons cannot use CSS :hover pseudo-class for interactivity

---

## Task 1: Update CSS Variables in Header

**Files:**
- Modify: `ui_components/header.py:14-26`

**Interfaces:**
- Consumes: None
- Produces: CSS variables available for all components

- [ ] **Step 1: Update CSS variable definitions**

Ensure the `:root` CSS variables in `header.py` are correctly defined for both dark and light modes. The current implementation already has this, but verify the values match the spec.

Current values in `header.py`:
```python
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
```

These values are correct. No changes needed for this task.

- [ ] **Step 2: Verify CSS variables are applied**

Run the app and verify that CSS variables are correctly applied to elements.

Run: `streamlit run app.py`
Expected: App loads, CSS variables are available in browser dev tools

---

## Task 2: Implement Sticky Theme Toggle in Sidebar

**Files:**
- Modify: `ui_components/sidebar.py:111-122`

**Interfaces:**
- Consumes: CSS variables from header.py
- Produces: Theme toggle that stays fixed at bottom of sidebar

- [ ] **Step 1: Add CSS for sticky theme toggle**

Add the following CSS to the sidebar styling in `sidebar.py`:

```css
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
```

- [ ] **Step 2: Update theme toggle button with CSS class**

Modify the theme toggle button in `sidebar.py` to use the new CSS class:

```python
# Theme toggle at sidebar footer - ALWAYS at bottom
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
```

- [ ] **Step 3: Remove spacer `<br>` tags**

Remove the spacer `<br>` tags that were previously used to push the toggle down:

```python
# Remove this line:
for _ in range(3):
    st.sidebar.markdown("<br>", unsafe_allow_html=True)
```

- [ ] **Step 4: Test sticky theme toggle**

Run the app, add multiple chat sessions to make the sidebar scroll, verify the theme toggle stays fixed at the bottom.

Run: `streamlit run app.py`
Expected: Theme toggle remains visible when scrolling the sidebar

- [ ] **Step 5: Commit changes**

```bash
git add ui_components/sidebar.py
git commit -m "feat: make theme toggle sticky at bottom of sidebar"
```

---

## Task 3: Implement ChatGPT-Style Temporary Toggle

**Files:**
- Modify: `ui_components/chat_interface.py:85-92`

**Interfaces:**
- Consumes: CSS variables from header.py
- Produces: ChatGPT-style pill toggle for temporary sessions

- [ ] **Step 1: Add CSS for temporary toggle**

Add the following CSS to the chat interface styling in `chat_interface.py`:

```css
.temp-toggle-wrapper {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 8px 16px;
}
.temp-toggle-container {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}
.temp-toggle-label {
    font-size: 14px;
    color: var(--text-secondary);
}
.temp-toggle-pill {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: #424242;
    position: relative;
    transition: background 0.2s ease;
}
.temp-toggle-pill.active {
    background: #8b5cf6;
}
.temp-toggle-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s ease;
}
.temp-toggle-pill.active .temp-toggle-circle {
    transform: translateX(20px);
}
```

- [ ] **Step 2: Replace emoji toggle with pill toggle**

Replace the current emoji toggle in `chat_interface.py`:

```python
# Current code:
# temp_label = "🟢" if is_temp else "⚪"
# if st.button(temp_label, key="temp_toggle_header", help="Toggle temporary session"):

# New code:
is_temp = st.session_state.get("is_temporary", False)
active_class = "active" if is_temp else ""

st.markdown(
    f"""
    <div class="temp-toggle-wrapper">
        <div class="temp-toggle-container" onclick="window.parent.document.querySelector('[data-testid=\"stSidebar\"]').click()">
            <span class="temp-toggle-label">Temporary</span>
            <div class="temp-toggle-pill {active_class}">
                <div class="temp-toggle-circle"></div>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True
)

# Use a hidden button for the actual toggle functionality
if st.button("Toggle", key="temp_toggle_header", help="Toggle temporary session", 
             label_visibility="collapsed"):
    st.session_state.is_temporary = not st.session_state.is_temporary
    st.rerun()
```

- [ ] **Step 3: Test temporary toggle**

Run the app, click the temporary toggle, verify it changes state and the pill animation works.

Run: `streamlit run app.py`
Expected: Toggle changes between purple (ON) and gray (OFF) with smooth animation

- [ ] **Step 4: Commit changes**

```bash
git add ui_components/chat_interface.py
git commit -m "feat: add ChatGPT-style temporary toggle"
```

---

## Task 4: Implement Three-Dot Menu for Session Actions

**Files:**
- Modify: `ui_components/sidebar.py:55-109`

**Interfaces:**
- Consumes: CSS variables from header.py
- Produces: 3-dot menu with dropdown for session actions

- [ ] **Step 1: Add CSS for 3-dot menu**

Add the following CSS to the sidebar styling in `sidebar.py`:

```css
.session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
}
.session-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.three-dot-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 16px;
}
.three-dot-btn:hover {
    background: var(--bg-tertiary);
}
.session-dropdown {
    position: absolute;
    right: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    min-width: 150px;
    padding: 4px 0;
}
.session-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    color: var(--text-primary);
}
.session-dropdown-item:hover {
    background: var(--bg-tertiary);
}
```

- [ ] **Step 2: Replace direct buttons with 3-dot menu**

Replace the current session action buttons in `sidebar.py`:

```python
# Current code:
# with col_actions:
#     # Edit button (pencil icon)
#     if st.button("✏️", key=f"edit_{sess_id}", help=f"Rename: {title}"):
#         st.session_state[f"renaming_{sess_id}"] = True
#         st.rerun()
#     
#     # Delete button (trash icon)
#     if st.button("🗑️", key=f"del_{sess_id}", help=f"Delete: {title}"):
#         delete_session(sess_id)
#         if st.session_state.session_id == sess_id:
#             st.session_state.session_id = str(uuid.uuid4())
#             st.session_state.chat_display = []
#             st.session_state.is_temporary = False
#         st.rerun()

# New code:
with col_actions:
    # Three-dot menu button
    if st.button("⋯", key=f"menu_{sess_id}", help=f"Actions for: {title}"):
        st.session_state[f"show_menu_{sess_id}"] = not st.session_state.get(f"show_menu_{sess_id}", False)
        st.rerun()
    
    # Dropdown menu
    if st.session_state.get(f"show_menu_{sess_id}", False):
        st.markdown(
            f"""
            <div class="session-dropdown">
                <div class="session-dropdown-item" onclick="window.parent.document.querySelector('[data-testid=\"stSidebar\"]').click()">
                    ✏️ Rename
                </div>
                <div class="session-dropdown-item" onclick="window.parent.document.querySelector('[data-testid=\"stSidebar\"]').click()">
                    🗑️ Delete
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
        
        # Actual buttons for functionality
        col_rename, col_delete = st.columns(2)
        with col_rename:
            if st.button("✏️ Rename", key=f"rename_{sess_id}", use_container_width=True):
                st.session_state[f"renaming_{sess_id}"] = True
                st.session_state[f"show_menu_{sess_id}"] = False
                st.rerun()
        with col_delete:
            if st.button("🗑️ Delete", key=f"delete_{sess_id}", use_container_width=True):
                delete_session(sess_id)
                if st.session_state.session_id == sess_id:
                    st.session_state.session_id = str(uuid.uuid4())
                    st.session_state.chat_display = []
                    st.session_state.is_temporary = False
                st.session_state[f"show_menu_{sess_id}"] = False
                st.rerun()
```

- [ ] **Step 3: Add click-outside handler**

Add JavaScript to close the dropdown when clicking outside:

```python
# Add this CSS/JS to close dropdowns when clicking outside
st.sidebar.markdown(
    """
    <script>
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.session-dropdown') && !e.target.closest('.three-dot-btn')) {
            document.querySelectorAll('.session-dropdown').forEach(function(el) {
                el.style.display = 'none';
            });
        }
    });
    </script>
    """,
    unsafe_allow_html=True
)
```

- [ ] **Step 4: Test 3-dot menu**

Run the app, click the ⋯ button on a session, verify the dropdown appears with Rename/Delete options.

Run: `streamlit run app.py`
Expected: Dropdown appears on click, disappears when clicking outside

- [ ] **Step 5: Commit changes**

```bash
git add ui_components/sidebar.py
git commit -m "feat: add 3-dot menu for session actions"
```

---

## Task 5: Update Chat Input CSS for Theme Support

**Files:**
- Modify: `ui_components/header.py:98-113`

**Interfaces:**
- Consumes: CSS variables from header.py
- Produces: Theme-aware chat input styling

- [ ] **Step 1: Update chat input CSS**

Replace the current chat input CSS in `header.py`:

```python
# Current code:
# div[data-testid="stChatInput"] {{
#     background-color: var(--bg-tertiary) !important;
#     border: 1px solid var(--border) !important;
#     border-radius: 24px !important;
# }}

# New code:
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
```

- [ ] **Step 2: Test theme-aware chat input**

Run the app, switch between dark and light themes, verify the chat input changes colors.

Run: `streamlit run app.py`
Expected: Chat input background, border, text, and placeholder all change with theme

- [ ] **Step 3: Commit changes**

```bash
git add ui_components/header.py
git commit -m "feat: add theme-aware chat input styling"
```

---

## Final Verification

- [ ] **Step 1: Run all tests**

Run: `python -m py_compile app.py ui_components/header.py ui_components/sidebar.py ui_components/chat_interface.py`
Expected: No syntax errors

- [ ] **Step 2: Manual testing checklist**

1. Theme toggle stays fixed at bottom of sidebar when scrolling
2. Temporary toggle has ChatGPT-style pill design with "Temporary" label
3. Session actions (Rename/Delete) are hidden behind a ⋯ menu
4. Chat input changes colors when switching themes
5. All elements maintain theme consistency (dark/light)
6. No visual regressions in existing functionality

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: fix 4 UI issues - sticky toggle, temp toggle, 3-dot menu, theme-aware input"
```