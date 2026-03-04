# Quest Keeper - Arcane SaaS Design System

## Overview
A modern dark fantasy design system for the TTRPG Game Master companion tool. Combines professional SaaS dashboard aesthetics with subtle magical fantasy elements.

## Color Palette

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-void` | #0B0F19 | Main app background |
| `--bg-panel` | #111827 | Primary panels/cards |
| `--bg-secondary` | #1F2937 | Secondary panels, inputs |
| `--bg-elevated` | #374151 | Elevated elements, tooltips |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--arcane-purple` | #7C3AED | Primary accent, buttons, focus states |
| `--arcane-purple-light` | #8B5CF6 | Hover states, gradients |
| `--magic-cyan` | #22D3EE | Secondary accent, links, success states |
| `--gold-accent` | #F59E0B | Highlights, badges, warnings |

### Status Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--success-green` | #10B981 | Success messages, HP bars |
| `--danger-red` | #EF4444 | Errors, delete actions, damage |
| `--warning-amber` | #F59E0B | Warnings, notifications |

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | #E5E7EB | Body text, descriptions |
| `--text-secondary` | #9CA3AF | Secondary text, labels |
| `--text-muted` | #6B7280 | Placeholders, hints |
| `--text-white` | #F9FAFB | Headings, emphasized text |

## Typography

### Font Families
- **Headings**: `'Cinzel', serif` - Fantasy-inspired, elegant serif
- **Body**: `'Inter', sans-serif` - Clean, highly readable sans-serif

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

### Font Sizes
| Size | Class | Usage |
|------|-------|-------|
| 42px | `.logo-title` | Main logo |
| 24px | `h1` | Page titles |
| 20px | `h2` | Section headings |
| 16px | `h3` | Card titles |
| 14px | Body | Primary content |
| 13px | Small | Secondary content |
| 11px | Tiny | Labels, badges |

## Components

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(135deg, #7C3AED, #8B5CF6);
  color: white;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
}

/* Secondary Button */
.btn-secondary {
  background: #1F2937;
  border: 1px solid #1F2937;
  color: #E5E7EB;
}
.btn-secondary:hover {
  border-color: #22D3EE;
  color: #22D3EE;
}
```

### Cards
```css
.card {
  background: #111827;
  border: 1px solid #1F2937;
  border-radius: 14px;
  padding: 20px;
}
.card:hover {
  border-color: rgba(124, 58, 237, 0.3);
  box-shadow: 0 0 25px rgba(124, 58, 237, 0.15);
}
```

### Inputs
```css
.input {
  background: #0B0F19;
  border: 1px solid #1F2937;
  border-radius: 10px;
  color: #E5E7EB;
}
.input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}
```

### Tabs
```css
.tab-item {
  background: transparent;
  color: #9CA3AF;
}
.tab-item.active {
  color: #F9FAFB;
  background: #1F2937;
  box-shadow: inset 0 -2px 0 #7C3AED;
}
```

## Visual Effects

### Glow Effects
```css
/* Purple glow */
box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);

/* Cyan glow */
box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);

/* Gold glow */
box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
```

### Background Pattern (Subtle Runes)
```css
background-image: url("data:image/svg+xml,...rune-pattern...");
```

### Animations
- `glow-pulse`: Subtle glow animation for active elements
- `float`: Floating animation for decorative elements
- `shimmer`: Loading shimmer effect

## Spacing

### Radius Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small elements, badges |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 14px | Cards, panels |
| `--radius-xl` | 20px | Modals, large containers |

## Accessibility

- All interactive elements have focus states with purple outline
- Text contrast ratios meet WCAG AA standards
- Focus-visible styling for keyboard navigation
- Smooth transitions (200ms ease) for reduced motion

## Dark Mode Only
This design system is optimized for dark mode only. No light theme is provided.

---
Last Updated: March 4, 2026
