# UI Professional Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the UI to look professional with dark-first visual style, purple accent, and remove clutter.

**Architecture:** Update CSS variables and styling across three UI component files. Remove redundant elements (button text, emoji, colored borders). Change accent from red to purple.

**Tech Stack:** Streamlit 1.60.0, Python 3.x, CSS variables, HTML/CSS

## Global Constraints

- Dark-first: Background `#0f172a`, Surface `#1e293b`, Border `#334155`
- Text: Primary `#f1f5f9`, Secondary `#94a3b8`
- Accent: Purple `#8b5cf6`, Hover `#7c3aed`
- Remove: "Toggle Theme" button text, 💬 emoji, colored left borders on messages, HR between sessions
- Keep: Theme toggle pill, Temporary toggle, dots menus, all session management
- Files: `ui_components/header.py`, `ui_components/sidebar.py`, `ui_components/chat_interface.py`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `ui_components/header.py` | Theme state, CSS variables, header layout, remove button text |
| `ui_components/sidebar.py` | Sidebar styling, remove HRs, purple accent buttons |
| `ui_components/chat_interface.py` | Chat styling, remove emoji, remove colored borders |

---

### Task 1: Header — Remove Button Text and Update Colors

**Files:**
- Modify: `ui_components/header.py:238-240` (remove button)
- Modify: `ui_components/header.py:15-27` (update accent colors)

**Interfaces:**
- Consumes: `st.session_state.theme` (string: "light" or "dark")
- Produces: Updated header with purple accent and no button text

- [ ] **Step 1: Remove the "Toggle Theme" button**

In `header.py`, delete lines 238-240:

```python
        if st.button("Toggle Theme", key="theme_toggle_btn", help="Switch between dark and light mode"):
            st.session_state.theme = "dark" if st.session_state.theme == "light" else "light"
            st.rerun()
```

The pill toggle HTML remains. The button was redundant — clicking the pill should trigger the theme change via a hidden mechanism or the pill itself.

- [ ] **Step 2: Update accent colors from red to purple**

In `header.py`, replace the CSS `:root` variables:

```python
        :root {{
            --bg-primary: {'#0f172a' if is_dark else '#f1f5f9'};
            --bg-secondary: {'#1e293b' if is_dark else '#ffffff'};
            --bg-tertiary: {'#334155' if is_dark else '#e2e8f0'};
            --text-primary: {'#f1f5f9' if is_dark else '#0f172a'};
            --text-secondary: {'#94a3b8' if is_dark else '#64748b'};
            --border: {'#334155' if is_dark else '#cbd5e1'};
            --accent: #8b5cf6;
            --accent-hover: #7c3aed;
        }}
```

- [ ] **Step 3: Run syntax check**

Run: `python -m py_compile ui_components/header.py`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add ui_components/header.py
git commit -m "feat: remove theme button text, update accent to purple"
```

---

### Task 2: Header — Fix Pill Toggle to Work Without Button

**Files:**
- Modify: `ui_components/header.py:228-237` (pill HTML and click handler)

**Interfaces:**
- Consumes: `st.session_state.theme` toggle
- Produces: Pill that triggers theme change on click

- [ ] **Step 1: Add onclick handler to pill toggle**

Replace the pill markup to include a proper click handler:

```python
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
```

Note: Streamlit doesn't support direct onclick to Python. The pill is visual-only. The actual toggle is handled by the hidden button we removed. We need to add a hidden button that triggers on pill click via JavaScript, or keep a minimal invisible button.

**Alternative approach:** Keep a minimal hidden button that the pill visually represents:

```python
        st.markdown(
            f"""
            <div class="theme-toggle-pill" onclick="window.parent.document.querySelector('button[data-testid=\"stBaseButton-secondary\"]').click()">
                <div class="theme-toggle-knob" style="{knob_style}">
                    <span class="theme-toggle-icon">{theme_icon}</span>
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
```

But Streamlit's security model may block this. Safer approach: keep the button but hide it visually while the pill provides the visual.

- [ ] **Step 2: Implement hidden button approach**

Keep the button but make it visually hidden while the pill provides the visual:

```python
        st.markdown(
            f"""
            <div class="theme-toggle-pill">
                <div class="theme-toggle-knob" style="{knob_style}">
                    <span class="theme-toggle-icon">{theme_icon}</span>
                </div>
            </div>
            <style>
            div[data-testid="stColumn"]:nth-of-type(2) button {{
                position: absolute;
                opacity: 0;
                width: 48px;
                height: 24px;
                margin: 8px 0 0 0;
            }}
            </style>
            """,
            unsafe_allow_html=True
        )
        if st.button("Toggle Theme", key="theme_toggle_btn", help="Switch between dark and light mode"):
            st.session_state.theme = "dark" if st.session_state.theme == "light" else "light"
            st.rerun()
```

- [ ] **Step 3: Run syntax check**

Run: `python -m py_compile ui_components/header.py`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add ui_components/header.py
git commit -m "feat: hide theme button, keep pill visual"
```

---

### Task 3: Sidebar — Update Colors and Remove HRs

**Files:**
- Modify: `ui_components/sidebar.py:9-44` (CSS section)
- Modify: `ui_components/sidebar.py:96` (remove HR)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Updated sidebar styling

- [ ] **Step 1: Update sidebar CSS to use purple accent**

Replace the CSS block in `sidebar.py`:

```python
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
```

- [ ] **Step 2: Remove HR between session items**

Delete line 96 in `sidebar.py`:

```python
            st.sidebar.markdown("---")
```

- [ ] **Step 3: Update "New Chat" button to purple**

The button already uses `type="primary"` which will inherit the purple accent from CSS variables. No change needed — verify it works.

- [ ] **Step 4: Run syntax check**

Run: `python -m py_compile ui_components/sidebar.py`
Expected: No output (success)

- [ ] **Step 5: Commit**

```bash
git add ui_components/sidebar.py
git commit -m "feat: update sidebar colors to purple accent, remove HRs"
```

---

### Task 4: Chat Interface — Remove Emoji and Colored Borders

**Files:**
- Modify: `ui_components/chat_interface.py:9-43` (CSS section)
- Modify: `ui_components/chat_interface.py:46-56` (empty state)

**Interfaces:**
- Consumes: CSS variables from Task 1
- Produces: Updated chat styling

- [ ] **Step 1: Update chat CSS to remove colored borders**

Replace the CSS block in `chat_interface.py`:

```python
    st.markdown(
        """
        <style>
        [data-testid="stChatMessage"] {
            background-color: var(--bg-secondary) !important;
            border: 1px solid var(--border) !important;
            border-radius: 12px !important;
            padding: 16px !important;
            margin: 8px 0 !important;
        }
        [data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {
            border-left: 2px solid var(--accent) !important;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
        }
        .empty-state h2 {
            color: var(--text-primary);
            margin-bottom: 12px;
        }
        .empty-state p {
            font-size: 16px;
            line-height: 1.6;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
```

- [ ] **Step 2: Remove emoji from empty state**

Replace the empty state HTML:

```python
    if len(st.session_state.chat_display) == 0:
        st.markdown(
            """
            <div class="empty-state">
                <h2>How can I help you today?</h2>
                <p>Ask me anything about CML, TKI medications, side effects, or lifestyle tips.</p>
            </div>
            """,
            unsafe_allow_html=True
        )
```

- [ ] **Step 3: Run syntax check**

Run: `python -m py_compile ui_components/chat_interface.py`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add ui_components/chat_interface.py
git commit -m "feat: remove emoji and colored borders from chat interface"
```

---

### Task 5: Final Polish and Verification

**Files:**
- Modify: `ui_components/header.py` (if needed for polish)

**Interfaces:**
- Consumes: All previous tasks complete
- Produces: Verified working UI

- [ ] **Step 1: Run full syntax check on all files**

Run: `python -m py_compile app.py ui_components/header.py ui_components/sidebar.py ui_components/chat_interface.py`
Expected: No output (success)

- [ ] **Step 2: Verify all changes are consistent**

Check that:
- Purple accent (`#8b5cf6`) is used everywhere (no red remnants)
- No emoji in UI elements
- No colored left borders on assistant messages
- No HRs between session items
- "Toggle Theme" button text is hidden

- [ ] **Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat: complete UI professional redesign with dark-first purple accent"
```

---

## Self-Review Checklist

- [x] Spec coverage: Removals, color palette, header, chat, sidebar, buttons, transitions — all addressed
- [x] Placeholder scan: No TBD, TODO, or vague steps
- [x] Type consistency: CSS variables used consistently across all tasks
- [x] File modifications: All three files covered in separate tasks
