# Rookie Quest Keeper Product and Design Vision

This document is the long-term product and design direction for Rookie Quest Keeper. Future AI agents and contributors should read this before major UI, prototype, player-sheet, GM-tool, or responsive-layout work.

## Product goal

Rookie Quest Keeper is a full RPG/D&D companion app for players and GMs. It should feel like a polished mobile/tablet/desktop app, not a desktop website squeezed onto smaller screens.

The app should support:

- Player character sheets.
- HP, Temp HP, Hit Dice, rests, spell slots, class resources, conditions, inventory, and notes.
- GM campaign, worldbuilding, encounter, session, handout, and live-play tools.
- Local prototype testing without requiring the backend.
- Complete mobile, tablet, and desktop layouts for the same major tools.
- Future app-style use on phones and tablets.

## Core product rule

Desktop gets more space, not more features.

Mobile, tablet, and desktop should all support the same major tools. Mobile should not be treated as a reduced companion mode.

- Mobile: full app experience, stacked and simplified.
- Tablet: at-the-table dashboard.
- Desktop: wide workspace.

Feature reliability comes before visual polish. Design should make the app easier to use and test, not distract from working rules and stable flows.

## Blue Eclipse visual direction

The current working visual direction is **Blue Eclipse**.

Rookie Quest Keeper should feel like a premium magical command journal: fantasy, clean, tabletop-friendly, consistent, and app-like.

Use this palette language as the guiding direction:

- Very dark blue / black-purple page backgrounds: `#080816`, `#0f0e47`.
- Blue-purple card surfaces: `#272757`, `#343463`.
- Muted blue-grey secondary panels: `#505081`.
- Soft muted text: `#8686ac`.
- Warm cream / ivory text: `#f6ead2`.
- Antique gold accents: `#d8ad4f`.
- Gold hover / highlight: `#f2d18a`.
- Blue-violet glow, used sparingly: `#7c78ff`.

Avoid making the app overly bright, neon, or visually noisy. Glow should support focus and hierarchy, not decorate every panel.

## Font direction

Use **Metal Mania** as a display font only.

Good uses:

- App title.
- Page titles.
- Character names.
- Major headings.
- Fantasy hero sections.
- GM campaign titles.

Do not use Metal Mania for:

- Body text.
- Buttons.
- Form inputs.
- Dense stats.
- Skill lists.
- Long notes.
- Spell descriptions.
- Inventory rows.

Body and UI text should remain readable and clean, using normal sans-serif fonts.

## Less boxes and smoother alignment

The app should move away from heavy “boxes everywhere” layouts.

Prefer:

- Cleaner alignment.
- Consistent spacing.
- Fewer heavy borders.
- Softer panel grouping.
- Less duplicated information.
- Less clutter.
- More app-like screens.
- Minimalist linework.
- Smoother sections that feel connected.
- Cards only where they help users understand or scan content.

Avoid stacking many disconnected panels with heavy outlines. A finished screen should feel like one polished interface, not a collage of widgets.

## Responsive layout strategy

### Mobile

Mobile should feel like a real app, not a reduced website.

Use a simple left icon rail / banner concept:

- Left icon rail or banner.
- Main content area.
- Tap an icon to open the relevant section.

Mobile navigation should use clear icons for:

- Overview.
- Combat.
- Spells.
- Inventory.
- Notes.
- Conditions / Recovery when needed.
- GM sections on GM prototype pages.

Mobile should prioritize:

- HP and recovery first.
- Quick table actions.
- One section visible at a time.
- Clear scrolling.
- Large touch targets.
- No tiny cramped buttons.
- No duplicated stat panels.

Avoid huge horizontal tab bars that wrap and make the top of the page messy.

The current mobile prototype route is `/prototype-mobile`. It should become a clean full-access frontend testing shell.

### Tablet

Tablet is the “at the table” mode.

It should show more at once than mobile but should not become the desktop layout.

Tablet should support:

- Character header.
- HP / Temp HP / Hit Dice row.
- Short Rest / Long Rest.
- Core ability stats.
- Saving throws.
- Skill and passive info.
- Combat actions.
- Spell and resource panels.
- Conditions / concentration.
- Inventory quick-use.
- Notes.

Avoid massive empty stat cards, duplicated information, over-tall panels, huge gaps, unnecessary reloads, and controls that require a mouse.

### Desktop

Desktop should use extra space for a wider workspace, not exclusive features.

A good desktop character layout can use:

- Left column: HP, recovery, conditions.
- Middle column: selected major section.
- Right column: stats, saves, skills, passives, and resources.

Desktop can use more columns and wider panels, but feature access should match mobile and tablet.

## HP, Temp HP, Hit Dice, and rests

HP, Temp HP, and Hit Dice should be grouped together side by side where space allows:

```text
HP        Temp HP        Hit Dice
```

Rest actions should sit together below:

```text
Short Rest        Long Rest
```

Rules direction:

- Damage drains Temp HP first.
- Remaining damage drains main HP.
- Healing affects main HP only.
- Temp HP does not heal main HP.
- Hit Dice is a recovery resource.
- Short Rest does not automatically heal HP.
- Long Rest restores HP and clears Temp HP.
- Long Rest restores spell slots and appropriate resources.
- Short Rest restores short-rest resources.
- Warlock Pact Magic recovers on Short Rest.

The HP arc should animate smoothly and should not snap. Temp HP should appear as a gold temp HP line with a thin dark blue outline and no bright cyan glow.

## Local prototype and testing strategy

Do not disable or block the live backend. People may be using the live site, so production behaviour must stay intact.

Use isolated prototype routes for fast frontend testing:

- `/prototype`
- `/prototype-mobile`
- `/prototype-gm`

Prototype routes should:

- Use local browser storage.
- Avoid backend calls.
- Not require login.
- Not affect real user data.
- Not affect saved characters.
- Not break production users.
- Let users test quickly on phone and tablet.

The `/prototype` route should act as the testing hub and link to:

- `/prototype-mobile`
- `/prototype-gm`
- `/home`

## Prototype characters

The prototype system should include one local character for each 2014 core class:

- Barbarian
- Bard
- Cleric
- Druid
- Fighter
- Monk
- Paladin
- Ranger
- Rogue
- Sorcerer
- Warlock
- Wizard

Each prototype character should help test class-specific inconsistencies and include:

- Level.
- Class.
- Subclass.
- HP.
- Temp HP where useful.
- Hit Dice.
- Ability scores.
- Proficiency bonus.
- Saving throw proficiencies.
- Skill proficiencies.
- Class resources.
- Spell slots where relevant.
- Known/prepared spells where relevant.
- Test attacks/actions.
- Inventory items.
- Notes.
- Conditions/concentration where useful.

Use prototype characters to test HP, Temp HP, Hit Dice, rests, spell slots, resource restoration, class-specific features, and mobile/tablet/desktop layouts.

## Class progression data

The app needs a reliable 2014 class progression source. Prefer a reusable data file rather than hardcoding rules in components.

Suggested file:

```text
frontend/src/data/classProgressions2014.js
```

It should include:

- Class names.
- Hit die.
- Saving throws.
- Primary abilities.
- Subclass level.
- ASI levels.
- Spellcasting type.
- Spellcasting ability.
- Spell slot progression.
- Warlock Pact Magic progression.
- Class resources.
- Resource rest type.
- Level-by-level feature unlocks.
- Next-level preview data.

Important class rules:

- Fighter has extra ASI levels.
- Rogue has an extra ASI level.
- Full casters use full spell slot progression.
- Paladin and Ranger use half-caster progression.
- Warlock uses Pact Magic, not normal slots.
- Monk Ki restores on Short Rest.
- Fighter Action Surge and Second Wind restore on Short Rest.
- Cleric Channel Divinity restores on Short Rest.
- Bardic Inspiration changes at level 5 with Font of Inspiration.
- Long Rest should restore long-rest resources.
- Short Rest should restore short-rest resources.

This data should eventually support the character builder, level-up wizard, character sheet, prototype testing, resource restoration, and GM/player validation.

## Player product goals

Players should be able to:

- Create and open characters.
- Use a full character sheet on mobile, tablet, and desktop.
- Track HP, Temp HP, Hit Dice, rests, spell slots, class resources, conditions, inventory, and notes.
- Join campaigns.
- Receive and manage GM handouts.
- Use the sheet quickly during live play.

The player side should prioritize reliability, touch-friendly controls, and fast access to table actions.

## GM product goals

The GM side should become a real command centre.

It should include:

- Party status.
- Initiative tracker.
- Encounter tools.
- NPCs.
- Monsters.
- Location notes.
- Environment notes.
- Loot.
- Story beats.
- Planner.
- Handouts.
- Soundboard.
- Session notes.
- Campaign lore.
- Public/private GM notes.

GM tools should support mobile, tablet, and desktop, not desktop only.

## Tia-Karta GM prototype direction

The Tia-Karta worldbuilding should be available as local GM prototype data so it can be tested without backend writes.

Include known Tia-Karta lore such as:

- Primordials: Prima, Aevon, Koltoro.
- The Spark of Creation.
- The Neutral Spire as a lock.
- Twelve champions involved in sealing Koltoro.
- Magic as primordial power infused into the world.
- Divine powers including Anya, Asus, Naskin, Kutos, Yena, Barkera, Weaver, Inorr, Otia, Saerin, Opian, Morwen, and Akara.
- Continents and regions including Tiamina, Balgura, Fetura, The Cursed Lands, Pixie Islands, Okuku Island, and Isle of the Damned.
- Locations including Balderin, Neremore, Fortia, Gragone, Edgeacre, Stone Port, Drymere, Court of Crowns, Skyward, Pixie Isle, and Akara’s tomb.
- Campaign themes such as Balderin rebuilding, Neremore politics, Court of Crowns votes, the sleeping princess, magical pendant, ancient vampire secret under Balderin, royal vault gold, Lucian Grey, city income projects, rebuild options, local workforce vs outside specialists, Koltoro as hidden danger, the Opian/Jester contract, and the illusion mountain arc.

The GM prototype should let users test how this lore appears and should eventually provide a path toward editable campaign data.

## Current build priority

Current feature work should be prioritized in this order:

1. Local prototype mode.
2. Class progression consistency.
3. HP / Temp HP / Hit Dice / Rest reliability.
4. Spell slot and resource restoration.
5. Conditions and concentration.
6. Mobile layout with left icon rail.
7. Tablet dashboard layout.
8. Desktop workspace layout.
9. GM command centre feature reliability.
10. Design polish after feature behaviour is reliable.

## Implementation guidance for future agents

When making changes:

- Prefer small, safe commits.
- Avoid large rewrites of working files.
- Keep production backend behaviour intact.
- Do not break live user data.
- Keep prototype mode isolated.
- Use frontend-only `localStorage` for prototype pages.
- Update the updates timeline after notable changes.
- Prefer reusable data/rules files over component hardcoding.
- Prioritize mobile/tablet testability.
- Consider mobile, tablet, and desktop separately.
- Do not over-focus on visual polish until feature behaviour is reliable.

