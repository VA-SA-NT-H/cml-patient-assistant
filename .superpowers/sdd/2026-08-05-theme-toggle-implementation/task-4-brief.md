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
