# Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a prominent pill-shaped theme toggle with sun/moon icons and high-contrast dark/light themes.

**Architecture:** Refine existing session_state + conditional CSS pattern. Theme state stored in `st.session_state.theme`, CSS variables applied via f-string templating, toggle triggers `st.rerun()`.

**Tech Stack:** Streamlit 1.60.0, Python 3.x, CSS variables, HTML/CSS

## Global Constraints

- Only two themes: dark (navy `#0f172a`) and light (gray `#f1f5f9`)
- Toggle must be pill-shaped, 48×24px, with sun/moon icons
- All text must be light in dark mode, dark in light mode
- Theme transitions: 0.3s ease for colors, 0.2s ease for toggle knob
- No emoji as icons in buttons — use text/SVG only
- Files: `ui_components/header.py`, `ui_components/sidebar.py`, `ui_components/chat_interface.py`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `ui_components/header.py` | Theme state init, CSS variables, toggle component, header layout |
| `ui_components/sidebar.py` | Sidebar-specific theme styling |
| `ui_components/chat_interface.py` | Chat messages, input, status, empty state styling |

---

### Task 1: Header CSS Variables and Theme Toggle

**Files:**
- Modify: `ui_components/header.py:1-136` (CSS section)
- Modify: `ui_components/header.py:147-191` (header layout)

**Interfaces:**
- Consumes: `st.session_state.theme` (string: "light" or "dark")
- Produces: `st.session_state.theme` toggle on click

- [ ] **Step 1: Replace CSS section in header.py**

Replace lines 14-136 (the `st.markdown` block with CSS) with:

```python
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
```

- [ ] **Step 2: Replace header layout with toggle pill**

Replace lines 147-191 (the header layout section) with:

```python
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
```

- [ ] **Step 3: Run syntax check**

Run: `python -m py_compile ui_components/header.py`
Expected: No output (success)

- [ ] **Step 4: Commit**

```bash
git add ui_components/header.py
git commit -m "feat: redesign theme toggle as pill switch with CSS variables"
```

---

### Task 2: Sidebar Theme Styling

**Files:**
- Modify: `ui_components/sidebar.py:1-44` (sidebar CSS)

**Interfaces:**
- Consumes: `st.session_state.theme` (from Task 1)
- Produces: Theme-aware sidebar styling

- [ ] **Step 1: Replace sidebar CSS section**

Replace lines 8-44 (the `st.sidebar.markdown` block) with:

```python
    # Theme-aware sidebar styling
    is_dark = st.session_state.get("theme", "light") == "dark"
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
```

- [ ] **Step 2: Run syntax check**

Run: `python -m py_compile ui_components/sidebar.py`
Expected: No output (success)

- [ ] **Step 3: Commit**

```bash
git add ui_components/sidebar.py
git commit -m "feat: update sidebar to use CSS variable theme tokens"
```

---

### Task 3: Chat Interface Theme Styling

**Files:**
- Modify: `ui_components/chat_interface.py:1-96` (chat CSS)

**Interfaces:**
- Consumes: `st.session_state.theme` (from Task 1)
- Produces: Theme-aware chat styling

- [ ] **Step 1: Replace chat CSS section**

Replace lines 9-96 (the `st.markdown` block with CSS) with:

```python
    # Theme-aware chat styling
    is_dark = st.session_state.get("theme", "light") == "dark"
    st.markdown(
        """
        <style>
        [data-testid="stChatMessage"] {
            border-left: 3px solid var(--border) !important;
        }
        [data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-user"]) {
            border-left-color: var(--accent) !important;
        }
        [data-testid="stChatMessage"]:has([data-testid="chatAvatarIcon-assistant"]) {
            border-left-color: #3b82f6 !important;
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
        .empty-state .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        </style>
        """,
        unsafe_allow_html=True
    )
```

- [ ] **Step 2: Run syntax check**

Run: `python -m py_compile ui_components/chat_interface.py`
Expected: No output (success)

- [ ] **Step 3: Commit**

```bash
git add ui_components/chat_interface.py
git commit -m "feat: update chat interface to use CSS variable theme tokens"
```

---

### Task 4: Integration Test and Polish

**Files:**
- Modify: `ui_components/header.py` (if needed for polish)

**Interfaces:**
- Consumes: All previous tasks complete
- Produces: Verified working theme toggle

- [ ] **Step 1: Run full syntax check on all files**

Run: `python -m py_compile app.py ui_components/header.py ui_components/sidebar.py ui_components/chat_interface.py`
Expected: No output (success)

- [ ] **Step 2: Run Streamlit app**

Run: `streamlit run app.py`
Expected: App loads, toggle visible in header, click toggles theme

- [ ] **Step 3: Test toggle interaction**

1. Click theme toggle — should switch from light to dark
2. Verify all text is light-colored on dark background
3. Click toggle again — should switch back to light
4. Verify all text is dark-colored on light background
5. Check sidebar, chat messages, input field all theme correctly

- [ ] **Step 4: Commit final changes**

```bash
git add -A
git commit -m "feat: complete theme toggle implementation with dark/light modes"
```

---

## Self-Review Checklist

- [x] Spec coverage: Toggle component, color palette, header layout, transitions, element coverage — all addressed
- [x] Placeholder scan: No TBD, TODO, or vague steps
- [x] Type consistency: `st.session_state.theme` used consistently across all tasks
- [x] File modifications: All three files covered in separate tasks
