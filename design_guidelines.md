# Rookie Quest Keeper — RQK 1.0 Minimalist Design System

## Overview

Rookie Quest Keeper 1.0 uses one flat visual language across the whole product: a very dark navy canvas, flat white text, light-blue secondary UI, and neon-pink hairline accents. The product must not use gradients, glow effects, purple sunset styling, broad red themes, parchment, brown fantasy styling, or page-specific colour systems.

The interface should feel clean, modern, fast, game-ready, and deliberately restrained. Layout and hierarchy should create personality; colour should not be doing all the work.

## Core palette

| Token | Value | Usage |
| --- | --- | --- |
| `--rq-bg-main` | `#071522` | Main app canvas |
| `--rq-bg-rail` | `#06111C` | Navigation rail / deepest surface |
| `--rq-bg-panel` | `#0C2234` | Main panels |
| `--rq-bg-panel-alt` | `#102B40` | Cards and controls |
| `--rq-card-hover` | `#14344C` | Hover / raised interaction surface |
| `--rq-secondary` | `#7CCBFF` | Secondary UI, icons and supporting states |
| `--rq-accent-primary` | `#FF2DAA` | Neon-pink active marker / border |
| `--rq-text-primary` | `#FFFFFF` | All readable text |
| `--rq-border-default` | `rgba(255,45,170,0.18)` | Hairline border |
| `--rq-border-strong` | `rgba(255,45,170,0.42)` | Stronger active/focus border |

## Non-negotiable rules

1. **No gradients.** Do not add `linear-gradient`, `radial-gradient`, `conic-gradient`, gradient text, or gradient borders.
2. **All readable text is flat white.** Do not use blue, pink, grey, purple, gold, orange, or red for normal text hierarchy.
3. **Neon pink is a line/accent colour, not a page fill.** Use it for thin borders, active markers, focus outlines, dividers, selected states, and tiny accents.
4. **Light blue is secondary UI.** Use it for icons, restrained selected-state fills, secondary controls, progress/support indicators, and occasional non-text affordances.
5. **No glow effects.** Avoid coloured box-shadows, text-shadows, bloom, neon haze, or soft gradient washes.
6. **Use flat surfaces.** Build depth with `#071522`, `#0C2234`, `#102B40`, and `#14344C`.
7. **Keep radii restrained.** Default to 5–9px. Avoid pill-shaped controls unless the control genuinely benefits from that shape.
8. **No page-specific colour themes.** GM, player, character, homebrew, maps, inventory, admin, auth, and landing all use the same palette.
9. **Semantic exceptions must be functional, not decorative.** Destructive/error states may use a dedicated warning treatment, but never as a theme colour.
10. **Do not add another global polish layer.** Retire or rewrite superseded CSS instead of stacking more visual systems.

## Component guidance

### Primary action

```css
.btn-primary {
  background: #102B40;
  color: #FFFFFF;
  border: 1px solid #FF2DAA;
  border-radius: 5px;
  box-shadow: none;
}
```

### Card

```css
.card {
  background: #0C2234;
  color: #FFFFFF;
  border: 1px solid rgba(255,45,170,0.18);
  border-radius: 7px;
  box-shadow: none;
}
```

### Input

```css
.input {
  background: #081B2A;
  color: #FFFFFF;
  border: 1px solid rgba(255,45,170,0.20);
  border-radius: 5px;
  box-shadow: none;
}

.input:focus-visible {
  border-color: #FF2DAA;
  outline: 1px solid #FF2DAA;
  outline-offset: 2px;
}
```

### Active navigation

```css
.nav-item.is-active {
  background: rgba(124,203,255,0.10);
  color: #FFFFFF;
  border: 1px solid #FF2DAA;
}
```

## Product hierarchy

Use whitespace, typography, grouping and information priority instead of extra colours:

- Main heading: white, high weight.
- Body/helper copy: still white, but smaller/lighter weight.
- Secondary icon: light blue.
- Active/focus marker: neon pink.
- Panels: flat navy family.
- Disabled controls: white at reduced opacity.

## Review checklist

When touching any screen, confirm:

- Flat deep navy canvas.
- All readable text is white.
- Light blue appears only as secondary UI support.
- Neon pink appears primarily as thin lines/active markers.
- No gradients, glow shadows, purple sunset colours, broad red theme, gold/orange accents, parchment, brown, or grey page themes.
- Components use the same spacing/radius language as the rest of RQK.
- Mobile/tablet/desktop all preserve the same design system.
- Old CSS is removed or neutralised rather than given a new competing polish layer.

---
Last Updated: September 8, 2026
