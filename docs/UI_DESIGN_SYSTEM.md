# Rookie Quest Keeper UI Design System

This document is the visual lock for Rookie Quest Keeper.

## Chosen direction: Professional Navy / Gold / Cream

RQK uses one calm, premium interface across landing, auth, player, GM and utility routes:

- **Deep navy canvas:** `#0B1B2B`
- **Deep rail:** `#07131F`
- **Panel navy:** `#1E2936`
- **Card/control navy:** `#263748`
- **Hover navy:** `#334155`
- **Warm cream primary text:** `#EADFC8`
- **Muted cream secondary text:** `rgba(234,223,200,0.78)`
- **Antique gold primary accent:** `#C9A96B`
- **Gold hover/highlight:** `#D9BC82`
- **Supporting blue:** `#6E91B4`

There are no decorative gradients, neon theme colours or glow-heavy surfaces in the normal product UI.

## Colour placement

| Role | Colour | Rule |
| --- | --- | --- |
| App canvas | `#0B1B2B` | Default page background |
| Deep rail | `#07131F` | Navigation / deepest chrome |
| Panel | `#1E2936` | Main grouped surfaces |
| Card/control | `#263748` | Cards, buttons, inputs |
| Hover | `#334155` | Hover/raised interactive state |
| Primary text | `#EADFC8` | Headings, controls, key values |
| Secondary text | `rgba(234,223,200,0.78)` | Body copy |
| Muted text | `rgba(234,223,200,0.60)` | Metadata/helper copy |
| Brand action | `#C9A96B` | Primary borders, active markers, CTA emphasis |
| Supporting UI | `#6E91B4` | Icons, information, progress, keyboard focus |
| Neutral hairline | `rgba(137,157,176,0.14)` | Default structural border |
| Strong line | `rgba(201,169,107,0.30)` | Active/focus border |
| Success | `#5FA67A` | Success only |
| Warning | `#D39A43` | Warning only |
| Danger | `#B94A4F` | Destructive/error only |

## Global rules

1. One palette across the product. Routes may rearrange layout, not invent new themes.
2. No decorative gradients, purple/pink neon accents, fantasy glow haze or “Tron” styling.
3. Gold is the primary brand/action accent. Do not use danger red as decoration.
4. Blue supports information, icons and focus; it is not a second competing brand.
5. Keep text hierarchy: primary cream, secondary cream, muted cream. Do not flatten every line to full white.
6. Panels use flat navy steps and subtle borders rather than shadows for depth.
7. Rounded corners stay restrained: generally 5–9px.
8. Cards exist to organise information, not to wrap every sentence.
9. Touch controls remain at least ~44–46px on mobile/tablet.
10. Mobile, tablet and desktop expose the same major capabilities.

## Responsive layout contract

The JavaScript and CSS device lanes must agree:

- **Mobile:** `<= 719px` — single-task flow, bottom navigation, 46px controls, one-column content.
- **Tablet:** `720–1180px` — compact icon rail, touch-first 1–2 column workspace, 44px controls.
- **Desktop:** `>= 1181px` — labelled rail, wide workspace, 40px controls, deliberate multi-column layouts.

Desktop gets more space, not more features.

## Typography

- UI/body: Manrope or the shared sans-serif token.
- Display/fantasy fonts are reserved for deliberate branding moments, not dense UI.
- Use weight, spacing and muted colour for hierarchy before increasing font size.
- Inputs on phones stay at least 16px to avoid browser focus zoom.

## Buttons

- Default: flat navy card fill.
- Primary: navy fill with antique-gold border; landing CTAs may use a gold fill where contrast is strong.
- Hover: lighter navy.
- Focus: supporting-blue outline.
- Destructive: semantic danger red only.
- Text: warm cream.

## Cards and panels

- Panel background: `#1E2936`.
- Card background: `#263748`.
- Default border: neutral blue-grey hairline.
- Active border: antique gold.
- Shadow: normally none.
- Gradient: never in normal product chrome.

## Inputs

- Background: `#101F2D`.
- Text: warm cream.
- Placeholder/helper copy: muted cream.
- Default border: neutral hairline.
- Focus: gold border with blue focus outline.

## Navigation and tabs

- Unselected: transparent or flat navy.
- Icons: cream or supporting blue.
- Selected: subtle supporting-blue fill + gold marker/border.
- Mobile: bottom app dock.
- Tablet: compact icon rail.
- Desktop: permanent labelled rail.

## Loading, empty and error states

They use exactly the same palette and spacing system as the rest of Keeper. Errors may use semantic danger red, but loading/empty states must not fall back to retired themes.

## Cleanup order

1. Global tokens and shell.
2. Landing and auth.
3. Home/dashboard and libraries.
4. Character creator and character sheet.
5. Campaign Prep and Live Play.
6. Rook and floating utilities.
7. Maps, NPCs, inventory, handouts and other GM tools.
8. Homebrew/admin/low-frequency utilities.
9. Retire superseded CSS instead of adding more override layers.
10. Keep visual contract tests aligned with the source of truth.
