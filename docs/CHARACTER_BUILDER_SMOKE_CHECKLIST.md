# Character Builder + Sheet Smoke Checklist

Use this checklist after changes to the full character creator, starting-level supervisor, level-up choice bridge, spell setup, or clean character sheet.

## Automated checks

Run these from a clean checkout before release:

```bash
cd frontend
yarn install --frozen-lockfile
yarn build
```

Then run the focused character audit tests:

```bash
cd frontend
yarn test:character-audit --watchAll=false
```

If frontend dependency or routing code changed, also run the broader frontend test suite:

```bash
cd frontend
yarn test --watchAll=false
```

Backend sanity check:

```bash
cd backend
pytest
```

## Manual smoke flow: standard character creation

1. Log in and go to the character creator.
2. Create a level 1 Fighter using bundled rules only.
3. Save the character.
4. Open the clean sheet.
5. Confirm HP, AC, hit dice, proficiency bonus, class features, inventory, and notes render without errors.
6. Open the edit route and confirm the existing character can still be edited.

## Manual smoke flow: starting above level 1

1. Create a character with a starting level above 1.
2. Confirm the Starting Level Supervisor appears.
3. Change the level and confirm subclass/ASI/spell/class-specific choice panels update.
4. Choose an ASI and save.
5. Reopen the sheet and confirm ability scores, HP, hit dice, proficiency bonus, class features, and resources reflect the chosen level.
6. Repeat with a feat choice and confirm the feat appears on the saved character.

## Manual smoke flow: spellcasters

### Known-spell caster

1. Create a Bard, Sorcerer, Warlock, or Ranger above the level where spells are available.
2. Pick cantrips and known spells in the Starting Level Supervisor.
3. Save and open the Spells tab.
4. Confirm cantrips and known spells appear.
5. Cast a levelled spell and confirm spell slots decrease.
6. Restore a spell slot and confirm it saves.

### Prepared caster

1. Create a Cleric, Druid, Paladin, or Wizard above the level where spells are available.
2. Pick prepared spells in the Starting Level Supervisor.
3. Save and open the Spells tab.
4. Confirm prepared spells appear in the Prepared Spells section.
5. Cast and unprepare/reprepare spells where available.
6. Confirm the character no longer shows the Spells tab attention warning once spell choices exist.
7. Change the caster's spellcasting ability score in the builder and confirm the prepared spell target updates.

## Manual smoke flow: Warlock

1. Create a Warlock at level 3 or above.
2. Choose a subclass, Pact Boon, invocations, cantrips, and known spells.
3. Save and open the sheet.
4. Confirm Pact Boon and Eldritch Invocations appear in Selected Class Choices.
5. Confirm Pact Magic appears on the Spells tab.
6. Cast a Warlock spell and confirm the pact slot count changes.

## Manual smoke flow: class-specific choices

### Fighting Style

1. Create a Fighter level 1+, Paladin level 2+, or Ranger level 2+.
2. Choose a Fighting Style.
3. Save and open the Class tab.
4. Confirm the Fighting Style appears in Selected Class Choices and in class features if saved as a feature.

### Expertise

1. Create a Rogue level 1+ or Bard level 3+.
2. Choose Expertise skills.
3. Save and open the Class tab.
4. Confirm Expertise appears in Selected Class Choices.

### Metamagic

1. Create a Sorcerer level 3+.
2. Choose Metamagic options.
3. Save and open the Class tab.
4. Confirm Metamagic appears in Selected Class Choices.
5. Confirm Sorcery Points appear in Class Resources.
6. Spend and restore Sorcery Points and confirm the saved count updates after refresh.

### Battle Master maneuvers

1. Create a Fighter level 3+ and choose Battle Master as the subclass.
2. Choose maneuvers.
3. Save and open the Class tab.
4. Confirm Maneuvers appear in Selected Class Choices.
5. Confirm Superiority Dice appear in Class Resources.
6. Spend and restore Superiority Dice and confirm die size, total, and remaining values are preserved after refresh.

## Manual smoke flow: uploaded/homebrew content

1. Upload or create a homebrew race/species, class, subclass, feat, and spell.
2. Open the character creator with uploaded options available.
3. Confirm uploaded races/classes/subclasses/backgrounds are merged into normal dropdowns.
4. Confirm uploaded feats can be selected in ASI/feat choices.
5. Confirm uploaded spells appear in the spell choice/library flow when they include compatible class data.
6. Save and open the clean sheet to confirm homebrew traits, features, spells, and resources are visible.

## Regression checks

- Character creation still works without uploaded content.
- Character creation still works with uploaded content unavailable or API failure.
- Save interception does not affect non-character API calls.
- Editing an existing character does not duplicate ASIs, feats, spells, invocations, or class choices.
- Class and Features tabs both show the same selected choices and resource controls.
- Spells tab can still manage slots after a long rest or short rest.
- Mobile viewport: Starting Level Supervisor, class-specific choices, Spells tab, Class tab, and resource buttons remain usable at phone width.

## Known caveats to verify manually

- The builder currently uses bridge-layer payload enhancement; future work should move this into a first-class creator payload pipeline.
- Prepared spell counts now read draft ability scores, but should still be smoke tested at low and high spellcasting scores.
- Battle Master detection currently depends on the saved subclass name containing `Battle Master`.
- Some homebrew resources are displayed read-only unless they use supported saved resource fields.
