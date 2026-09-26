# Rookie Quest Keeper Design System

This file and `docs/UI_DESIGN_SYSTEM.md` define the same visual contract. If older documentation, CSS comments or route-specific styles disagree, this document wins.

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

The visual system is **deep navy + warm cream + antique gold**, with restrained blue support.

- Navy supplies structure and depth.
- Cream supplies readable hierarchy.
- Gold is the primary brand/action accent.
- Blue supports information, icons, progress and keyboard focus.
- Red is semantic danger/error only.
- Green is semantic success only.
- Amber is semantic warning only.

Do not reintroduce neon pink, broad red decoration, purple theme drift, decorative gradients or glow-heavy chrome.

## 4. Colour tokens

Use tokens instead of route-specific hardcoded colours wherever possible.

```css
:root {
  --rq-bg: #071522;
  --rq-bg-main: #071522;
  --rq-bg-deep: #050E18;
  --rq-bg-rail: #050E18;
  --rq-bg-panel: #0C2234;
  --rq-card: #112A40;
  --rq-card-hover: #17364F;
  --rq-bg-input: #071A29;

  --rq-primary: #D6A84F;
  --rq-primary-hover: #E8C56E;
  --rq-primary-soft: rgba(214, 168, 79, 0.12);
  --rq-accent-primary: #D6A84F;
  --rq-accent-hover: #E8C56E;
  --rq-accent-soft: rgba(214, 168, 79, 0.12);
  --rq-accent-border: rgba(214, 168, 79, 0.30);

  --rq-secondary: #79BCE8;
  --rq-secondary-soft: rgba(121, 188, 232, 0.10);

  --rq-text-primary: #F7F1E7;
  --rq-text-secondary: rgba(247, 241, 231, 0.78);
  --rq-text-muted: rgba(247, 241, 231, 0.60);
  --rq-faint: rgba(247, 241, 231, 0.46);

  --rq-line: rgba(166, 193, 216, 0.14);
  --rq-line-strong: rgba(214, 168, 79, 0.30);

  --rq-success: #59B982;
  --rq-warning: #E3A746;
  --rq-danger: #D85C61;
  --rq-info: #79BCE8;

  --rq-radius: 7px;
  --rq-inner-radius: 5px;
}
```

### Colour rules

- Default structural borders use `--rq-line`, not gold.
- Gold marks primary actions, active states and deliberate emphasis.
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
- Normal gradients: none.
- Standard radius: 5–9px.
- Avoid giant pills and bubbly SaaS panels.

Cards should organise information. Do not create a box around every sentence.

## 7. Buttons and controls

### Default

- Navy fill.
- Neutral border.
- Cream text.

### Primary

- Navy fill with gold border in the app.
- A gold-filled CTA is acceptable on the public landing page when contrast remains strong.

### Hover

- Lighter navy.
- Stronger gold border where the control is primary.

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

- subtle blue support fill
- gold active marker/border
- cream label
- restrained icon emphasis

Unselected navigation should remain calm and readable.

Do not use gradients or filled neon states.

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
- Brand/primary action: gold.

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
- no retired theme colours or decorative gradients appear
- empty/loading/error states match the product
- the page looks like part of Keeper without needing route-specific explanation

The intended result is a cohesive, premium TTRPG application: **navy structure, cream readability, gold identity, blue support, semantic status colours, and device-appropriate geometry.**
