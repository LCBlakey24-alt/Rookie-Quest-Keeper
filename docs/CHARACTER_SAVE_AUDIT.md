# Character Sheet Save Audit

This note records the current live character-sheet save behaviour before splitting the sheet into smaller files.

## Purpose

The character sheet is one of the highest-risk areas of the app because live table state must not silently fail to save. Before refactoring the sheet into smaller components, preserve the save model and keep changes small.

## Current active sheet routes

- Desktop/tablet route: `frontend/src/components/CleanCharacterSheet.js`
- Mobile route: `frontend/src/components/PlayerMobileRailSheet.js`
- Desktop tabs:
  - `frontend/src/components/clean-sheet/CleanCombatTab.js`
  - `frontend/src/components/clean-sheet/CleanSpellsTab.js`
  - `frontend/src/components/clean-sheet/CleanInventoryTab.js`
  - `frontend/src/components/clean-sheet/CleanNotesTab.js`

## Confirmed live-state save behaviour

### Desktop character sheet

`CleanCharacterSheet.js` has a central `patchCharacter(updates, options)` helper that:

- applies optimistic local updates;
- sends `PATCH /characters/:characterId`;
- replaces local state with the API response when available;
- rolls back to the previous character on error;
- returns `true` or `false` for child flows.

This helper is currently used for the most important live table state:

- current HP;
- temporary HP;
- inspiration;
- conditions;
- death saves;
- concentration;
- hit dice;
- class resources via the combat tab;
- spell slots via the spells tab;
- prepared spell loadouts via the spells tab.

### Desktop inventory and notes tabs

`CleanInventoryTab.js` and `CleanNotesTab.js` already use `PATCH /characters/:id`, which is the correct endpoint style for live sheet state.

However, they currently perform their own direct API calls rather than using the parent `patchCharacter` helper. They then call `onCharacterUpdate` as a local state update callback.

This works, but it is less consistent than the combat and spells tabs. The next safe code change should centralise these saves through the parent helper before extracting more character-sheet components.

### Mobile rail sheet

`PlayerMobileRailSheet.js` has its own `saveCharacterPatch(updates, successMessage)` helper. It uses `PATCH /characters/:characterId` and performs optimistic updates with rollback on error.

This is acceptable for now, but once the desktop sheet is split, consider sharing a common hook such as:

```js
useLiveCharacterPatch(characterId, character, setCharacter)
```

That hook could be reused by both desktop and mobile sheet views.

## Refactor rule

Do not split the character sheet and change save behaviour in the same PR.

Safe order:

1. Centralise inventory and notes tab saves through the parent live PATCH helper.
2. Add a small regression checklist or tests for HP, temp HP, death saves, conditions, spell slots, notes, inventory, and concentration.
3. Extract vitals/header into smaller components without changing save behaviour.
4. Extract tab rendering into smaller components without changing save behaviour.
5. Extract shared desktop/mobile live-save logic only after both flows are stable.

## Manual smoke test after any character-sheet save change

Use one existing character and confirm each change persists after refresh:

1. Damage and heal HP.
2. Add and remove temporary HP.
3. Toggle inspiration.
4. Add and remove a condition.
5. Mark and reset death saves.
6. Set and clear concentration.
7. Spend and restore a spell slot.
8. Add, edit quantity, favourite, and remove an inventory item.
9. Equip and unequip armour or a weapon.
10. Save notes.
11. Complete a short rest and long rest.
12. Repeat the key HP/status checks on mobile width.
