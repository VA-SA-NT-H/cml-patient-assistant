# UI Professional Redesign Design Spec

**Date:** 2026-08-05
**Project:** TKI Side Effect Navigator (CML Patient Assistant)
**Status:** Approved

## Overview

Redesign the UI to look professional with a dark-first visual style. Remove clutter (redundant buttons, emoji), use purple accent color, and create a clean medical-appropriate feel.

## Approach

Dark-First Minimal — clean, clinical, professional. Dark backgrounds with purple accents used sparingly.

## Removals

- "Toggle Theme" button text below the pill (keep just the pill toggle)
- 💬 emoji from empty state (text only)
- Colored left borders on chat messages (user = red, assistant = blue)
- `---` horizontal rules between sidebar session items
- `box-shadow` on chat message hover
- `transform: translateY(-1px)` on button hover

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0f172a` | Main app background |
| `--bg-secondary` | `#1e293b` | Cards, sidebar, chat messages |
| `--bg-tertiary` | `#334155` | Borders, input borders, dividers |
| `--text-primary` | `#f1f5f9` | Headings, body text |
| `--text-secondary` | `#94a3b8` | Placeholders, muted text |
| `--accent` | `#8b5cf6` | Primary buttons, focus rings, links |
| `--accent-hover` | `#7c3aed` | Button hover state |

**Contrast ratio:** Text primary on background = 15:1+ (WCAG AAA compliant).

## Header Layout

```
┌─────────────────────────────────────────────────────────┐
│  CML Patient Assistant        [☀️/🌙] [🔒 Temp] [⋮]   │
│                        ← title →  ← pill → ← opts →    │
└─────────────────────────────────────────────────────────┘
```

- Title column: Remaining space, left-aligned
- Toggle column: Pill toggle only (no button text below)
- Options column: Temporary toggle + dots menu (unchanged)

## Chat Messages

- **User messages:** Surface color (`#1e293b`) with subtle purple left accent line (2px, `#8b5cf6`)
- **Assistant messages:** Standard surface (`#1e293b`) with no accent line
- **Hover:** Subtle shadow lift (no border color change)
- **Empty state:** Text only — "How can I help you today?" with description below

## Sidebar

- Background: `#1e293b` (surface color)
- "History" title: `#f1f5f9` (text primary)
- "New Chat" button: Purple accent (`#8b5cf6`) background, white text
- Session items: No borders, clean hover highlight (background lightens to `#334155`)
- "⋮" dots: Subtle, same color as text secondary
- Inline rename/delete: Clean, minimal, purple accent on delete button
- No horizontal rules between session items

## Buttons & Interactive Elements

**Primary buttons (Delete, New Chat):**
- Background: `#8b5cf6` (purple)
- Text: White
- Hover: `#7c3aed` (darker purple)

**Secondary buttons (Save):**
- Background: `#334155` (border color)
- Text: `#f1f5f9` (text primary)
- Hover: `#475569` (lighter)

**Tertiary buttons (⋮ dots):**
- No background, no border
- Text: `#94a3b8` (text secondary)
- Hover: `#8b5cf6` (accent purple)

**Focus rings:** `#8b5cf6` accent, 2px outline, 2px offset

## Transitions & Polish

- All color changes: 0.3s ease (theme switch)
- Button hover: 0.2s ease
- Toggle knob: 0.2s ease
- Focus ring outlines for accessibility retained

## Files to Modify

1. **`ui_components/header.py`** — Remove button text, update colors to purple accent
2. **`ui_components/sidebar.py`** — Update colors, remove HRs, purple accent buttons
3. **`ui_components/chat_interface.py`** — Remove emoji, update message styling

## Anti-Patterns to Avoid

- No emoji as icons in UI elements
- No colored left borders on chat messages
- No horizontal rules between list items
- No box-shadow on hover (keep it clean)
- No button hover transform (subtle is better)
