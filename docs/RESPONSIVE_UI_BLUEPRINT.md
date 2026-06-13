# Rookie Quest Keeper Responsive UI Blueprint

This is the recommended visual and layout direction for making the app feel minimalist, professional, dense enough for real sessions, and simple enough for players/kids.

## North star

Rookie Quest Keeper should feel like a clean mystical command centre, not a decorative fantasy website. The UI should prioritize:

1. Clear hierarchy.
2. Dense but readable cards.
3. Fewer page-specific colour themes.
4. Consistent spacing and alignment.
5. Fast access to the next useful action.
6. Different navigation patterns for desktop, tablet, and phone.

## Colour scheme: Mystic Professional

Use this as the main product palette.

| Purpose | Colour | Use |
|---|---:|---|
| App background | `#07111F` | Full-page background |
| Main shell | `#0F172A` | Panels/sidebar/cards |
| Elevated card | `#172033` | Cards inside panels |
| Primary action | `#7C3AED` | Main buttons, active tab accents |
| Secondary accent | `#0EA5E9` | Player/shared state, links, secondary gradients |
| Rook AI | `#A855F7` | Rook-only badges/buttons/messages |
| Warning/clue | `#F59E0B` | Warnings, clue badges, treasure highlights |
| Success/read/saved | `#10B981` | Saved, complete, read states |
| Danger/destructive | `#EF4444` | Delete/failure only |
| Text primary | `#F8FAFC` | Main text |
| Text secondary | `#CBD5E1` | Descriptions/body |
| Text muted | `#94A3B8` | Metadata/labels |
| Border | `rgba(148, 163, 184, 0.22)` | Default borders |
| Active border | `rgba(167, 139, 250, 0.55)` | Active/selected state |

### Colour rules

- Purple/blue is the normal product identity.
- Rook purple should only mean AI/Rook help.
- Amber should only mean warning, clue, treasure, or important attention.
- Red should only mean danger/delete/failure.
- Do not make each page its own colour theme.

## Fonts

Use a clean system sans font for the whole app.

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Use display/fantasy lettering only for the logo if needed. Do not use decorative fonts for forms, tables, cards, rules text, combat actions, or mobile UI.

### Type scale

| Element | Desktop | Mobile |
|---|---:|---:|
| Page title | 24-30px | 20-24px |
| Section title | 17-20px | 16-18px |
| Card title | 14-16px | 14-16px |
| Body text | 13-15px | 13-15px |
| Metadata/pills | 10-12px | 10-12px |
| Buttons | 13-14px | 14px |

## Spacing and shape

Use a compact 8px spacing system.

- Page padding: 16-24px desktop, 12-16px tablet, 10-14px mobile.
- Card padding: 12-16px desktop, 10-14px mobile.
- Grid gaps: 10-14px.
- Border radius: 12-18px for modern/professional cards.
- Avoid huge hero sections after login. Users need tools, not marketing, once authenticated.

## Desktop layout

Desktop should use a left sidebar plus a dense workspace.

### Recommended structure

```text
┌──────────────────────────────────────────────────────────────┐
│ Compact top context bar: campaign / page / quick actions      │
├──────────────┬───────────────────────────────────────────────┤
│ Sidebar      │ Workspace                                     │
│ Prep         │ Page header                                   │
│ World        │ ┌──── card ────┐ ┌──── card ────┐             │
│ Cast         │ └──────────────┘ └──────────────┘             │
│ Run          │ ┌──── wide content / table / form ─────────┐  │
│ Library      │ └───────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────┘
```

### Sidebar rules

Use a sidebar on desktop because GMs have many tools. It should be compact and grouped by workflow:

1. **Prep** — Tonight's Session, Session Prep, Session Notes, Handouts, Recap.
2. **World** — Campaign Setup, World Overview, World Builder, Locations, Maps, Chronicle, Gods/Factions.
3. **Cast** — Players, NPCs.
4. **Run** — Encounters, Battle Maps, Rook Tools.
5. **Library** — Inventory, Uploads, Playtest Packs, Homebrew.

Sidebar groups should be collapsible. Active group should be obvious. Individual tab buttons should be 36-42px high, not huge.

### Top tabs on desktop?

Use top tabs only inside a page when there are 2-5 subviews. Do not put every GM tool across the top because it becomes crowded and wraps badly.

Good top-tab examples:

- Inventory: Party Stash / Player Items / Shops / Loot.
- Maps: World / Local / Battle.
- NPCs: Cards / Table / Relationships.
- Character sheet: Overview / Combat / Spells / Inventory / Notes.

## Tablet layout

Tablet should use a collapsible left rail or top category bar.

### Recommended structure

```text
┌──────────────────────────────┐
│ Top app bar / campaign name   │
├──────────────────────────────┤
│ Horizontal category chips     │
│ Prep World Cast Run Library   │
├──────────────────────────────┤
│ 1-2 column card workspace     │
└──────────────────────────────┘
```

Rules:

- Avoid permanent wide sidebars on tablets.
- Use horizontal category chips for primary groups.
- Use 1-2 columns depending on width.
- Keep buttons finger-friendly: 40-44px minimum height.

## Mobile layout

Mobile should not be a squeezed desktop. It should be task-first.

### Recommended player mobile navigation

Use bottom navigation with 4-5 items:

1. **Sheet**
2. **Combat**
3. **Spells**
4. **Items**
5. **Notes**

Use a top bar for character/campaign name and a menu drawer for less-used actions.

### Recommended GM mobile navigation

Use a compact top bar and bottom actions:

1. **Tonight**
2. **Notes**
3. **NPCs**
4. **Combat**
5. **More**

The More drawer can contain maps, inventory, uploads, playtest packs, world builder, settings, and Rook tools.

### Mobile rules

- One column only.
- No fixed desktop sidebars.
- Avoid wide tables; use cards or stacked rows.
- Primary actions should be sticky only when useful.
- Important live controls must be thumb-friendly.
- No form should require horizontal scrolling.

## Page templates

### Template 1: Campaign tool page

Use this for NPCs, Locations, Handouts, Inventory, Maps, and Playtest Packs.

```text
Page header
- Eyebrow: section group
- Title: page name
- Description: one sentence
- Primary action button

Toolbar
- Search
- 2-4 filters
- View toggle if needed

Content
- Compact card grid or table
- Empty state with one clear action
```

### Template 2: Dense setup form

Use this for Campaign Setup, Account Settings, Admin Settings, and Homebrew validation.

```text
Header card with save button
2-4 column field grid
Toggle cards
Small explanatory helper text
Advanced section collapsed by default
```

### Template 3: Player action card

Use this for attacks, spells, features, and usable items.

```text
┌──────────────────────────────────┐
│ Action type badge                 │
│ Name                              │
│ Short description                 │
├────────────┬────────────┬────────┤
│ To Hit/DC  │ Damage     │ Detail │
│ +7 / DC15  │ 1d8+4     │ Slashing│
└────────────┴────────────┴────────┘
```

Rules:

- The first box rolls attack or displays save DC.
- The second box rolls damage if there is damage.
- The third box is non-clickable details: damage type, condition, range, notes.
- Spell save cards should say `DC 15 Constitution` or similar in the first box.

### Template 4: Live session cockpit

Use 2-4 panels on desktop, 1-2 on tablet, 1 on mobile.

Default desktop panels:

1. Combat / encounter status.
2. Party status.
3. Quick notes.
4. Handouts / reference.

Do not show unfinished widgets by default.

## Landing page direction

Landing page should be minimal and conversion-focused.

### Recommended layout

1. Top nav: logo, Features, For GMs, For Players, Sign In.
2. Hero: one sentence, two buttons.
3. Three selling points: Run sessions, Player sheets, Rook text assistant.
4. Screenshot/mockup area.
5. Final CTA.

Avoid a long marketing page until the product is more stable.

## Login page direction

Login should stay compact.

- Logo at top.
- Single glass panel.
- Username/email field.
- Password field.
- Sign in button.
- Small account-update notice.
- Sign up link.

Do not use large art, long paragraphs, or multi-column login content.

## Implementation order

1. Lock tokens and typography.
2. Make landing/login match the Mystic Professional palette.
3. Standardize dashboard shell and sidebar.
4. Convert Campaign Setup / Account / Admin forms to dense setup form template.
5. Convert NPCs / Locations / Handouts / Inventory / Maps to campaign tool page template.
6. Convert player attacks/spells/features/items to player action card template.
7. Add tablet category chips.
8. Add mobile bottom navigation for player sheets and GM live tools.
9. Run scroll-safety and screenshot checks.
