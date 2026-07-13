# Rookie Quest Keeper UI Design System

This is the design lock for Rookie Quest Keeper while the UI is being stripped back and rebuilt consistently.

## Chosen direction: Sunset Gradient

The app should feel like a polished fantasy campaign keeper with a very dark blue-purple base and a purple-pink-orange sunset gradient running through selected states, primary actions, active tabs, icons, focus rings, and key highlights. Individual tools should not introduce their own page-wide colour themes.

Avoid coffee, velvet, espresso, leather, parchment, brown-tabletop, candlelit, or rustic theme language in new UI work.

## Core palette

| Role | Use | Colour |
| --- | --- | --- |
| App background | Whole app shell | `#070713` |
| Deep page | Page sections | `#0b0718` |
| Rail | Main app navigation | `#0d0617` |
| Surface | Page panels | `#13081f` |
| Card | Cards, lists, tool blocks | `#1b0b2d` |
| Raised | Hover/selected surfaces | `#24103a` |
| Sunset gradient | Primary CTAs, active nav, selected states | `linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542)` |
| Main action fallback | Primary accent when gradient is not practical | `#eb3fe9` |
| Main action hover | Hover/focus accent | `#ff9542` |
| Selected support | Active marker support accent | `#7357ff` |
| Main text | Primary readable text | `#ffffff` |
| Muted text | Secondary text, helper copy, inactive labels | `rgba(255,255,255,0.62)` |
| Homebrew/imported | Private content, imports, safe creation | `#7A9B66` |
| Warning | Warnings, attention, risk | `#D4953C` |
| Danger | High-risk actions and error states | `#B44732` |
| Success | Saved, read, completed, ready | `#7A9B66` |

## Placement rules

1. **No page-specific full colour themes.** Maps, Chronicles, NPCs, Inventory, Handouts, Homebrew, Combat, Player pages, and character builders should share the same dark blue-purple sunset shell.
2. **The sunset gradient is the primary app action treatment.** Use it for active tabs, Create, Save, Share, Import, Start, Live Play actions, selected icons, and selected navigation markers.
3. **Unselected navigation stays quiet.** Keep inactive rail items transparent or deep-surface, with white icons/text and no heavy glow.
4. **White text is the default readable layer.** Use white for headings/body text and soft-white for helper copy, inactive states, and small labels.
5. **Green means done or safe creation.** Use it for read, saved, ready, imported, completed, success, or safe homebrew/imported content.
6. **Orange/pink/purple are not warnings by default.** Use stronger warning treatment only when attention is genuinely needed.
7. **Red is reserved.** Use red only for high-risk actions and error states; avoid using it as a page colour.

## Character builder styling

All character builders should use the Sunset Gradient palette rather than introducing separate mode colours.

- **Full Creation:** detailed, workshop-like, with gradient active step states, deep panels, and a clear live-preview sheet.
- **Basic Build:** guided, compact, and approachable, with dark preview cards, gradient primary actions, and short helper text.
- **Premade Characters:** card-gallery style, like hero cards with role/class badges.
- **Kids Mode:** softer and simpler, with bigger dark choice cards, fewer numbers, friendlier labels, and less visual density.

Builder pages should still feel distinct through layout and language, not through totally different colour themes.

## Layout rules

- Desktop GM pages should use a sidebar + content workspace.
- Desktop player pages should be flatter than GM pages: compact hero, tabs directly near the top, and cards that do not force long scrolling.
- Long tool pages must scroll vertically; avoid trapping the page with `overflow: hidden` unless the internal panel provides its own scroll area.
- Live Play Mode may use a fixed viewport, but every panel inside it must have its own scroll area.
- Cards should use `8px` to `10px` radii, subtle pale/sunset borders, compact spacing, and clear section headers.
- Buttons should be visually consistent: sunset-gradient primary, dark/gradient-outline secondary, red reserved, green success/safe creation.
- Tabs and nav should follow the app rail pattern: quiet unselected states, gradient selected icon/marker/underline.

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
