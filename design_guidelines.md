# Rookie Quest Keeper - Sunset Tabletop Design System

## Overview

Rookie Quest Keeper is moving to a warm sunset tabletop identity: dark espresso/charcoal foundations, ember-brown panels, cream text, copper borders, and golden-orange calls to action. The theme should feel polished, beginner-friendly, and slightly game-like without returning to the older blue, purple, or neon direction.

## Implementation status

The global app tokens in `frontend/src/App.css` are already mostly sunset-aligned: the root palette uses espresso backgrounds, warm leather cards, parchment text, gold/copper accents, and square/minimal radii. The main gap is consistency: some older docs and component-level styles still reference cyber, blue, purple, or neon palettes, so each page should be checked as it is touched.

## Core palette

| Token | Hex | Usage |
| --- | --- | --- |
| `--bg-black` | `#120C08` | Whole app background |
| `--bg-dark` | `#160F0A` | Deep page sections and form fields |
| `--bg-panel` | `#21150E` | Primary panels and app shell surfaces |
| `--bg-card` | `#2E1D13` | Cards, lists, tool blocks |
| `--bg-hover` | `#3A2619` | Raised, selected, or hover surfaces |
| `--accent-red` | `#C08A3D` | Primary sunset/gold CTA color; legacy variable name retained |
| `--accent-red-hover` | `#E0B15C` | CTA hover/focus color |
| `--rq-role-gm` | `#A45A32` | Copper support accent |
| `--text-primary` | `#F5E6C8` | Main readable cream text |
| `--text-secondary` | `#E6D2AA` | Secondary readable text |
| `--text-muted` | `#CDBA98` | Helper copy and inactive labels |
| `--success` | `#7A9B66` | Saved, ready, safe creation, and success states |
| `--warning` | `#D4953C` | True warning states |
| `--danger` | `#B44732` | Errors and destructive actions |

## Placement rules

1. Use one shared sunset shell across player, GM, and character-builder pages.
2. Use gold/copper for primary actions, selected navigation, focus states, and helpful highlights.
3. Reserve red for destructive actions and errors; do not use red as a broad page theme.
4. Keep text cream/parchment on dark surfaces for readability.
5. Avoid old blue, purple, cyan, and neon glow treatments unless they are being removed in the same PR.
6. Prefer sharp/minimal cards and restrained shadows over bubbly, over-rounded styling.

## Component guidance

### Buttons

```css
.btn-primary {
  background: var(--accent-red);
  color: var(--text-primary);
  border: 1px solid var(--accent-red-border);
}

.btn-primary:hover,
.btn-primary:focus-visible {
  background: var(--accent-red-hover);
  box-shadow: 0 0 0 2px var(--accent-red-subtle);
}
```

### Cards

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  border-radius: var(--radius-md);
}

.card:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}
```

### Inputs

```css
.input {
  background: var(--bg-dark);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}

.input:focus {
  border-color: var(--accent-red);
  box-shadow: 0 0 0 2px var(--accent-red-subtle);
}
```

## Rebrand review checklist

Use this quick pass when touching a page:

- Page background uses espresso/charcoal rather than blue, purple, or white.
- Primary actions are gold/copper and readable.
- Cards use leather-brown surfaces with subtle warm borders.
- Empty, loading, and error states are styled for the dark sunset shell.
- Text remains readable at mobile widths.
- No copy calls a creation path “best”, “default”, or “recommended”.
- No component introduces a separate full-page color theme without a product reason.

## How to let Codex visually review the site

Codex can inspect source files directly, but it needs one of the following to visually verify the running site:

1. **Committed screenshots** of target routes in docs or an issue, ideally desktop and mobile widths.
2. **A local screenshot command** checked into the repo, such as a Playwright script that starts the frontend and saves route screenshots.
3. **A temporary preview URL** that does not require private credentials, plus test login details if auth is required.
4. **Route-specific acceptance notes**, such as “check `/characters/new/premade` at 390px and 1440px”.

Never commit real secrets, production tokens, or private user data for visual review.

---
Last Updated: July 2, 2026
