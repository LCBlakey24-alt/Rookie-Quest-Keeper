# Demo Character Fixture Coverage

This repo now uses demo/test character fixtures instead of creating records directly on a live user profile.

## Why this approach

Live profile demo records can clutter real accounts and make it harder to tell whether a bug comes from user data, old saved data, or new code. Repo fixtures are safer because they can be used in unit tests, manual QA, seed scripts, Storybook-style previews, or a future admin-only "create demo characters" action.

## Current fixture spread

The fixture pack lives at:

- `frontend/src/data/demoCharacterFixtures.js`

It currently covers:

1. Fighter level 1 — equipment-only baseline with weapon, shield, armour, and backpack items.
2. Wizard level 1 — cantrips, spellbook, prepared spells, level 1 slots, focus, and weak armour baseline.
3. Cleric level 1 — prepared divine caster with shield, armour, healing spells, and slots.
4. Warlock level 2 — pact magic, cantrips, known spells, pact-style slot data, and focus items.
5. Ranger level 2 — half-caster spell unlock, ranged weapon, armour, and ammunition.
6. Eldritch Knight level 3 — subclass-only Fighter casting gate, cantrips, spells known, armour, shield, and weapon.
7. Arcane Trickster level 3 — subclass-only Rogue casting gate, cantrips, spells known, tools, skills, and finesse weapon.
8. Monk level 6 — Ki/resources/action economy baseline with light equipment.

## Test coverage

The test file lives at:

- `frontend/src/data/demoCharacterFixtures.test.js`

It checks that:

- Every fixture derives a playable character snapshot.
- Every caster fixture is recognised as a caster.
- Caster fixtures include saved spell data and spell slot data.
- Subclass casters such as Eldritch Knight and Arcane Trickster are recognised correctly.
- Non-casters stay non-casters.
- Every fixture has inventory/equipment data for sheet rendering.
- The Monk fixture includes Ki and expected bonus action cards.

## Suggested next step

Add an admin/dev-only seeding action later that can create these fixtures in a test account or local dev environment on demand. That should be opt-in and should not run automatically on real user accounts.
