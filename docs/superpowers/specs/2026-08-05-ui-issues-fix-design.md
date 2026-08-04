# UI Issues Fix Design

**Date:** 2026-08-05
**Status:** Draft
**Scope:** 4 UI issues in the CML Patient Assistant Streamlit app

---

## Issue 1: Sticky Theme Toggle in Sidebar

### Problem
The theme toggle at the bottom of the sidebar uses `<br>` spacers to push it down, but when there are many chat sessions, the sidebar scrolls and the toggle disappears from view.

### Solution
Use CSS `position: fixed` to pin the theme toggle at the bottom of the sidebar.

### Implementation
- Add CSS class `theme-toggle-fixed` to the theme toggle button
- Target `[data-testid="stSidebar"]` container
- Set `position: fixed`, `bottom: 0`, `left: 0`
- Width matches sidebar (~300px)
- Add gradient fade above toggle for clean separation from scrollable content
- Set `z-index: 999` to ensure it stays above scrollable content

### CSS
```css
[data-testid="stSidebar"] .theme-toggle-fixed {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 300px;
    padding: 16px;
    background: var(--bg-secondary);
    z-index: 999;
}
```

---

## Issue 2: ChatGPT-Style Temporary Toggle

### Problem
The temporary session toggle is a simple circle emoji (🟢/⚪), not consistent with ChatGPT's design language.

### Solution
Replace the emoji button with a CSS-styled pill toggle.

### Implementation
- Create a pill-shaped container with "Temporary" label on left
- Sliding circle indicator on right
- When ON: purple accent background (`#8b5cf6`) with white circle on right
- When OFF: gray background (`#424242` dark / `#d0d0d0` light) with circle on left
- Position: top-right corner of chat interface (existing location)
- Smooth transition (0.2s ease)

### Visual Structure
```
[Temporary  ●]  ← ON state (purple)
[●  Temporary]  ← OFF state (gray)
```

### CSS
```css
.temp-toggle-container {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
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

---

## Issue 3: Three-Dot Menu for Session Actions

### Problem
Edit and delete buttons are always visible next to each session, taking up space and looking cluttered.

### Solution
Add a ⋯ (three horizontal dots) button that reveals a minimal popup with Rename/Delete options.

### Implementation
- Add ⋯ button to the right of each session title
- On click: minimal popup appears positioned near the ⋯ button
- Popup has:
  - Subtle shadow
  - Rounded corners (8px)
  - Theme-aware background and border
  - Two items stacked vertically: "Rename" and "Delete"
  - Each item has icon + text
  - Hover state with subtle background change
- Clicking outside closes the popup
- Only one popup open at a time

### Layout
```
[Session Title]  [⋯]  ← 3-dot button always visible
                     ↓ (on click)
                  ┌─────────┐
                  │ ✏️ Rename │
                  │ 🗑️ Delete │
                  └─────────┘
```

### CSS
```css
.session-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
}
.session-dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
}
.session-dropdown-item:hover {
    background: var(--bg-tertiary);
}
```

---

## Issue 4: Theme-Aware Chat Input

### Problem
The chat input box stays the same color regardless of dark/light theme.

### Solution
Target `div[data-testid="stChatInput"]` with theme-aware CSS for all 4 elements.

### Implementation

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `#2f2f2f` | `#ffffff` |
| Border | `#424242` | `#d0d0d0` |
| Text | `#ececec` | `#1a1a1a` |
| Placeholder | `#8e8e8e` | `#6b6b6b` |

- Focus state: purple border with subtle glow
- Rounded corners (24px) preserved
- Smooth transition between themes (0.3s ease)

### CSS
```css
div[data-testid="stChatInput"] {
    background-color: var(--bg-tertiary) !important;
    border: 1px solid var(--border) !important;
    border-radius: 24px !important;
    transition: all 0.3s ease !important;
}
div[data-testid="stChatInput"]:focus-within {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2) !important;
}
div[data-testid="stChatInput"] input {
    color: var(--text-primary) !important;
    background-color: transparent !important;
}
div[data-testid="stChatInput"] input::placeholder {
    color: var(--text-secondary) !important;
}
```

---

## Files to Modify

1. `ui_components/sidebar.py` — Add sticky theme toggle, 3-dot menu
2. `ui_components/chat_interface.py` — Add temporary toggle styling
3. `ui_components/header.py` — Update chat input CSS

---

## Success Criteria

- [ ] Theme toggle stays fixed at bottom of sidebar when scrolling
- [ ] Temporary toggle has ChatGPT-style pill design with "Temporary" label
- [ ] Session actions (Rename/Delete) are hidden behind a ⋯ menu
- [ ] Chat input changes colors when switching themes
- [ ] All elements maintain theme consistency (dark/light)
- [ ] No visual regressions in existing functionality