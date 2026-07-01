# Manual Character Playtest Checklist

Purpose: prove that the automated progression audit works in the actual app, not only in helper tests.

Use this after `yarn build`, `yarn test --watchAll=false`, and backend tests pass.

## Playtest rules

For each character:

- Create the character from scratch at level 1.
- Open the saved character sheet.
- Level up one level at a time until level 20.
- Do not skip levels.
- After each level-up, refresh the character sheet once and confirm saved data still looks correct.
- Check mobile width, tablet width, and desktop width for the final character.
- Use the Feedback rail button to record anything confusing or broken.

## Global checks for every class

At each relevant level, confirm:

- Header uses readable race/class/subclass names, not slugs or dash text.
- Proficiency bonus updates at 5, 9, 13, and 17.
- HP and hit dice update after level-up.
- ASI/feat levels appear at the correct levels.
- Subclass choice appears at the correct level for that class/edition.
- The Features tab shows new class/subclass features.
- The Actions tab stays simple: Actions, Bonus Actions, Reactions.
- Resource cards are clickable where relevant and do not duplicate as dead text cards.
- Short rest and long rest restore the correct resources.
- Spell slots, known/prepared spells, pact slots, and cantrips update where relevant.
- The dice roller flickers for the full roll window, reveals dice one at a time, then shows the total/equation.

## Priority class runs

### 1. Monk — Open Hand reference run

Create: Monk level 1, Human or other supported race/species, no subclass until allowed.

Checkpoints:

- Level 1: Martial Arts and Unarmored Defense visible.
- Level 2: Ki / Discipline Points appears with max 2.
- Level 2: Flurry of Blows, Patient Defense, Step of the Wind appear under Bonus Actions.
- Level 2: Spending Ki lowers the visible resource count.
- Level 2: Short rest restores Ki / Discipline Points.
- Level 3: Select Way of the Open Hand / Warrior of the Open Hand.
- Level 3: Header displays readable subclass text.
- Level 3: Open Hand Technique appears without slug/dash text.
- Level 4: ASI/feat choice appears.
- Level 5: Extra Attack and Stunning Strike visible.
- Level 6: Wholeness of Body appears.
- Level 11: Tranquility appears.
- Level 17: Quivering Palm appears.
- Level 20: Monk capstone appears.
- After spending Ki at a lower level then levelling up, max Ki increases to the new Monk level.

### 2. Warlock — pact magic risk run

Create: Warlock level 1.

Checkpoints:

- Level 1: Pact Magic slots visible and restore on short rest.
- Level 2: Invocations/options appear.
- Level 3: Pact/subclass flow is understandable for the chosen ruleset.
- Levels 5, 7, 9: pact slot level increases correctly.
- Levels 11, 13, 15, 17: Mystic Arcanum or equivalent higher-level spell UX is not missing/confusing.
- Level 20: capstone appears.
- Actions tab includes usable spells in the correct action bucket.

### 3. Paladin — half caster/resource run

Create: Paladin level 1.

Checkpoints:

- Level 1: Lay on Hands appears under Actions and spends from the pool.
- Long rest restores Lay on Hands.
- Level 2: spellcasting appears with half-caster slots.
- Level 2: fighting style/smite-related choices are understandable.
- Level 3: subclass/oath choice and Channel Divinity appear.
- Level 5: Extra Attack appears.
- Level 20: oath/capstone feature appears or missing subclass data is clearly recorded.

### 4. Sorcerer — full caster/resource run

Create: Sorcerer level 1.

Checkpoints:

- Level 1: spellcasting works and subclass/origin flow matches the selected ruleset.
- Level 2: Sorcery Points appear and restore on long rest.
- Level 2: Convert Sorcery Points and Metamagic appear under Bonus Actions.
- Level 3: Metamagic choices are understandable.
- Spell slots update as a full caster through level 20.
- Level 20: capstone appears.

### 5. Fighter — martial/action run

Create: Fighter level 1.

Checkpoints:

- Level 1: Second Wind appears under Bonus Actions.
- Level 2: Action Surge appears under Actions.
- Level 3: subclass choice appears.
- Battle Master: Superiority Dice and maneuvers appear if selected.
- Level 5, 11, 20: Extra Attack scaling appears.
- Level 9, 13, 17: Indomitable appears/scales.
- Fighter ASI levels include 6 and 14.

## Failure logging format

When something breaks, record it like this:

```text
Class:
Level:
Ruleset/edition:
Character id/name:
Expected:
Actual:
Can reproduce after refresh: yes/no
Screenshot/video:
Likely file area:
```

## Pass/fail status

- Monk Open Hand: not manually completed
- Warlock: not manually completed
- Paladin: not manually completed
- Sorcerer: not manually completed
- Fighter: not manually completed
