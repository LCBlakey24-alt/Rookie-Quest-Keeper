# Rookie Quest Keeper Design System

This file and `docs/UI_DESIGN_SYSTEM.md` define the same visual contract. If older documentation, CSS comments or route-specific styles disagree, this document wins.

## Canonical visual references

The approved visual reference assets live in Google Drive:

```text
03 - Rookie Quest Keeper/
  00 - Brand & Visual Identity/
    01 - Logos/
    02 - Design Boards/
      Rookie-Quest-Keeper__Guild-Ledger__Design-Board__Approved.png
      Rookie-Quest-Keeper__Guild-Ledger__Logo-Board__Approved.png
    90 - Superseded & Legacy/
```

For visual work, use this precedence:

1. A newer explicit product/design decision from the project owner.
2. The approved Guild Ledger Design Board and Logo Board above.
3. This document and `docs/UI_DESIGN_SYSTEM.md` as the implementation contract.
4. `AGENTS.md` as the concise agent summary.
5. Existing route CSS, screenshots, historical docs and legacy assets.

Anything under `90 - Superseded & Legacy` is historical reference only and must not be used as the basis for new UI work.

If an agent cannot access Google Drive, it must use this document rather than inventing a replacement theme. Do not infer a new palette from old screenshots or existing legacy CSS.


## 1. Product identity

Rookie Quest Keeper is a premium TTRPG companion for players and GMs. It should feel like a focused fantasy command journal: dark, readable, practical, app-like and slightly dramatic without becoming theatrical.

The UI should not feel like:

- a generic white SaaS dashboard
- parchment or tavern decoration
- neon cyberpunk
- a collage of unrelated cards
- a different theme on every route

## 2. UX priority

Use this order when design goals conflict:

1. Clarity
2. Speed
3. Consistency
4. Accessibility
5. Responsive usability
6. Visual polish
7. Immersion

Decoration never wins over legibility or table-speed.

## 3. Core visual language

The currently approved visual system is **solid deep navy + warm cream + blue controls + thin bright-orange-to-red gradient accent lines** (29 October 2026). The Guild Command layout remains in force. This overrides the earlier full-card wax-red design and rejects the craft-paper wallpaper.

- Navy supplies structure and depth.
- Cream supplies readable hierarchy.
- **Antique gold is text-only**: titles, special headings and deliberate written emphasis. Never use antique gold for control fills, borders, icons, selected boxes or backgrounds.
- Resting, hovered and selected clickable bodies stay dark blue (`#0B1B2B`). Only a thin 3px bright orange → orange-red → red **underline** sweeps left to right on hover/press, remaining in place for selected controls. **The gradient itself holds solid bright orange for 0–28%, blends through orange-red at 50%, and holds solid red for 72–100%; the blend is concentrated in the middle.**
- Blue supports information, icons, progress and keyboard focus.
- Red is semantic danger/error only.
- Green is semantic success only.
- Amber is semantic warning only.

Do not reintroduce neon pink, broad red decoration, purple theme drift, gradient-filled controls, wallpaper textures or glow-heavy chrome. The **one allowed decorative gradient** is the restrained citrus underline/section rule.

## 4. Colour tokens

> **Palette decision, 11 November 2026 (owner-approved).** The app moved from ink navy with antique brass to a stronger deep blue with the default dice's orange accent, so pages match the 3D dice (blue faces, white numerals, orange edge glow).
>
> - Page and surfaces: `#0A2342` (one flat surface colour, as before).
> - Accent, primary actions and headings: `#F2892F`; brighter edge `#FFB066`.
> - Text: `#FFFFFF`, with 78% and 60% white for secondary and muted text.
> - Information and focus support stays ledger blue `#3C92E0`; unselected shapes on wheels glow light blue `#6FB8FF`.
> - Glow sits inside a shape only, at half its earlier strength (`--guild-glow: 0.5` in `frontend/src/styles/guildTokens.css`).
>
> Where the tables below still name brass (`#C9A96B`, `#D6A84F`) or ink (`#0B1B2B`), read the values above. Status colours are unchanged.

Use tokens instead of route-specific hardcoded colours wherever possible.

```css
:root {
  --rq-bg: #0B1B2B;
  --rq-bg-main: #0B1B2B;
  --rq-bg-deep: #0B1B2B;
  --rq-bg-rail: #0B1B2B;
  --rq-bg-panel: #0B1B2B;
  --rq-card: #0B1B2B;
  --rq-card-hover: #0B1B2B;
  --rq-bg-input: #0B1B2B;

  --rq-gold-text: #C9A96B; /* headings/text only */
  --rq-control-blue: #0B1B2B;
  --rq-citrus-yellow: #FF8A1F;
  --rq-ember-red-orange: #F4551F;
  --rq-citrus-blood: #E03A2F;
  --rq-citrus-gradient: linear-gradient(90deg, #FF8A1F, #F4551F, #E03A2F);
  --rq-primary: #C9A96B; /* legacy text accent; NOT a control background */
  --rq-primary-hover: #D9BC82; /* text hover only */
  --rq-primary-soft: rgba(201, 169, 107, 0.12);
  --rq-accent-primary: #C9A96B; /* legacy text accent only; interactive accents use --rq-citrus-gradient */
  --rq-accent-hover: #D9BC82; /* text only */
  --rq-accent-soft: rgba(201, 169, 107, 0.12);
  --rq-accent-border: rgba(60, 146, 224, 0.30); /* controls use neutral blue */

  --rq-secondary: #3C92E0;
  --rq-secondary-soft: rgba(60, 146, 224, 0.10);

  --rq-text-primary: #EADFC8;
  --rq-text-secondary: rgba(234, 223, 200, 0.78);
  --rq-text-muted: rgba(234, 223, 200, 0.60);
  --rq-faint: rgba(234, 223, 200, 0.46);

  --rq-line: rgba(137, 157, 176, 0.14);
  --rq-line-strong: rgba(201, 169, 107, 0.30);

  --rq-success: #5FA67A;
  --rq-warning: #D39A43;
  --rq-danger: #B94A4F;
  --rq-info: #3C92E0;

  --rq-radius: 7px;
  --rq-inner-radius: 5px;
}
```

### Colour rules

- Default structural borders use `--rq-line`, not gold.
- Thin citrus gradient lines mark active selections and the hover/press sweep; antique gold only marks existing branding/text emphasis.
- Blue may mark information, progress, selected support and focus.
- Body copy uses secondary text, not full-strength primary text.
- Helper/meta copy uses muted text.
- Destructive actions must use danger styling and must not look like normal primary actions.
- Do not use colour alone to communicate status.

## 5. Typography

### UI/body

Use the shared sans-serif stack (currently Manrope) for:

- body copy
- buttons
- inputs
- tables
- cards
- stats
- notes
- spell descriptions
- dense GM tools

### Display branding

A fantasy/display face may appear in branding or a deliberate hero/title moment. It must not leak into dense controls or long-form text.

### Hierarchy

Prefer:

- weight
- spacing
- text tier
- alignment

before increasing font size.

Do not force all text to full white/cream. A professional screen needs visible primary, secondary and muted tiers.

## 6. Surfaces and shape

- Page: deep navy.
- Panel: `--rq-bg-panel`.
- Card/control: `--rq-card`.
- Hover: `--rq-card-hover`.
- Input: `--rq-bg-input`.
- Normal shadows: none or extremely restrained.
- Flat page and panel backgrounds only, with no wallpaper image. The restrained bright orange→red gradient is limited to 2–3px lines/underlines.
- Standard radius: 5–9px.
- Avoid giant pills and bubbly SaaS panels.

Cards should organise information. Do not create a box around every sentence.

## 6a. Wheels (owner-approved, 12 November 2026)

Rookie's signature control is the **wheel**: a round ring of wedges inside a hexagon, with a hexagon button in the centre. The `guild-motif/GuildChoiceWheel` component draws one.

- **Not triangular wedges.** The ring is round. The hexagon is only the case around it and the centre button.
- **The centre hexagon opens the 3D dice roller.** The one exception is a wheel used to make a choice (race, class, and other creator choices). There the centre is **Confirm**: it confirms the option at the top and moves on, running the same checks as Next.
- **Selection** is the wedge resting under the pointer at the top. Drag the ring, tap a wedge, or use the arrow keys.
- **Glow** sits inside each shape only: light blue on ordinary wedges, orange on the selected wedge, the case and the centre.
- **Labels** on the ring turn with their wedge.
- Every wheel offers a plain list alternative (Show as list).

## 7. Buttons and controls

### Default

- Navy fill.
- Neutral border.
- Cream text.

### Primary

- Dark navy-blue fill with neutral blue border; antique gold is not a control border.
- Gold-filled CTAs are not allowed, including the landing page. Primary buttons remain blue; only the 3px underline animates into the citrus gradient.

### Hover

- Lighter navy.
- Left-to-right bright orange→red **underline** on hover (desktop fine pointers), press and keyboard focus; never a full-control colour swap.

### Focus

- Clear blue focus outline.
- Never remove focus indication without replacing it.

### Touch sizes

- Mobile: about 46px minimum.
- Tablet: about 44px minimum.
- Desktop: about 40px minimum where pointer input is expected.

Phone form inputs should use at least 16px text to avoid browser focus zoom.

## 8. Responsive layout contract

The canonical breakpoints live in `frontend/src/layouts/deviceLayout.js`:

- **Mobile:** `<= 719px`
- **Tablet:** `720–1180px`
- **Desktop:** `>= 1181px`

CSS device lanes must agree with these values.

### Mobile

- Full product capability.
- One main task/section at a time.
- Bottom navigation dock.
- One-column content by default.
- No horizontal page scrolling.
- Dense tab bars scroll horizontally rather than wrap into unusable rows.
- Important actions remain thumb-friendly.

### Tablet

- First-class at-the-table experience.
- Compact icon rail.
- 1–2 columns where usable width permits.
- Touch-first controls.
- Avoid a desktop-width sidebar consuming the workspace.

### Desktop

- Permanent labelled rail.
- Wider multi-column workspace.
- Maximum useful line/content width rather than infinite stretching.
- Desktop gets more simultaneous visibility, not exclusive features.

## 9. Navigation

Selected navigation uses:

- dark blue unselected fill
- dark blue selected fill, with warm cream label/icon and persistent citrus underline
- a left-to-right **underline-only** citrus sweep on hover/press
- independent blue keyboard-focus outline

Unselected navigation should remain calm and readable.

Do not use gradient fills or neon states; gradient accent **lines** are the approved exception.

## 10. Forms

Inputs must:

- use the shared input navy
- use cream text
- expose visible labels
- use muted placeholder/helper text
- show a visible focus state
- preserve practical touch targets
- display errors next to the relevant field where possible

## 11. Status semantics

Use semantic colours consistently:

- Success: green.
- Warning: amber.
- Error/danger/destructive: red.
- Information/focus: blue.
- Selected/hovered controls: blue body with persistent citrus underline; antique gold is text-only.

Never use danger red as the normal brand accent.

## 12. Route consistency

Landing, auth, player, GM, character creator, character sheet, campaign tools, Rook, homebrew and admin all belong to the same product.

A route may have different information density or geometry. It may not invent a different palette.

Route CSS should consume global tokens. If a legacy variable name such as `pink` or `red` must remain for compatibility, map it to the correct current token and document it as a legacy alias.

## 13. Accessibility

- Preserve visible keyboard focus.
- Respect `prefers-reduced-motion`.
- Use sufficient text/background contrast.
- Never rely only on colour for active/error state.
- Do not shrink text below comfortable reading sizes just to make a layout fit.
- Preserve safe-area spacing for mobile navigation.
- Avoid focus zoom on mobile inputs.

## 14. Motion

The bright-orange-to-red **3px underline** sweeps from left to right over **340ms**; no button-fill transition. It is interaction feedback, not loading. Never delay navigation and honour `prefers-reduced-motion` with an immediate state change.


Motion should communicate:

- state change
- progress
- opening/closing
- successful interaction

Avoid ambient lasers, shimmer, constant glow, bouncing or decorative motion in normal product UI.

## 15. Visual review sizes

At minimum review:

| Lane | Reference |
| --- | --- |
| Mobile portrait | 390 × 844 |
| Tablet portrait | 768 × 1024 |
| Tablet landscape | 1024 × 768 |
| Desktop | 1440 × 900 |

Verify no horizontal overflow, clipped controls, unreadable text, off-screen modals or desktop-only capability.

## 16. CSS maintenance

The repo has historical theme layers. New work must reduce drift, not add another competing skin.

Rules:

1. Prefer changing the final authority/token source.
2. Retire superseded overrides when safe.
3. Avoid new global `!important` layers unless resolving a documented legacy collision.
4. Keep layout rules in device/route layout files and colour rules in theme files.
5. Update visual contract tests whenever the intentional system changes.
6. Do not “fix” a page by hardcoding a one-off colour that bypasses tokens.

## 17. Definition of visually complete

A route is visually complete when:

- it uses the shared palette
- primary/secondary/muted text hierarchy is obvious
- cards and sections align to a consistent spacing rhythm
- controls have consistent heights and states
- active/hover/focus/destructive states are unambiguous
- mobile/tablet/desktop all remain usable
- no gold/red-filled normal controls, craft-paper wallpaper, or gradients other than thin citrus accent lines
- empty/loading/error states match the product
- the page looks like part of Keeper without needing route-specific explanation

The intended result is a cohesive TTRPG web app: **flat navy structure, cream readability, blue controls, bright-orange-to-red gradient underlines and semantic status colours.**
