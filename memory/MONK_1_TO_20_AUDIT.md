# Monk 1–20 Character Audit

Status: started from the live character-sheet work after the Open Hand Monk exposed formatting/resource/action issues.

## Current verdict

Monk is closer to playable, but still needs an end-to-end browser test from level 1 to 20 before marking it fully ready.

## Checks covered in this pass

### Character header naming

- Fixed subtitle normalisation so stored subclass values like `way-of-the-open-hand`, `way – of – the – open – hand`, or accidental `way dash of dash the dash open dash hand` render as readable title text.
- This specifically covers the Open Hand display bug reported from the character sheet header.

### Monk class features

Relevant base Monk features exist in `frontend/src/data/classFeatures.js`:

- Level 1: Unarmored Defense, Martial Arts
- Level 2: Ki / Discipline-style resource, Flurry of Blows, Patient Defense, Step of the Wind, Unarmored Movement
- Level 3: Deflect Missiles / Deflect Attacks, subclass choice
- Level 4: Slow Fall
- Level 5: Extra Attack, Stunning Strike
- Level 6+: scaling/passive Monk progression
- Level 14: Diamond Soul / Disciplined Survivor
- Level 18: Empty Body / Superior Defense
- Level 20: Perfect Self / Body and Mind

### Open Hand / Shadow subclass action mapping

Added a character feature selector helper that can pull subclass feature data into the live sheet and classify feature timing.

Known Monk subclass mappings added:

#### Way / Warrior of the Open Hand

- Open Hand Technique → action modifier
- Wholeness of Body → action
- Tranquility → passive
- Quivering Palm → action modifier

#### Way / Warrior of Shadow

- Shadow Arts → action
- Shadow Step → bonus action
- Cloak of Shadows → action
- Opportunist → reaction

### Actions tab

The Actions tab now pulls action-economy items from:

- equipped weapon attacks
- unarmed strike
- known/prepared spells grouped by casting time
- class/subclass features
- species/race features saved on the character
- feats saved on the character
- class resources
- basic shared actions

Monk-specific resource cards now appear under Bonus Actions:

- Flurry of Blows
- Patient Defense
- Step of the Wind

These use the Ki / Discipline Points resource and save the remaining count back onto the character.

### Resource rest behaviour

The sheet now restores class resources locally when rest endpoints are unavailable.

For Monk:

- Ki / Discipline Points appear from level 2 onward.
- Max resource count equals Monk level.
- Resource restores on short rest.
- Long rest also restores resources.

This matters because a Monk has to spend Ki/Discipline Points repeatedly across the adventuring day.

## Still not fully proven

These still need manual or automated testing before Monk can be marked complete:

1. Create fresh Monk at level 1.
2. Level to 2 and confirm Ki/Discipline Points appear.
3. Level to 3 and confirm subclass choice appears.
4. Select Open Hand and confirm the display name is clean.
5. Confirm Flurry of Blows, Patient Defense, Step of the Wind spend resource correctly.
6. Confirm short rest restores Ki/Discipline Points.
7. Confirm level 4 ASI/feat choice appears.
8. Confirm level 5 Extra Attack and Stunning Strike are visible.
9. Confirm Open Hand features appear at levels 3, 6, 11, and 17.
10. Confirm level 20 feature appears.
11. Repeat the subclass check for Shadow.
12. Repeat using 2024 rules naming where the backend offers Warrior-style subclass names.

## Important caveat

The wider site still needs the same audit for every class. Monk is just the first targeted pass because it exposed visible issues first.
