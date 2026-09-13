# Rookie Quest Keeper UI Design System

This document is the visual lock for Rookie Quest Keeper 1.0.

## Chosen direction: Flat Navy / Blue / Neon Pink

RQK uses one minimalist interface across the entire product:

- **Deep navy canvas:** `#071522`
- **Panel navy:** `#0C2234`
- **Card/control navy:** `#102B40`
- **Hover navy:** `#14344C`
- **Flat white text:** `#FFFFFF`
- **Secondary light blue:** `#7CCBFF`
- **Neon pink accent:** `#FF2DAA`

There are **no gradients** in the product design.

## Colour placement

| Role | Colour | Rule |
| --- | --- | --- |
| App canvas | `#071522` | Default page background |
| Deep rail | `#06111C` | Navigation / deepest chrome |
| Panel | `#0C2234` | Main grouped surfaces |
| Card/control | `#102B40` | Cards, buttons, inputs |
| Hover | `#14344C` | Hover/raised interactive state |
| Text | `#FFFFFF` | All readable text |
| Secondary UI | `#7CCBFF` | Icons, progress, subtle selected support |
| Accent | `#FF2DAA` | Hairline borders, focus, active markers |
| Hairline | `rgba(255,45,170,0.18)` | Default border |
| Strong line | `rgba(255,45,170,0.42)` | Active/focus border |

## Global rules

1. No gradients of any kind.
2. No coloured text hierarchy: readable text remains white.
3. No purple/sunset/orange/gold visual treatment.
4. No broad red or grey page themes.
5. No glow shadows, text glow, haze or decorative bloom.
6. Neon pink should normally be thin, not a large filled block.
7. Light blue is secondary UI support, not body text.
8. Panels should use flat navy steps rather than shadows for depth.
9. Rounded corners stay restrained: generally 5–9px.
10. Every route family uses this same visual system.

## Layout language

### GM Prep
Information-first. The default view should surface the current quest, last-session recap, current location, next planned scene, important NPCs and upcoming events before exposing deep campaign tools.

### Live Play
Dense but calm. Core session information stays visible while tools open on demand. Avoid decorative chrome that competes with table information.

### Player / Character
Flatter than GM Prep. Put character status and actions near the top, keep tabs simple, and avoid stacked decorative cards.

### Auth / Landing
Use the same product palette as the signed-in experience. Do not create a separate marketing theme.

## Buttons

- Default: flat navy card fill.
- Primary: flat navy fill + 1px neon-pink border.
- Hover: slightly lighter navy.
- Focus: 1px neon-pink outline.
- Text: always white.
- Icons: white or light blue.

## Cards and panels

- Background: `#0C2234` or `#102B40`.
- Border: 1px low-opacity pink.
- Shadow: none.
- Gradient: never.
- Use whitespace and headings to separate content instead of decorative effects.

## Inputs

- Background: `#081B2A`.
- Text: white.
- Placeholder: white at reduced opacity.
- Border: low-opacity pink.
- Focus: neon-pink border/outline.

## Navigation and tabs

- Unselected: transparent or flat navy; white label.
- Icon: light blue.
- Selected: subtle light-blue fill + neon-pink border/marker.
- No gradient active states.

## Loading and empty states

Loading, error, empty and setup screens use exactly the same flat palette. They must not fall back to old purple/gold/red designs.

## Cleanup order

1. Global tokens and shell.
2. Landing and auth.
3. Home/dashboard and libraries.
4. Campaign Prep.
5. Live Play.
6. Character sheet/player views.
7. Rook and global utilities.
8. Maps, NPCs, inventory, handouts and other GM tools.
9. Character creator/homebrew.
10. Admin and low-frequency utilities.
11. Remove retired CSS and update visual regression tests.
