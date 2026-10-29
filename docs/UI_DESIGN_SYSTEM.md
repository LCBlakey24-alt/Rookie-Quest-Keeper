# Rookie Quest Keeper UI Design System

This is the current user-approved design direction, **29 October 2026**. It supersedes the older wax-red full-control fill and the unapproved craft-paper wallpaper. The Guild Command layout remains the chosen UI.

## Direction: Guild Command / flat navy / citrus gradient lines

- **Page background:** solid ink navy `#0B1B2B`. No wallpaper image, paper grain, textured page surfaces or darkened overlay.
- **Deep rail:** `#07131F`; **panels:** `#142638` or `#1E2936`; **cards:** `#263748`; **normal controls:** `#263F59`.
- **Primary text:** warm cream `#F5F1E8`; muted labels `rgba(234,223,200,0.78)`; support blue `#6E91B4`.
- **Accent gradient:** solid yellow `#F2C94C` across the first **28%**, blend through ember red-orange `#F15A32` at **50%**, reach deep red-orange `#D8432D` at **72%**, then hold solid deep red-orange for the final **28%**. Most colour change happens in the middle, not across the entire line. Percentages scale naturally from short tab underlines to long section rules.
- The accent is ONLY a thin **2–3px rule, tab underline, selected-sidebar marker or section divider**. Never fill a page, button, card, modal, or tab with gradient.
- Brand logo may retain its approved gold and red wax-seal artwork; do not recolour the supplied logo asset.
- Antique gold may appear in existing brand typography, **not** as interactive fills/borders; main interface headings are cream.
- Semantic danger, success, warning, healing and damage colours retain their meanings. Blood orange is a brand accent, **not** danger red.

## Interaction

| State | Appearance |
| --- | --- |
| Resting tab/button | Flat navy-blue with cream text and subdued border |
| Hover (fine pointer) | Yellow-to-blood-orange underline sweeps left to right in ~340ms |
| Press / keyboard focus | Same underline; blue focus outline remains visible |
| Selected tab or nav | Blue body, **persistent** full-width 3px citrus underline |
| Disabled / busy | No selection underline; separate muted/loading affordance |
| Reduced motion | Immediate visual state, no sweep |

Do not paint full controls with red, gold, or gradients. Never use a pseudo-element that hides a real focus ring or competes with existing map/rail indicators. Current implementation: `frontend/src/styles/citrusCommand.css`, imported last after `guildCommand.css` in `frontend/src/index.js`. `waxSealInteractive.css` and `guildBlueTexture.css` are **not** part of the approved web entrypoint.

## Where this applies

One palette across landing, registration/sign-in, player dashboard, GM Command Centre, campaign tools, character sheets, NPC/bestiary rosters, Live Play, loading/recovery states, and player-facing/TV displays. The wallpaper reset applies to outer page surfaces only: keep artwork, battle maps, stat-block reading backgrounds and status indicators readable and untouched.

### Layout

- **Phone, up to 719px:** one-column content, bottom/compact navigation, touch targets ~46px; avoid sideways scrolling.
- **Tablet, 720–1180px:** compact touch-first navigation, one/two columns, 44px controls.
- **Desktop, 1181px+:** Guild Command labelled left sidebar and flexible main panel. Keep long lists independently scrollable, not the entire display unnecessarily.
- **TV, 1280×720 or 1920×1080:** keep presented NPCs, maps and scenes inside the actual screen viewport; no clipped primary content.

## Accessibility and consistency

Use Manrope for functional UI and the approved display font only for titles. Phone inputs should be at least 16px. Preserve semantic HTML, aria-current/aria-selected, keyboard operation, visible focus outlines and `prefers-reduced-motion`. Do not change data, routes or device capability as a visual side effect.

Use tests and live browser QA on 390×844, 768×1024, 1440×900, and 1920×1080. Confirm selected/hover states, reduced motion, no textured canvas, no gold/red filled normal controls, and contrast over actual campaign content.

## Implementation sequence

1. Site-wide flat navy, tokens and accent behaviour.
2. Landing/auth and campaign navigation.
3. Character sheet, rosters, GM/Live Play and second screen.
4. Verify on mobile, tablet, desktop and TV.
5. Remove obsolete wax/texture drafts from the release path; only then integrate safely into `main`.

Historical design boards are still authoritative for the **logo**, not for the replaced old wax-filled navigation or discarded wallpaper.


## Approved Guild Command dashboard (29 October)

The GM dashboard now draws its party list from the existing campaign-scoped player roster endpoint. Never populate the UI with example characters, fictitious HP, dates, counts or encounters. Show real loaded data, honest empty and unavailable states, and a link to the existing Players workspace. Five summary cards are responsive and remain readable from phone to desktop; desktop displays a two-column quest/party composition with notes and prep below. The approved final look is illustrated by the user's navy Guild Command mockup; actual record content remains independent of that mockup.

The shared palette is **solid yellow 0–28% → ember red-orange at 50% → deep red-orange 72–100%**. The gradient is always a slim accent, never a full selectable background.
