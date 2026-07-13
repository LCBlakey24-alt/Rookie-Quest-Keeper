# Rookie Quest Keeper - Sunset Gradient Design System

## Overview

Rookie Quest Keeper uses a dark fantasy sunset-gradient identity: very dark blue-purple foundations, deep indigo panels, white readable text, and a purple-pink-orange sunset gradient for primary actions, selected navigation, focus states, and key highlights. The app should feel polished, beginner-friendly, slightly game-like, and consistent across player, GM, admin, character, homebrew, and upload pages.

Avoid coffee, velvet, espresso, leather, brown-tabletop, parchment, candlelit, or overly rustic theme language in new design work. Those words push the UI toward the wrong look.

## Implementation status

The active app still has several older CSS layers, so the final loaded styles should protect the intended direction: dark blue-purple surfaces, white text, subtle pale borders, and the sunset gradient for active/selected UI. When a page is touched, check the component and its imported styles for hard-coded brown, parchment, coffee, velvet, or one-off theme values.

## Core palette

| Token | Hex / value | Usage |
| --- | --- | --- |
| `--rq-bg-main` | `#070713` | Whole app background |
| `--rq-bg-page` | `#0b0718` | Deep page sections |
| `--rq-bg-rail` | `#0d0617` | App rail / left navigation |
| `--rq-bg-panel` | `#13081f` | Primary panels and app shell surfaces |
| `--rq-bg-card` | `#1b0b2d` | Cards, lists, tool blocks |
| `--rq-card-hover` | `#24103a` | Raised, selected, or hover surfaces |
| `--rq-sunset-gradient` | `linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542)` | Primary brand gradient |
| `--rq-accent-primary` | `#eb3fe9` | Main action / active accent fallback |
| `--rq-accent-hover` | `#ff9542` | Hover/focus accent fallback |
| `--rq-accent-active` | `#7357ff` | Selected-state support accent |
| `--rq-text-primary` | `#ffffff` | Main readable text |
| `--rq-text-secondary` | `rgba(255,255,255,0.82)` | Secondary readable text |
| `--rq-text-muted` | `rgba(255,255,255,0.62)` | Helper copy and inactive labels |
| `--success` | `#7A9B66` | Saved, ready, safe creation, and success states |
| `--warning` | `#D4953C` | True warning states |
| `--danger` | `#B44732` | Errors and destructive actions |

## Placement rules

1. Use one shared dark blue-purple sunset shell across player, GM, and character-builder pages.
2. Use the sunset gradient for primary actions, selected navigation, selected tabs, focus states, and helpful highlights.
3. Keep unselected navigation quiet: transparent/deep surface, white icon/text, no heavy glow.
4. Reserve red for destructive actions and errors; do not use red as a broad page theme.
5. Keep text white or soft-white on dark surfaces for readability.
6. Avoid coffee, velvet, espresso, leather, brown-tabletop, parchment, candlelit, and rustic styling.
7. Prefer sharp/minimal cards and restrained glow over bubbly, over-rounded styling.

## Component guidance

### Buttons

```css
.btn-primary {
  background: var(--rq-sunset-gradient);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.btn-primary:hover,
.btn-primary:focus-visible {
  filter: brightness(1.08);
  box-shadow: 0 0 0 2px rgba(255, 149, 66, 0.22);
}
```

### Cards

```css
.card {
  background: var(--rq-card);
  border: 1px solid var(--rq-border-default);
  color: var(--rq-text-primary);
  border-radius: var(--rq-radius);
}

.card:hover {
  background: var(--rq-card-hover);
  border-color: var(--rq-accent-border);
}
```

### Inputs

```css
.input {
  background: var(--rq-bg-input);
  border: 1px solid var(--rq-border-default);
  color: var(--rq-text-primary);
}

.input:focus {
  border-color: var(--rq-accent-hover);
  box-shadow: 0 0 0 2px rgba(255, 149, 66, 0.18);
}
```

### Rail selected state

```css
.rqk-app-rail-link {
  background: transparent;
  color: #ffffff;
}

.rqk-app-rail-link.is-active svg {
  background: var(--rq-sunset-gradient);
}

.rqk-app-rail-link.is-active::before,
.rqk-app-rail-link.is-active span::after {
  background: var(--rq-sunset-gradient);
}
```

## Rebrand review checklist

Use this quick pass when touching a page:

- Page background uses very dark blue-purple rather than brown, white, or parchment.
- Primary actions use the sunset gradient and remain readable.
- Cards use deep indigo/purple surfaces with subtle pale or sunset borders.
- Empty, loading, and error states are styled for the dark sunset shell.
- Text remains readable at mobile widths.
- Selected tabs/nav follow the app rail selected/unselected pattern.
- No copy calls a creation path “best”, “default”, or “recommended”.
- No component introduces a separate full-page colour theme without a product reason.

## How to let Codex visually review the site

Codex can inspect source files directly, but it needs one of the following to visually verify the running site:

1. **Committed screenshots** of target routes in docs or an issue, ideally desktop and mobile widths.
2. **A local screenshot command** checked into the repo, such as a Playwright script that starts the frontend and saves route screenshots.
3. **A temporary preview URL** that does not require private credentials, plus test login details if auth is required.
4. **Route-specific acceptance notes**, such as “check `/characters/new/premade` at 390px and 1440px”.

Never commit real secrets, production tokens, or private user data for visual review.

---
Last Updated: July 9, 2026
