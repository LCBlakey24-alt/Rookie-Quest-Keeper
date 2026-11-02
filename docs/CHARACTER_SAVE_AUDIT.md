# Character Sheet Save Audit

This note records the current live character-sheet save behaviour before splitting the sheet into smaller files.

## Purpose

The character sheet is one of the highest-risk areas of the app because live table state must not silently fail to save. Before refactoring the sheet into smaller components, preserve the save model and keep changes small.

## Current active sheet routes

- Responsive desktop/tablet/mobile route: `frontend/src/components/CleanCharacterSheet.js`
- The live sheet adapts through the explicit desktop/tablet/mobile presentation lanes; there is no separate mobile character component.
- Active tabs:
  - `frontend/src/components/clean-sheet/CleanCombatTab.js`
  - `frontend/src/components/clean-sheet/CleanSpellsTab.js`
  - `frontend/src/components/clean-sheet/CleanInventoryTab.js`
  - `frontend/src/components/clean-sheet/CleanNotesTab.js`

## Confirmed live-state save behaviour

### Desktop character sheet

`CleanCharacterSheet.js` has a central `patchCharacter(updates, options)` helper that:

- applies optimistic local updates using `characterSaveQueue.js`;
- **serialises** `PATCH /characters/:characterId` calls per open character sheet;
- rebases later pending edits over each confirmed full API response, so a late HP response cannot erase pending spell-slot/notes changes;
- rolls back only the failed edit, preserving subsequent pending changes;
- ignores responses belonging to a character page that has since changed;
- serialises short/long rests with other live edits, using REST fallback only for missing/unsupported routes (404/405), not timeouts or server failures;
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

### Inventory and notes tabs

The routed sheet now passes its central `patchCharacter(updates, options)` helper into both Inventory and Notes.

- Inventory uses the parent helper for carried items, equipment, armour-class updates, quantities, attunement, favourites, and currency.
- Notes uses the parent helper for autosave and manual save while preserving its local draft safety net.
- Both child components retain a direct API fallback for isolated rendering/tests, but the live routed sheet has one persistence path.

### Mobile presentation

Mobile width uses the same `CleanCharacterSheet.js` data and save path as desktop/tablet. Device-specific CSS changes layout and touch geometry without introducing a second persistence implementation.

## Refactor rule

Do not split the character sheet and change save behaviour in the same PR.

Safe order:

1. Keep regression coverage for HP, temp HP, death saves, conditions, spell slots, notes, inventory, and concentration.
2. Extract vitals/header into smaller components without changing save behaviour.
3. Extract tab rendering into smaller components without changing save behaviour.
4. Keep responsive layout changes separate from live-save behavior so mobile and desktop continue sharing one persistence path.

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

## Limitations of this fix (November 2026)

- Writes use a **per-character queue shared across character-sheet mounts in one browser tab**. Previously accepted edits continue to their original character after navigation; reopening that character waits for old writes to finish *before* fetching the current HP, inventory, and notes, so the next action is calculated from the new values. Obsolete responses and toasts cannot overwrite another open sheet.
- Delayed save handlers (including concentration replacement confirmations) are tied to their originating sheet session and refuse to save into a later session.
- Damage-triggered concentration prompts are also cancelled after leaving a sheet; delayed concentration-roll callbacks cannot claim a spell was lost when the underlying clear save was rejected.
- Child components receive a non-success continuation result after their sheet is abandoned, even when an already accepted server write later succeeds. This prevents stale combat/spell toasts and follow-up actions from displaying on a newly opened character. Existing local note drafts are retained conservatively when completion cannot be confirmed by that screen.
- An old request that fails after the user leaves its sheet cannot notify that now-unrelated sheet; players should check important edits after reconnecting. Offline recovery/retry is a separate follow-up.
- Concurrent edits from two different devices are still not protected. A server-side revision/ETag check is needed for cross-device conflicts.
- The browser still needs a real-device smoke test for HP, conditions, spell slots, inventory, notes, and rests with a real signed-in playtest character. Automated pure queue tests do not prove mobile network reliability.
