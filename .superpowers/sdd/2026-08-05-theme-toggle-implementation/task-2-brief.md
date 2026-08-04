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
