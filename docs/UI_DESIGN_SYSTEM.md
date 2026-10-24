# Rookie Quest Keeper UI Design System

This document is the visual lock for Rookie Quest Keeper.

## Chosen direction: Navy / Wax-Seal Red / Cream / Gold Text

RQK uses one calm, premium interface across landing, auth, player, GM and utility routes:

- **Deep navy canvas:** `#0B1B2B`
- **Deep rail:** `#07131F`
- **Panel navy:** `#1E2936`
- **Card/control navy:** `#263748`
- **Hover navy:** `#334155`
- **Warm cream primary text:** `#EADFC8`
- **Muted cream secondary text:** `rgba(234,223,200,0.78)`
- **Antique gold TEXT only:** `#C9A96B` (headings/wording; never interactive fills or borders)
- **Unselected control blue:** `#263F59`
- **Selected and hovered control wax red:** `#7E2D2D`
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
| Decorative text | `#C9A96B` | Selected headings and written emphasis only |
| Resting button or tab | `#263F59` | All normal selectable controls |
| Selected/hovered control | `#7E2D2D` | Wax-red left-to-right fill; persistent once selected |
| Supporting UI | `#6E91B4` | Icons, information, progress, keyboard focus |
| Neutral hairline | `rgba(137,157,176,0.14)` | Default structural border |
| Strong line | `rgba(110,145,180,0.36)` | Blue control border; never gold |
| Success | `#5FA67A` | Success only |
| Warning | `#D39A43` | Warning only |
| Danger | `#B94A4F` | Destructive/error only |

## Global rules

1. One palette across the product. Routes may rearrange layout, not invent new themes.
2. No decorative gradients, purple/pink neon accents, fantasy glow haze or “Tron” styling.
3. Antique gold can only colour written text. No gold selectable boxes, borders, buttons, active tabs or card accents.
4. Unselected controls are dark navy-blue; hovered/pressed controls sweep wax-seal red from left to right; selected controls remain wax-red. This red is distinct from destructive/error red.
5. Blue supports resting control surfaces, information, icons and focus.
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

- Default: solid dark navy-blue (#263F59), cream text, neutral-blue border.
- Primary: the same navy-blue; never gold filled or gold bordered (including landing CTAs).
- Hover/press: wax-seal red (#7E2D2D) sweeps from left to right over ~340ms.
- Selected: retains its wax-seal red fill after the pointer moves away.
- Focus: supporting-blue outline.
- Destructive: semantic danger red only.
- Text: warm cream.

## Cards and panels

- Panel background: `#1E2936`.
- Card background: `#263748`.
- Default border: neutral blue-grey hairline.
- Active border: wax-seal red.
- Shadow: normally none.
- Gradient: never in normal product chrome. A moving solid wax-red overlay for interaction feedback is allowed.

## Inputs

- Background: `#101F2D`.
- Text: warm cream.
- Placeholder/helper copy: muted cream.
- Default border: neutral hairline.
- Focus: blue border and visible blue focus outline.

## Navigation and tabs

- Unselected: transparent or flat navy.
- Icons: cream or supporting blue.
- Selected: wax-seal red fill and cream text, never gold.
- Desktop hover: wax-seal red sweeps from left to right; no instantaneous red background jump.
- Reduced motion: skip the sweep, change appearance immediately.
- Mobile: bottom app dock.
- Tablet: compact icon rail.
- Desktop: permanent labelled rail.

## Loading, empty and error states

They use exactly the same palette and spacing system as the rest of Keeper. Errors may use semantic danger red, but loading/empty states must not fall back to retired themes.

## Chosen campaign workspace: Guild Command (24 October 2026)

The GM campaign workspace adopts **Option 1: Guild Command**.

- **Desktop (1181px and up):** persistent grouped campaign sidebar for Campaign, World, Prep and More, next to a wide, data-backed GM overview. The global app-level navigation stays intact.
- **Tablet (720–1180px):** existing compact grouped navigation and tool finder; preserve room for maps, encounters and character details.
- **Phone (719px and below):** existing one-control tool picker, reachable Live Play action and touch targets; never require horizontal page scrolling.
- **GM Home:** start with the campaign command heading, quick Live Play/Prep Session actions and honest counts fetched for that campaign. Below those are at-table quick tools, current quest, next scene, latest notes and NPCs. Missing data is shown as unavailable, not zero.
- **Selection:** dark-blue resting controls with the shared 340ms left-to-right wax-red fill on hover, click or selected state. Antique gold is only for written headings, never a control background or border.
- **Safety:** preserve URL hash deep links, campaign ownership/privacy checks, join codes, and the entire existing tool catalog. The style does not edit campaign data.

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
