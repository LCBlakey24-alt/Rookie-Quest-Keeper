# Frontend architecture direction

Rookie Quest Keeper is **one application**, not three separate mobile/tablet/desktop products.

The goal is to keep data, rules and behaviour shared while isolating presentation so one device layout cannot accidentally restyle or squeeze another.

## Target structure

```text
frontend/src/
  core/
    api/
    auth/
    routing/
    state/
  features/
    campaigns/
    characters/
    combat/
    dice/
    maps/
    npcs/
    quests/
    rook/
  shared/
    components/
    hooks/
    utils/
  layouts/
    desktop/
    tablet/
    mobile/
  theme/
    tokens.css
    typography.css
    reset.css
```

This is a migration target. Existing working features move into it incrementally; the application is not being rewritten from scratch.

## Ownership rules

### Backend

Owns persistence, authentication, sync, API contracts, server-side business logic and shared campaign/character information.

### Core

Owns device-independent frontend infrastructure such as the API client, auth state, routing primitives and shared data/query state.

### Features

Own feature behaviour. A feature should expose data/actions without assuming desktop, tablet or mobile geometry.

For example, dice logic should know how to roll and record results; it should not decide whether the UI is a desktop popover or mobile bottom sheet.

### Layouts

Own presentation and interaction arrangement for a device lane.

- **Desktop:** permanent navigation, wide workspace and multi-panel views where space genuinely allows it.
- **Tablet:** touch-first, compact navigation, portrait/landscape adaptations and fewer simultaneous panels.
- **Mobile:** compact/bottom navigation, one main task at a time and drawers/sheets rather than desktop floating windows.

### Theme

Owns design tokens, reset, typography and accessibility foundations only. Theme CSS must not own rail widths, grid column counts, card geometry or page-specific layout.

## CSS rules

1. Do not add new feature/page CSS imports to `App.js`.
2. New page/layout styles should be imported by the component that owns them.
3. Prefer CSS Modules or tightly scoped selectors for new layout work.
4. Do not solve conflicts by adding another late global `!important` stylesheet.
5. Delete superseded styling once its replacement is verified.
6. A colour/theme change must never change layout geometry.
7. Do not share positioning CSS between desktop, tablet and mobile floating/docked tools.

## Migration order

1. Remove dead/retired theme and prototype code.
2. Establish `theme/` foundations.
3. Establish desktop/tablet/mobile shell components.
4. Move Home into the layout system.
5. Move Campaign library and campaign workspace.
6. Move Prep and Live Play.
7. Move Characters/create/edit/view.
8. Move Combat and Dice.
9. Remove superseded compatibility styles after each feature migration.

Every migration remains behind the normal Build Check, Character Audit and preview gates.
