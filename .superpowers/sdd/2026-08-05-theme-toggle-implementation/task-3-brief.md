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
