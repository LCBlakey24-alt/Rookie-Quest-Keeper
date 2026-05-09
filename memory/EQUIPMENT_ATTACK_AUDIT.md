# Equipment / Attack Audit

## Goal
Make character sheet attacks depend on structured weapon/equipment data instead of loose item names.

## Completed
- Added shared SRD/basic-compatible weapon rules in `frontend/src/data/equipmentRules5e.js`.
- Added `findWeaponRule(itemOrName)` to match equipment names to weapon data.
- Added `getWeaponAbilityMod(rule, strengthMod, dexterityMod)` for strength/dex/finesse weapon handling.
- Added mobile attack/spell card styling support through `mobileSheetPolish.css`.

## Next implementation steps
1. Wire `findWeaponRule()` into `CleanCombatTab.js` weapon profile generation.
2. Display each attack/spell card as:
   - top: attack/spell name plus range, properties/components, radius if applicable
   - bottom: To Hit / Save, Damage, Damage Type
3. Improve Inventory item form so weapons can store structured fields:
   - damage dice
   - damage type
   - range
   - properties
   - attack ability
4. Add a starter equipment selector in character creation so players choose real weapons/armour rather than receiving vague text entries.
5. Add armour AC support so equipping armour/shields changes AC where appropriate.

## Known problems
- A player can add a sword as loose text, but the sheet may not know its to-hit/damage unless the name matches a weapon rule.
- Some class starting equipment entries are currently vague strings such as `martial weapon` instead of concrete selectable equipment.
- Attack card JS markup is partly improved, but final full verification is still needed on mobile.

## Safe rule approach
Use open/basic SRD-style equipment data only. Avoid copying proprietary item descriptions from paid books.
