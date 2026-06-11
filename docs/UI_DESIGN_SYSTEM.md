# Rookie Quest Keeper UI Design System

This is the design lock for Rookie Quest Keeper while the UI is being stripped back and rebuilt consistently.

## Chosen direction: Mystic Tabletop

The app should feel like a mystical spellcaster's campaign desk: dark navy surfaces, blue-to-purple arcane gradients, compact controls, and readable table tools. Individual tools should not introduce their own page-wide colour themes.

## Core palette

| Role | Use | Colour |
| --- | --- | --- |
| App background | Whole app shell | `#080B1A` |
| Surface | Page panels | `#12172A` |
| Card | Cards, lists, tool blocks | `#171E33` |
| Raised | Hover/selected surfaces | `#202A46` |
| Main action | Primary CTAs, active nav, selected states | `#7C3AED` |
| Main action hover | Hover/focus accents | `#A78BFA` |
| Arcane blue | Player space, secondary gradients, shared state | `#2563EB` |
| Player | Player-facing/shared/received state | `#38BDF8` |
| Rook | Rook/AI messages and Rook-only buttons | `#C084FC` |
| Homebrew/imported | Private content, imports, safe creation | `#14B8A6` |
| Warning | Warnings, attention, risk | `#F59E0B` |
| Danger | Deletion/destructive actions only | `#EF4444` |
| Success | Saved, read, completed, ready | `#10B981` |

## Placement rules

1. **No page-specific full colour themes.** Maps, Chronicles, NPCs, Inventory, Handouts, Homebrew, Combat, and Player pages should share the same dark navy / purple-blue shell.
2. **Purple is the primary app action colour.** Use it for active tabs, Create, Save, Share, Import, Start, and Live Play actions.
3. **Blue supports player/shared areas.** Use blue in gradients and for player-facing/shared/received states.
4. **Rook purple should feel magical but specific.** Use the brighter Rook purple for Rook/AI messages, not as a generic panel colour.
5. **Amber is not a theme.** Use amber only for warnings, treasure/value details, or important clues.
6. **Red is danger only.** Use red for delete, remove, failed, and destructive states; avoid using it as the default page colour.
7. **Green means done.** Use it for read, saved, ready, imported, completed, or success.

## Layout rules

- Desktop GM pages should use a sidebar + content workspace.
- Desktop player pages should be flatter than GM pages: compact hero, tabs directly near the top, and cards that do not force long scrolling.
- Long tool pages must scroll vertically; avoid trapping the page with `overflow: hidden` unless the internal panel provides its own scroll area.
- Live Play Mode may use a fixed viewport, but every panel inside it must have its own scroll area.
- Cards should use `8px` radius, subtle blue/purple borders, compact spacing, and clear section headers.
- Buttons should be visually consistent: purple primary, navy/purple-outline secondary, red danger, bright purple only for Rook.

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
