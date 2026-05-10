# Full Site Audit TODO

Generated during the rebuild pause to consolidate issues across frontend, backend, rules data, character creator, character sheet, GM tools, tests, and cost-control decisions.

## Current priorities

### P0 — must fix before more feature expansion
1. **Character creator skill-count bug**
   - Background-granted skills must not count as selected class skills.
   - Existing draft sanitizer exists, but the live skill step still needs direct UI logic cleanup.
   - The skills page should show:
     - Background skills: granted/free
     - Class skills: selected X / required Y
     - Half-Elf versatility skills: separate counter when relevant

2. **Character sheet Level Up button is still not wired**
   - `CleanCharacterSheet` still has a Level Up button that says it is coming later.
   - It needs to open `LevelUpWizard` or a clean replacement.
   - This is one of the most visible broken promises in the player flow.

3. **Dice popup timing**
   - CSS flicker/hold styling exists.
   - `persistRollBurst` helper exists and is installed.
   - Still verify in-browser that the result stays visible for 6 seconds.
   - If not, directly patch `CleanCharacterSheet.js` timeout from 1800ms to 6000ms.

4. **Equipment attacks are partially wired but need verification**
   - Shared weapon data exists in `equipmentRules5e.js`.
   - Combat derivation helpers exist in `characterCombatDerivations.js`.
   - Combat tab has been refactored toward attack stat cards, but final mobile verification is needed.
   - Confirm equipped Longsword/Rapier/Quarterstaff/etc. show real to-hit, damage dice, and type.

5. **Character update backend compatibility**
   - Lenient PATCH route exists to prevent failed updates from new frontend fields.
   - Verify route order in production after Render deploy.
   - Confirm all current fields save:
     - portrait_url
     - resources
     - inventory/equipped
     - spell_slots_remaining
     - conditions
     - death saves
     - inspiration
     - concentration

## P1 — rules correctness and character creation

### Starting level support
- Issue #72 tracks this work.
- Helpers already added:
  - `classLevelRules.js`
  - `startingLevelPreview.js`
  - `classResourceRules.js`
  - `startingEquipmentRules.js`
  - `startingEquipmentItems.js`
- Builder still needs UI integration.
- Starting level must trigger:
  - subclass choices based on edition
  - ASI/feat choices
  - spell/cantrip choices
  - prepared spell selection
  - HP/hit dice scaling
  - class resource initialization

### 2014 / 2024 subclass timing
- `classLevelRules.js` now centralizes subclass timing.
- Builder still contains older local subclass timing checks.
- Remove or replace local checks in `CharacterBuilder.js` with shared helper:
  - 2014 Cleric/Sorcerer/Warlock at level 1
  - 2014 Wizard level 2
  - 2014 Druid level 2
  - 2014 most others level 3
  - 2024 mostly level 3

### Spellcaster rules
- Creation currently does not fully handle higher-level spell choices.
- Prepared casters need clear preparation support.
- Wizard must separate spellbook spells from prepared spells.
- Warlock Pact Magic must remain separate from normal spell slots.
- Paladin/Ranger spellcasting starts at level 2.
- Known casters must choose known spells/cantrips at creation and level-up when counts increase.

### Class resources
- Shared resource helper exists in `classResourceRules.js`.
- Clean combat sheet uses it.
- Builder payload should use `buildInitialClassResources()` for new characters.
- Long/short rest behaviour should use `restoreClassResources()`.
- Verify resource timing:
  - Monk Ki level 2+
  - Fighter Action Surge level 2+
  - Cleric Channel Divinity level 2+
  - Druid Wild Shape level 2+
  - Sorcerer Sorcery Points level 2+
  - Paladin Channel Divinity level 3+
  - Fighter Indomitable level 9+

## P1 — equipment, attacks, and armour

### Weapon attacks
- `equipmentRules5e.js` exists.
- `characterCombatDerivations.js` exists.
- Need to finish wiring `deriveEquippedWeaponAttacks()` into `CleanCombatTab.js` fully.
- Attack cards should show:
  - top: name, range, properties/components/radius
  - bottom: to-hit/save, damage, damage type

### Armour and shield AC
- `armorRules5e.js` exists.
- `deriveArmorClass()` exists.
- Clean sheet AC still appears to use static character AC.
- Need to wire armour AC calculation so equipped armour/shield can update/display AC.
- Need to respect:
  - light armour full Dex
  - medium armour max +2 Dex
  - heavy armour no Dex
  - shield +2
  - unarmoured fallback

### Inventory/equipment editing
- Player inventory supports add/search/quantity/favourites/consumables.
- It still needs structured weapon/armour editing fields:
  - damage dice
  - damage type
  - range
  - properties
  - attack ability
  - armour category
  - base AC
  - shield bonus

### Starting equipment
- `startingEquipmentRules.js` and `startingEquipmentItems.js` exist.
- Builder still needs a real chooser for class equipment groups.
- Payload should create structured equipment items rather than vague strings.

## P1 — mobile character sheet UX

### HP controls
- CSS override exists to keep amount + Damage + Heal on one line.
- Verify on real phone sizes.
- Temp HP still takes more space; consider compacting later.

### Roll controls
- Roll mode controls exist:
  - normal
  - advantage
  - disadvantage
  - custom bonus
- Need better explanation for custom bonus.
- Bless/Guidance quick presets could come later.

### Conditions
- Conditions strip exists.
- Need richer rules effects later:
  - poisoned disadvantage
  - restrained attacks/saves changes
  - prone melee/ranged interactions
  - incapacitated/unconscious action restrictions

### Death saves
- Death saves panel exists when HP is 0 or saves are marked.
- Verify persistence via backend lenient patch.

### Rest buttons
- Short/long rest buttons exist.
- Long rest has frontend fallback.
- Need backend + frontend to use `restoreClassResources()` properly.

## P2 — background expansion and legal cleanup

### Test backgrounds
- Test-only background pack exists in `testBackgrounds5e.js`.
- It is wired through `applyTestBackgrounds.js` and imported in `App.js`.
- Before public paid launch:
  - remove
  - lock behind homebrew/import mode
  - or replace with licensed/SRD-safe content
- All test backgrounds should stay clearly marked `[TEST]`.

### Production background plan
- Keep SRD/free/open content in base app.
- Let users add/import homebrew backgrounds.
- Avoid copying paid-book text.
- If paid-source support is desired, use user-provided content or licensed content strategy.

## P2 — AI / cost-control

### Image generation
- Decision: disable paid image generation for now.
- Character creator portrait is upload-only.
- Shared image panel is upload-only.
- Backend paid image route removed.
- Old AI portrait tests removed.
- Text-based Rook helpers remain enabled.

### Text AI helpers
- Keep Rook text generation.
- Need future usage tracking/cost guardrails.
- Consider monthly text-generation cap per user if needed.

## P2 — code cleanup

### Large files needing refactor
- `CharacterBuilder.js` is too large and fragile.
- `CleanCharacterSheet.js` is too large and hard to patch safely.
- Break into smaller components:
  - BuilderHeader
  - BuilderProgress
  - BuilderStepShell
  - SkillsStep
  - SpellsStep
  - EquipmentStep
  - ReviewStep
  - SheetHeader
  - SheetVitals
  - SheetMobileTools
  - OverviewTab

### Dead/legacy files
- AI portrait backend route deleted.
- AI image tests removed.
- Old/legacy files should continue to be scanned before deletion.

### Styling drift
- Current design is red + charcoal.
- Avoid restoring blue/gold design.
- Some old comments may still mention navy/gold; clean comments gradually.

## P2 — backend/tests

### Tests to add/update
- Character PATCH accepts all active sheet/builder fields.
- Level 1 Monk has no Ki.
- Level 2 Monk has Ki.
- Fighter level 1 no Action Surge.
- Fighter level 2 Action Surge.
- 2014/2024 subclass timing tests.
- Background test pack appears in builder only when test pack is enabled/imported.
- Image generation routes are not registered.
- Upload-only portrait flow works.

## Suggested next work order
1. Wire class resources into character creation payload.
2. Wire structured starting equipment into the builder.
3. Finish combat attack card logic using `deriveEquippedWeaponAttacks()`.
4. Wire armour AC calculation into the clean sheet.
5. Add starting level selector and higher-level choice preview.
6. Reconnect Level Up button.
7. Refactor `CharacterBuilder.js` into smaller step components.
8. Refactor `CleanCharacterSheet.js` into smaller components.
