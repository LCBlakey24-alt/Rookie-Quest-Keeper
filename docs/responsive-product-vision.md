# Rookie Quest Keeper Responsive Product Vision

## Core principle

Rookie Quest Keeper should not have a reduced mobile or tablet version. Every major tool should be available on phone, tablet, and desktop. The layout changes by device size, but the capability stays the same.

Desktop gets more space, not more features.

## Product promise

Run, manage, build, edit, and play a tabletop RPG from any device.

Players should be able to fully use and edit their character from a phone.
Game Masters should eventually be able to run a game from a tablet or mobile device.
Desktop should feel like a wide workspace, not the only complete version.

## Layout strategy

Build the interface as reusable modules instead of device-specific pages.

Core modules:

- Character header
- Quick stat strip
- Health arc and HP controls
- Ability scores panel
- Saving throws panel
- Skills panel
- Passive scores panel
- Attacks and actions panel
- Spellbook panel
- Inventory panel
- Notes panel
- Conditions and concentration panel
- Rest and recovery panel
- Future GM party panel
- Future initiative and encounter panel

Each device layout should rearrange these same modules.

## Mobile layout

Mobile is a stacked full version. Nothing important is removed, but sections are collapsed, tabbed, or placed behind drawers.

Priority order:

1. Character identity
2. Quick stats: AC, initiative, proficiency, speed
3. HP and recovery controls
4. Current play tab
5. Character details
6. Editing and management tools

Recommended mobile structure:

- Header with compact portrait, name, class, level, and quick stats
- HP card immediately below the header
- Bottom or horizontal tab navigation
- Current tab content stacked vertically
- Accordions for dense areas like skills, inventory, spell details, and notes

Mobile should favour large buttons and one-handed use.

## Tablet layout

Tablet is the main at-the-table dashboard.

Priority order:

1. Always-visible character identity
2. Always-visible AC, initiative, proficiency, and speed
3. HP card with HP, temp HP, hit dice, healing, and damage controls
4. Ability scores near HP
5. Saving throws and passive scores near HP
6. Tabs for deeper character tools

Recommended tablet structure:

Header row:

- Back/dashboard action
- Portrait, character name, race/class/level
- Quick stat chips: AC, initiative, proficiency, speed
- Level Up and Edit buttons

Primary dashboard row:

- Left: HP arc card and HP action panels
- Middle: ability scores panel
- Right: saving throws and passive scores panel

Below dashboard:

- Tabs
- Selected tab content

The tablet layout should remove wasted card space and make the view feel like a cockpit for play.

## Desktop layout

Desktop is the wide workspace version of the same product.

Priority order:

1. Character identity and quick stats
2. HP, conditions, and rest tools visible without scrolling
3. Large selected tab content in the centre
4. Supporting character panels on the side

Recommended desktop structure:

- Top header across the full page
- Left column: HP, conditions, inspiration, concentration, rest tools
- Centre column: active tab content
- Right column: ability scores, saves, skills, passive scores, notes summary

Desktop should feel more spacious, but not more complete than tablet or mobile.

## HP card locked design

Top section:

- Half-circle HP arc
- Main number is total effective HP: current HP plus temporary HP
- Small breakdown text: for example, `7 HP + 5 Temp`
- Normal HP uses the main gradient arc
- Temporary HP appears as a gold extension on the arc

Bottom section:

Three equal action panels:

1. Heal / HP
   - Heal button at the top
   - HP amount input in the middle
   - HP minus / damage button at the bottom

2. Temp HP
   - Temp plus button at the top
   - Temp HP amount input in the middle
   - Temp minus button at the bottom

3. Hit Dice
   - Use Die button at the top
   - Remaining hit dice count in the middle
   - Short Rest button at the bottom

## Colour direction: Blue Eclipse

Move away from the heavy brown parchment look.

Recommended palette:

- Page background: deep navy / black-purple
- Main cards: dark blue-purple
- Secondary panels: muted blue-grey
- Text: warm ivory / cream
- Primary accent: antique gold
- Magical accent: blue-violet glow
- HP: red to orange to gold to green gradient
- Temporary HP: brighter gold

Theme intent:

- Magical
- Premium
- Readable
- Less tavern/parchment
- More arcane dashboard

## Development rules

- No major feature should be desktop-only unless technically unavoidable.
- Shared game logic should live outside visual components where possible.
- UI modules should be reusable across mobile, tablet, and desktop layouts.
- Desktop should add breathing room and multi-panel layouts, not exclusive functionality.
- Tablet should be treated as a first-class play surface.
- Mobile should be fully capable but organised through stacked sections, tabs, and drawers.
