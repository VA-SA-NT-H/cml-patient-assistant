# ChatGPT-Style UI Redesign

## Overview

Redesign the CML Patient Assistant UI to match ChatGPT's clean, minimal aesthetic. Move all controls to the sidebar, minimize the header, and adopt ChatGPT's color palette with auto-detect theme support.

## Goals

- Clean, minimal header with only the chat title
- ChatGPT-style sidebar with hover-to-reveal session actions
- Auto-detect system theme (dark/light) with manual override
- ChatGPT-inspired color palette
- Suggestion chips on empty state
- Borderless, clean message display

## Layout Structure

### Header (minimal)
- Single row, centered title text
- Shows session title when loaded, "New Chat" when empty
- No controls — all functionality moves to sidebar
- Height: ~48px, background matches main area

### Sidebar (3 zones)
```
┌─────────────────────┐
│ + New Chat          │  ← primary button
│                     │
│ 🔒 Temporary        │  ← small toggle (visible when active or empty)
│                     │
│ ─────────────────── │
│                     │
│ Chat Title 1    ✏️🗑│  ← hover reveals edit/delete
│ Chat Title 2    ✏️🗑│
│ ...                 │
│                     │
│ ─────────────────── │
│ ☀️/🌙  [toggle]    │  ← theme toggle at bottom
└─────────────────────┘
```

### Chat Area
- Centered, max-width ~800px
- Empty state: centered greeting + 4 suggestion chips
- Messages: user right-aligned (accent bg), assistant left-aligned (no bg, with avatar)
- Input: bottom-centered, pill-shaped, send button inside

## Color Palette

### Dark Mode
- `--bg-primary`: `#212121` (main background)
- `--bg-secondary`: `#171717` (sidebar)
- `--bg-tertiary`: `#2f2f2f` (cards, messages)
- `--text-primary`: `#ececec`
- `--text-secondary`: `#8e8e8e`
- `--border`: `#424242`
- `--accent`: `#8b5cf6` (purple, keep existing)

### Light Mode
- `--bg-primary`: `#ffffff`
- `--bg-secondary`: `#f9f9f9` (sidebar)
- `--bg-tertiary`: `#ffffff` (cards, messages)
- `--text-primary`: `#1a1a1a`
- `--text-secondary`: `#6b6b6b`
- `--border`: `#e5e5e5`
- `--accent`: `#8b5cf6`

### Auto-Detect
- Use `@media (prefers-color-scheme: dark)` CSS media query
- Set `st.session_state.theme` based on system preference on first load
- Manual toggle overrides auto-detect

## Components

### Theme Toggle
- Location: sidebar footer
- Style: pill-shaped button with sun/moon emoji
- Behavior: click toggles theme, saves to session state
- Auto-detect: on first load, check `window.matchMedia('(prefers-color-scheme: dark)')`

### Session List
- Each session item: title text + hover-to-reveal edit/delete icons
- Edit icon: pencil SVG, clicking enters inline rename mode
- Delete icon: trash SVG, clicking deletes after confirmation
- Rename: inline text input replaces title, Enter to save, X to cancel
- Active session: highlighted with accent color

### Temporary Toggle
- Location: sidebar, below "New Chat" button
- Style: small toggle with label
- Visibility: only shown when active or when chat is empty
- Behavior: same as current (creates temp session ID)

### Empty State
- Centered vertically and horizontally in chat area
- Heading: "How can I help you today?"
- 4 suggestion chips in 2x2 grid:
  - "Tell me about TKI side effects"
  - "Food interactions with my medication"
  - "What are the latest CML guidelines?"
  - "Lifestyle tips for CML patients"
- Chips are clickable, pre-fill chat input

### Messages
- User: right-aligned, accent background, white text, rounded corners (12px)
- Assistant: left-aligned, no background, small SVG avatar icon
- No borders on messages
- No hover effects
- Clean, readable typography

### Chat Input
- Bottom-centered, max-width ~800px
- Pill-shaped (border-radius: 24px)
- Subtle shadow on focus
- Send button inside the input field (right side)
- Placeholder: "Message CML Assistant..."

## Files to Modify

1. `ui_components/header.py` — Gut to minimal header (title only)
2. `ui_components/sidebar.py` — Add theme toggle, temporary toggle, hover actions
3. `ui_components/chat_interface.py` — New empty state with chips, borderless messages
4. `app.py` — Update page config, system instruction

## Testing

- Verify auto-detect works (system dark → dark mode default)
- Verify manual toggle overrides auto-detect
- Verify sidebar hover actions appear/disappear correctly
- Verify inline rename works (Enter to save, X to cancel)
- Verify delete works with confirmation
- Verify suggestion chips pre-fill chat input
- Verify theme colors apply correctly in both modes
- Verify all existing functionality (tool calling, streaming, session persistence) still works
