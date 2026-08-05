# Theme Toggle Design Spec

**Date:** 2026-08-05
**Project:** TKI Side Effect Navigator (CML Patient Assistant)
**Status:** Approved

## Overview

Redesign the theme toggle to be a prominent, interactive pill-shaped switch with clear sun/moon icons, high-contrast colors, and dedicated header space. Two themes only: dark (navy) and light (gray). Text must be light in dark mode, dark in light mode.

## Approach

Refine the existing session_state + conditional CSS pattern. No JavaScript injection or Streamlit native theme config — full control via CSS variables and f-string templating.

## Theme Toggle Component

**Shape:** Pill-shaped toggle switch, 48px wide × 24px tall. Circular knob (20px diameter) slides left/right.

**States:**
- Light mode: Knob left, sun icon, toggle bg `#e2e8f0`, knob white
- Dark mode: Knob right, moon icon, toggle bg `#1e3a5f`, knob `#fbbf24` (amber)

**Interactions:**
- Hover: `transform: scale(1.05)` + `box-shadow: 0 2px 8px rgba(0,0,0,0.2)`
- Active/click: `transform: scale(0.95)` for 100ms, then releases
- Knob slide: `transition: transform 0.2s ease`

**Behavior:** Click toggles `st.session_state.theme` between "light" and "dark", triggers `st.rerun()`.

## Color Palette

### Dark Theme (Navy)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0f172a` | Main app background |
| `--bg-secondary` | `#1e293b` | Cards, sidebar, chat messages |
| `--bg-tertiary` | `#334155` | Input fields, hover states |
| `--text-primary` | `#f1f5f9` | Headings, body text |
| `--text-secondary` | `#94a3b8` | Placeholders, muted text |
| `--border` | `#334155` | Separators, input borders |
| `--accent` | `#ef4444` | Primary buttons (brand red) |
| `--accent-hover` | `#dc2626` | Button hover |

### Light Theme (Gray)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#f1f5f9` | Main app background |
| `--bg-secondary` | `#ffffff` | Cards, sidebar, chat messages |
| `--bg-tertiary` | `#e2e8f0` | Input fields, hover states |
| `--text-primary` | `#0f172a` | Headings, body text |
| `--text-secondary` | `#64748b` | Placeholders, muted text |
| `--border` | `#cbd5e1` | Separators, input borders |
| `--accent` | `#ef4444` | Primary buttons (brand red) |
| `--accent-hover` | `#dc2626` | Button hover |

**Contrast ratio:** Text primary on bg primary = 15:1+ (WCAG AAA compliant).

## Header Layout

```
┌─────────────────────────────────────────────────────────┐
│  CML Patient Assistant          [☀️/🌙] [🔒 Temp] [⋮]  │
└─────────────────────────────────────────────────────────┘
```

- Title column: Remaining space, left-aligned
- Toggle column: 80px fixed, centered, dedicated to theme toggle only
- Options column: Temporary toggle + dots (related chat controls stay together)
- 16px gap between title and controls

## Transitions

- **Theme switch:** All elements use `transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease`
- **Toggle knob:** `transition: transform 0.2s ease`
- **No animation on:** Page rerun, chat message re-render

## Element Coverage

| Element | Dark | Light |
|---------|------|-------|
| App background | `#0f172a` | `#f1f5f9` |
| Sidebar | `#1e293b` | `#ffffff` |
| Chat messages | `#1e293b` | `#ffffff` |
| Chat input field | `#334155` | `#ffffff` |
| Input text | `#f1f5f9` | `#0f172a` |
| Placeholder text | `#94a3b8` | `#64748b` |
| Headings | `#f1f5f9` | `#0f172a` |
| Body text | `#f1f5f9` | `#0f172a` |
| Primary buttons | `#ef4444` bg, white text | same |
| Secondary buttons | `#334155` bg, `#f1f5f9` text | `#e2e8f0` bg, `#0f172a` text |
| Borders/dividers | `#334155` | `#cbd5e1` |
| Status/spinner text | `#f1f5f9` | `#0f172a` |
| Empty state icon | `#f1f5f9` | `#0f172a` |
| Focus rings | `#ef4444` accent | same |

## Files to Modify

1. **`ui_components/header.py`** — Theme state init, CSS variables, toggle component, header layout
2. **`ui_components/sidebar.py`** — Sidebar-specific theme styling
3. **`ui_components/chat_interface.py`** — Chat messages, input, status, empty state styling

## Anti-Patterns to Avoid

- No emoji as icons in buttons (use text/SVG)
- No hardcoded colors outside CSS variables
- No jarring flash on theme switch (use transitions)
- No reliance on Streamlit default text colors
