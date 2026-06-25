# Rookie Quest Keeper Design System

> Product direction note: for the current long-term app strategy, Blue Eclipse visual direction, Metal Mania display-font rules, responsive layout strategy, and prototype/testing direction, read `docs/rookie-quest-keeper-product-design-vision.md` before major UI work.

## Instruction for AI Contributors

Any AI assistant, developer, or future contributor editing Rookie Quest Keeper must read and follow this file before making UI or UX changes.

When making changes:

- Do not redesign the whole app unless explicitly asked.
- Preserve the established visual identity.
- Preserve the charcoal, red, and white palette.
- Preserve minimalist sharp-edged panels and boxes.
- Extend existing patterns rather than inventing a new visual language.
- Prioritize usability over novelty.
- Keep Rookie Quest Keeper visually cohesive across all pages.
- Avoid changing layout behaviour while doing purely visual cleanup.

This file is the main source of truth for visual design, UI rules, component styling, and layout behaviour.

---

# 1. Product Identity

## Product Name

**Rookie Quest Keeper**

## Legacy / Repository Name

**Ultimate DM Screen**

## Product Type

A web-based TTRPG campaign companion for Game Masters and Players.

It helps users manage:

- campaigns
- characters
- combat
- notes
- maps
- homebrew
- NPCs
- worldbuilding
- session prep
- session recaps
- live-play tools

## Brand Feeling

Rookie Quest Keeper should feel like a **premium fantasy command centre**.

It should not feel like:

- a generic SaaS dashboard
- a bubbly productivity app
- a parchment-heavy medieval fan page
- a neon cyberpunk interface
- a soft pastel app

It should feel:

- sharp
- practical
- dark
- readable
- focused
- tactical
- modern
- slightly dramatic
- built for live tabletop play

---

# 2. Design Philosophy

## Core Visual Mood

The design should be a minimalist tactical command interface for fantasy storytelling.

Think:

- dark charcoal foundations
- crisp white text
- controlled red highlights
- sharp panel edges
- compact, useful layouts
- clear hierarchy
- strong contrast
- minimal visual noise

## UX Priority Order

Always prioritize in this order:

1. Clarity
2. Speed
3. Consistency
4. Usability
5. Visual polish
6. Immersion

If a decorative design choice makes the app harder to read or slower to use, remove it.

---

# 3. Non-Negotiable Design Rules

## 3.1 Colour Rules

The app must use:

- charcoal / near-black backgrounds
- red accents
- white primary text
- muted grey secondary text

Avoid:

- blue/purple theme drift
- pastel colours
- noisy gradients
- large glowing fantasy effects
- random accent colours per page

Status colours are allowed for success, warning, danger, and info states, but should not overpower the main palette.

## 3.2 Shape Rules

The app must use minimalist, sharp-edged boxes.

Preferred corner radius:

- Small controls: `4px`
- Standard cards: `6px`
- Large panels: `6px–8px`
- Avoid anything above `10px` unless needed for a specific reason.

Avoid:

- huge rounded cards
- pillowy panels
- soft bubble UI
- overly playful SaaS styling

## 3.3 Surface Rules

Every major panel should have:

- a charcoal background
- a clear border
- consistent padding
- sharp or lightly rounded corners
- strong content hierarchy

Panels should feel structured and deliberate.

## 3.4 Typography Rules

Use clean sans-serif fonts for UI.

Recommended fonts:

- Inter
- Manrope
- Geist
- Source Sans 3
- Montserrat if already used globally

Avoid:

- decorative fantasy fonts for body text
- script fonts
- hard-to-read display fonts
- too many font families

Fantasy-style typography may only be used sparingly for branding, logos, or decorative headings.

## 3.5 Layout Rules

Layouts should be:

- grid-based
- aligned
- structured
- practical
- consistent across pages

Avoid:

- floating random widgets
- inconsistent card sizes without purpose
- hidden key controls
- cramped mobile layouts
- overloading a screen with unnecessary decoration

---

# 4. Colour System

## CSS Design Tokens

Use these tokens whenever possible.

```css
:root {
  --rq-bg-main: #1A1A1A;
  --rq-bg-page: #181818;
  --rq-bg-panel: #242424;
  --rq-bg-panel-alt: #2B2B2B;
  --rq-bg-elevated: #323232;
  --rq-bg-input: #1F1F1F;

  --rq-accent-primary: #C1121F;
  --rq-accent-hover: #D62839;
  --rq-accent-active: #A30F1A;
  --rq-accent-soft: rgba(193, 18, 31, 0.12);
  --rq-accent-border: rgba(193, 18, 31, 0.35);
  --rq-accent-strong-border: rgba(193, 18, 31, 0.62);

  --rq-text-primary: #FFFFFF;
  --rq-text-secondary: #D6D6D6;
  --rq-text-muted: #A0A0A0;
  --rq-text-disabled: #6F6F6F;
  --rq-text-inverse: #111111;

  --rq-border-default: #3A3A3A;
  --rq-border-strong: #4A4A4A;
  --rq-border-accent: #C1121F;

  --rq-success: #2E8B57;
  --rq-warning: #F2A900;
  --rq-danger: #C1121F;
  --rq-info: #4F8EF7;

  --rq-radius-sm: 4px;
  --rq-radius-md: 6px;
  --rq-radius-lg: 8px;

  --rq-space-1: 4px;
  --rq-space-2: 8px;
  --rq-space-3: 12px;
  --rq-space-4: 16px;
  --rq-space-5: 20px;
  --rq-space-6: 24px;
  --rq-space-7: 32px;
  --rq-space-8: 40px;

  --rq-shadow-panel: 0 4px 14px rgba(0, 0, 0, 0.22);
  --rq-shadow-heavy: 0 10px 28px rgba(0, 0, 0, 0.32);
}
```

## Colour Usage

### Main Background

Use charcoal or near-black.

Recommended:

- `#1A1A1A`
- `#181818`
- `#111111`

### Main Panels

Use slightly lighter charcoal.

Recommended:

- `#242424`
- `#2B2B2B`
- `#323232`

### Accent Red

Use red for:

- primary CTAs
- selected tabs
- active states
- important warnings
- danger actions
- key highlights
- stat emphasis where appropriate

Do not flood entire pages with red.

### White Text

Use white for:

- page titles
- card titles
- important stats
- button labels
- active states

### Grey Text

Use muted grey for:

- descriptions
- helper text
- labels
- inactive tabs
- metadata

---

# 5. Typography System

## Type Scale

### Page Title

- Size: `32px–40px`
- Weight: `800–900`
- Colour: white
- Letter spacing: tight

### Section Title

- Size: `20px–24px`
- Weight: `700–800`
- Colour: white

### Card Title

- Size: `16px–18px`
- Weight: `700–800`
- Colour: white

### Body Text

- Size: `14px–16px`
- Weight: `400–500`
- Colour: secondary text

### Labels / Microcopy

- Size: `11px–13px`
- Weight: `700–900`
- Colour: muted grey or accent red
- Uppercase is allowed for category labels

## Typography Rules

- Keep headings short and useful.
- Use bold text for gameplay-critical values.
- Keep body text readable, not tiny.
- Do not use decorative fantasy fonts for dense UI.
- Use red text sparingly.

---

# 6. Spacing System

Use a consistent spacing scale:

- `4px`
- `8px`
- `12px`
- `16px`
- `20px`
- `24px`
- `32px`
- `40px`

## Common Usage

- Tight icon/text gap: `6px–8px`
- Button internal padding: `10px 14px`
- Card padding: `16px`
- Large panel padding: `20px–24px`
- Section spacing: `24px–32px`
- Page padding mobile: `12px–16px`
- Page padding desktop: `24px–32px`

---

# 7. Borders, Shadows, and Surfaces

## Borders

Use borders heavily but subtly.

Preferred:

```css
border: 1px solid var(--rq-border-default);
```

Active / selected:

```css
border: 1px solid var(--rq-border-accent);
```

## Shadows

Use restrained shadows.

Preferred:

```css
box-shadow: 0 4px 14px rgba(0, 0, 0, 0.22);
```

Avoid huge neon glows.

## Background Effects

Subtle radial or linear gradients are allowed only if they are dark and restrained.

Avoid:

- rainbow gradients
- bright purple glows
- heavy parchment textures
- noisy fantasy backgrounds behind dense UI

---

# 8. Component Rules

## 8.1 Buttons

### Primary Buttons

Used for:

- Create
- Save
- Confirm
- Generate
- Continue
- Start

Style:

- red fill or dark fill with red border
- white text
- bold label
- sharp corners

Recommended CSS:

```css
.rq-button-primary {
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 4px;
  border: 1px solid var(--rq-accent-primary);
  background: var(--rq-accent-primary);
  color: var(--rq-text-primary);
  font-weight: 800;
}
```

### Secondary Buttons

Used for:

- Cancel
- Edit
- Back
- Utility actions

Style:

- charcoal background
- white or secondary text
- grey border
- red hover border

### Danger Buttons

Used for:

- Delete
- Remove
- Reset destructive data

Style:

- dark background or red background
- white text
- red border
- clear warning language

## 8.2 Inputs

Inputs should be dark, sharp, and clear.

Recommended CSS:

```css
.rq-input {
  min-height: 42px;
  border-radius: 4px;
  border: 1px solid var(--rq-border-default);
  background: var(--rq-bg-input);
  color: var(--rq-text-primary);
  padding: 9px 12px;
}

.rq-input:focus {
  outline: none;
  border-color: var(--rq-accent-primary);
  box-shadow: 0 0 0 2px rgba(193, 18, 31, 0.18);
}
```

## 8.3 Cards and Panels

Cards should:

- use charcoal backgrounds
- have visible borders
- have sharp/lightly rounded corners
- use consistent padding
- avoid decorative clutter

Recommended CSS:

```css
.rq-panel {
  background: var(--rq-bg-panel);
  border: 1px solid var(--rq-border-default);
  border-radius: 6px;
  padding: 16px;
  box-shadow: var(--rq-shadow-panel);
}
```

## 8.4 Tabs

Tabs should be clear and structured.

Active tabs:

- red border
- red soft background
- white text

Inactive tabs:

- dark background
- grey border
- muted text

## 8.5 Modals

Modals should have:

- dark overlay
- charcoal panel
- clear title
- concise description
- strong footer actions
- red accent for confirm/active action

Do not make modals feel like unrelated mini-sites.

## 8.6 Tables and Lists

Tables/lists should:

- use clear row separation
- support scanability
- use red only for selection/warnings
- avoid cramped content
- keep action buttons aligned

## 8.7 Status Chips

Use chips for:

- conditions
- spell level
- item rarity
- encounter difficulty
- rules edition
- campaign status
- unread handouts

Chips may have slightly rounded corners, but should not become bubbly.

---

# 9. Page Layout Rules

## App Shell

Most authenticated pages should follow this general structure:

- header or top action bar
- optional sidebar navigation
- main content panel/grid
- optional utility panel on dense pages

## Dashboard

The dashboard should feel like a command centre.

It should show:

- characters
- campaigns
- quick actions
- recent activity
- Rook/AI access
- useful continuation actions

Avoid making it look like a social media feed.

## GM Screen

The GM screen should be denser than the dashboard but still readable.

It should support:

- modular widgets
- strong panels
- quick access tools
- live play controls
- useful right/side utilities

## Character Sheet

The character sheet must prioritize gameplay essentials:

- HP
- temp HP
- AC
- initiative
- speed
- proficiency
- conditions
- death saves
- spells
- attacks
- inventory
- notes

Mobile layout must not be an afterthought.

## Homebrew Workshop

The Homebrew Workshop should feel like a focused editor.

It should use:

- clear forms
- sections
- missing-field warnings
- preview panels
- edit/save actions

---

# 10. Responsive Design Rules

## Mobile

Mobile is critical for players.

Mobile priorities:

1. HP and temp HP
2. AC / initiative / speed
3. conditions
4. attacks
5. spells
6. notes
7. inventory

Rules:

- No horizontal overflow.
- Buttons must be thumb-friendly.
- Tabs should be sticky or easy to reach.
- Avoid tiny click targets.
- Avoid multi-column layouts below phone width unless very simple.

## Tablet

Tablet should support:

- character sheets
- GM screen widgets
- combat tracker
- map tools

Use 2-column layouts where useful.

## Desktop

Desktop should support:

- denser dashboards
- GM workspaces
- sidebars
- multi-column panels
- optional utility areas

---

# 11. Accessibility Rules

- Maintain strong contrast.
- Do not rely on colour alone to communicate meaning.
- Buttons must have readable labels.
- Interactive elements must be large enough to tap/click.
- Inputs need visible focus states.
- Modal close actions must be obvious.
- Avoid tiny grey text on charcoal backgrounds.

---

# 12. AI Design Guardrails

Any AI working on this project must follow these guardrails.

## Must Do

- Use charcoal, red, and white.
- Use sharp-edged minimalist boxes.
- Preserve existing workflows.
- Keep pages readable.
- Use consistent spacing.
- Use consistent typography.
- Prefer small safe changes over giant redesigns.
- Keep mobile usability in mind.
- Keep gameplay speed in mind.

## Must Not Do

- Do not change the app to blue/purple/gold unless the user explicitly asks.
- Do not add bubbly rounded cards.
- Do not add parchment textures everywhere.
- Do not add excessive fantasy ornamentation.
- Do not use decorative fonts for main UI.
- Do not add random new colour systems.
- Do not hide key gameplay controls.
- Do not rewrite large components just to change colours.

---

# 13. Implementation Strategy

When updating existing UI, use this order:

1. Preserve working behaviour.
2. Apply design tokens.
3. Normalize spacing and borders.
4. Improve responsive behaviour.
5. Extract repeated components only when safe.
6. Add tests where possible.

Do not bundle major visual redesigns with risky logic changes unless the user specifically requests it.

---

# 14. Master Summary

Rookie Quest Keeper is a dark, sharp, minimalist TTRPG companion app. The design must use charcoal backgrounds, red accents, and white text, with clean structure and sharp-edged boxes. The interface should feel like a premium fantasy command centre rather than a playful SaaS app. Every screen must prioritize clarity, speed, consistency, and usability. Do not drift into rounded bubbly UI, pastel colours, over-textured fantasy decoration, or inconsistent layout systems.
