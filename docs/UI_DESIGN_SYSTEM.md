# Rookie Quest Keeper UI Design System

This is the design lock for Rookie Quest Keeper while the UI is being stripped back and rebuilt consistently.

## Chosen direction: Velvet Tabletop

The app should feel like a premium tabletop campaign keeper on a candlelit table: dark espresso surfaces, leather-brown cards, cream parchment text, warm gold actions, copper hover states, and soft candlelight glows. Individual tools should not introduce their own page-wide colour themes.

## Core palette

| Role | Use | Colour |
| --- | --- | --- |
| App background | Whole app shell | `#120C08` |
| Surface | Page panels | `#21150E` |
| Card | Cards, lists, tool blocks | `#2E1D13` |
| Raised | Hover/selected surfaces | `#3A2619` |
| Main action | Primary CTAs, active nav, selected states | `#C08A3D` |
| Main action hover | Hover/focus accents | `#E0B15C` |
| Copper accent | Secondary actions, hover warmth, divider glow | `#A45A32` |
| Main text | Primary readable text | `#F5E6C8` |
| Muted text | Secondary text, helper copy, inactive labels | `#CDBA98` |
| Parchment soft | Subtle light surface/tint | `#E6D2AA` |
| Homebrew/imported | Private content, imports, safe creation | `#7A9B66` |
| Warning | Warnings, attention, risk | `#D4953C` |
| Danger | High-risk actions and error states | `#B44732` |
| Success | Saved, read, completed, ready | `#7A9B66` |

## Placement rules

1. **No page-specific full colour themes.** Maps, Chronicles, NPCs, Inventory, Handouts, Homebrew, Combat, Player pages, and character builders should share the same Velvet Tabletop shell.
2. **Gold is the primary app action colour.** Use it for active tabs, Create, Save, Share, Import, Start, and Live Play actions.
3. **Copper supports hover and secondary warmth.** Use copper in gradients, border glows, dividers, and secondary active states.
4. **Cream text is the default readable layer.** Use cream for headings/body text and muted cream for helper copy, inactive states, and small labels.
5. **Green means done or safe creation.** Use it for read, saved, ready, imported, completed, success, or safe homebrew/imported content.
6. **Gold is not a warning by default.** Use stronger warning treatment only when attention is genuinely needed.
7. **Red is reserved.** Use red only for high-risk actions and error states; avoid using it as a page colour.

## Character builder styling

All character builders should use the Velvet Tabletop palette rather than introducing separate mode colours.

- **Full Creation:** detailed, workshop-like, with gold active step states, leather panels, and a cream live-preview sheet.
- **Basic Build:** guided, compact, and approachable, with warm preview cards, gold primary actions, and parchment helper text.
- **Premade Characters:** card-gallery style, like tavern hero posters or leather-backed character cards, with role/class badges.
- **Kids Mode:** softer and simpler, with bigger warm choice cards, fewer numbers, friendlier labels, and less visual density.

Builder pages should still feel distinct through layout and language, not through totally different colour themes.

## Layout rules

- Desktop GM pages should use a sidebar + content workspace.
- Desktop player pages should be flatter than GM pages: compact hero, tabs directly near the top, and cards that do not force long scrolling.
- Long tool pages must scroll vertically; avoid trapping the page with `overflow: hidden` unless the internal panel provides its own scroll area.
- Live Play Mode may use a fixed viewport, but every panel inside it must have its own scroll area.
- Cards should use `8px` radius or slightly larger hero-card radii, subtle gold/copper borders, compact spacing, and clear section headers.
- Buttons should be visually consistent: gold primary, leather/gold-outline secondary, red reserved, green success/safe creation.

## Font rules

- Use the existing UI font for all functional UI.
- Do not use decorative/fantasy fonts for form labels, dense tables, or controls.
- Keep body text readable at 12–15px depending on density.

## Near-term cleanup order

1. Global tokens and scroll safety.
2. Campaign Dashboard shell.
3. Player Dashboard desktop layout.
4. Tonight's Session and Live Play Mode.
5. World Builder, Maps, Chronicle.
6. NPCs and relationship tools.
7. Handouts and player clue library.
8. Inventory and item assignment.
9. Homebrew / private playtest creation.
10. Character builders: Full Creation, Basic Build, Premades, and Kids Mode.
