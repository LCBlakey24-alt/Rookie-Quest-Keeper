# Manual Character Flow Checklist

Use this after the automated progression tests pass. The automated tests prove the data helpers can derive level 1–20 snapshots, but this checklist proves the actual app flow works for a real user on phone, tablet, and desktop.

## Before testing

Run:

```bash
cd frontend
yarn build
yarn test --watchAll=false

cd ../backend
pytest
```

Record the commit hash, browser/device, and whether you are testing 2014 or 2024 rules.

## Universal checks for every test character

For each character:

- Create the character at level 1.
- Open the finished character sheet.
- Confirm the left rail only shows the character sheet rail, not the global app rail.
- Confirm the rail has: Stats, Actions, Inventory, Spells, Features, Rook Helper, Notes, Feedback.
- Confirm the header name/subtitle is readable and has no slug/dash text.
- Confirm Stats shows ability scores, saving throws, passives, and skills.
- Confirm Actions is grouped only into Actions, Bonus Actions, and Reactions.
- Confirm Actions does not show duplicate dead cards when a clickable resource card exists.
- Confirm Features shows class/subclass features and proficiencies clearly.
- Confirm Rook Helper explains action economy and common terms.
- Roll at least one d20 and confirm the dice flickers for about 3.5 seconds, reveals dice one by one, then shows total and equation.
- Use Feedback from the rail and confirm the modal opens.

## Monk reference flow

Recommended first test because Monk exposed the original bugs.

### Level 1

- Create Monk level 1.
- Confirm no Ki / Discipline Points are shown yet.
- Confirm Martial Arts and Unarmored Defense are visible.
- Confirm Actions includes unarmed strike.

### Level 2

- Level up to 2.
- Confirm Ki / Discipline Points appears with max 2.
- Confirm Bonus Actions includes Flurry of Blows, Patient Defense, and Step of the Wind.
- Spend one Ki / Discipline Point.
- Confirm resource count decreases and saves.
- Short rest.
- Confirm Ki / Discipline Points restores.

### Level 3

- Level up to 3.
- Confirm subclass choice appears.
- Pick Open Hand / Warrior of the Open Hand.
- Confirm header displays readable Open Hand text, not slug/dash text.
- Confirm Ki / Discipline Points max is now 3, even if it was spent before level-up.
- Confirm Open Hand Technique appears as an action modifier/feature.

### Level 4

- Confirm ASI/feat choice appears.
- Apply an ASI or feat.
- Confirm the character sheet reflects the change.

### Level 5

- Confirm Extra Attack and Stunning Strike are visible.
- Confirm action economy remains simple and does not duplicate resource cards.

### Levels 6, 11, 17

- Confirm Open Hand features appear at the correct levels:
  - Wholeness of Body
  - Tranquility
  - Quivering Palm

### Level 20

- Confirm the level 20 Monk capstone appears.
- Confirm proficiency bonus is +6.
- Confirm resource max matches level 20.

## Warlock flow

Warlock should be tested early because Pact Magic is a known risk.

- Create Warlock level 1.
- Confirm Pact Magic slots appear separately from normal spellcasting.
- Level to 2 and confirm invocations are handled or clearly noted.
- Confirm Pact Magic restores on short rest.
- Level through 3, 5, 7, 9 and confirm pact slot level changes.
- Level through 11, 13, 15, 17 and confirm higher-level spell handling/Mystic Arcanum risk is documented if not fully implemented.
- Confirm spell cards appear in Actions / Bonus Actions / Reactions based on casting time when data exists.

## Paladin flow

- Create Paladin level 1.
- Confirm Lay on Hands appears as an action resource.
- Level to 2 and confirm spellcasting starts.
- Level to 3 and confirm subclass / Channel Divinity appears.
- Confirm Lay on Hands max equals Paladin level x5.
- Confirm Channel Divinity restores correctly for the selected rules edition.
- Confirm spell slots and prepared spell behaviour remain sane through level 20.

## Sorcerer flow

- Create Sorcerer level 1.
- Confirm spellcasting appears.
- Level to 2 and confirm Sorcery Points appear with max equal to Sorcerer level.
- Confirm Sorcery Points restore on long rest.
- Confirm Bonus Actions includes Sorcery Point / Metamagic options when relevant.
- Level to 3 and confirm subclass/metamagic progression is handled or clearly documented.
- Confirm spell/cantrip progression stays stable to level 20.

## Fighter flow

- Create Fighter level 1.
- Confirm Second Wind appears.
- Level to 2 and confirm Action Surge appears in Actions.
- Level to 3 and pick Battle Master.
- Confirm Superiority Dice appear and restore on short rest.
- Confirm Action Surge max becomes 2 at level 17.
- Confirm Indomitable appears from level 9 and scales correctly.

## Rogue flow

- Create Rogue level 1.
- Confirm Sneak Attack and expertise/proficiencies display.
- Level to 2 and confirm Cunning Action appears in Bonus Actions.
- Level to 3 and confirm subclass choice appears.
- Confirm Rogue ASI at level 10 appears.
- Confirm reaction/subclass features land in the correct bucket if available.

## Pass/fail notes

For every issue found, record:

- Character class/subclass/species/background.
- Rules edition.
- Level.
- Expected behaviour.
- Actual behaviour.
- Screenshot/video if possible.
- Whether it is data, UI, backend, or action economy.

## Sign-off rule

Do not mark a class as ready until:

- automated tests pass,
- level 1 creation works,
- level-up to 20 works,
- resources unlock/restore correctly,
- subclass choice and subclass features appear,
- action economy buckets are correct,
- no ugly slug/dash names appear,
- mobile layout is usable.
