# Character Manual Test Checklist

Purpose: turn the automated 1-to-20 audit into real browser checks. The automated data tests prove helpers can derive progression, but these steps prove the actual app flow works for a player on desktop, tablet, and mobile.

## Test setup

Use a clean test account or disposable characters. For each class below, record:

- device size tested: mobile / tablet / desktop
- rules edition: 2014 / 2024 where available
- character id
- starting class/species/background
- subclass chosen
- first level where an issue appears
- screenshot or short video if something breaks

After each test, run:

```bash
cd frontend
yarn build
yarn test --watchAll=false
```

And when backend routes were touched:

```bash
cd backend
pytest
```

## Universal level-up checklist

For every tested character:

- [ ] Create level 1 character successfully.
- [ ] Character opens from My Characters.
- [ ] Header name/class/subclass text is readable, not slugged.
- [ ] Stats tab shows ability scores, saving throws, passives, and skills without text hugging the card edges.
- [ ] Actions tab is grouped only by Actions / Bonus Actions / Reactions.
- [ ] Inventory tab opens and does not break layout.
- [ ] Spells tab opens for casters and does not appear broken for non-casters.
- [ ] Features tab shows class/species/background/feat/proficiency details clearly.
- [ ] Rook Helper tab opens and gives rules guidance.
- [ ] Notes tab opens and saves text.
- [ ] Feedback button appears at the bottom of the rail.
- [ ] Dice roller flickers for roughly 3.5 seconds, reveals dice one-by-one, then shows total and equation.
- [ ] Level up can proceed one level at a time.
- [ ] Proficiency bonus changes at levels 5, 9, 13, and 17.
- [ ] ASI/feat choice appears at expected levels.
- [ ] HP and hit dice update after each level.
- [ ] Short rest and long rest behave correctly.
- [ ] Level 20 can be reached without blocking or corrupting the sheet.

## Monk reference test

Known focus: Ki/Discipline Points, Open Hand display, action economy.

- [ ] Create Monk level 1.
- [ ] Confirm no Ki/Discipline Points at level 1.
- [ ] Level to 2.
- [ ] Confirm Ki/Discipline Points appear with max 2.
- [ ] Confirm Bonus Actions include Flurry of Blows, Patient Defense, and Step of the Wind.
- [ ] Spend one Ki/Discipline Point.
- [ ] Confirm resource count decreases and card text updates.
- [ ] Short rest restores Ki/Discipline Points.
- [ ] Level to 3.
- [ ] Choose Way of the Open Hand / Warrior of the Open Hand.
- [ ] Confirm header shows readable subclass text.
- [ ] Confirm Open Hand Technique appears without slug/dash text.
- [ ] Level to 4 and confirm ASI/feat choice.
- [ ] Level to 5 and confirm Extra Attack and Stunning Strike are visible.
- [ ] Level to 6 and confirm Wholeness of Body appears.
- [ ] Level to 11 and confirm Tranquility appears.
- [ ] Level to 17 and confirm Quivering Palm appears.
- [ ] Level to 20 and confirm capstone appears.
- [ ] Repeat subclass check with Shadow Monk if available.

## Warlock test

Known focus: Pact Magic, invocations, patron/subclass timing, Mystic Arcanum follow-up.

- [ ] Create Warlock level 1.
- [ ] Confirm Pact Magic spell slots appear and restore on short rest.
- [ ] Confirm patron/subclass choice appears at correct level for chosen rules edition.
- [ ] Level to 2 and confirm invocations/options appear.
- [ ] Confirm Pact Magic resource/action validation does not behave like normal full-caster slots.
- [ ] Level to 3 and confirm Pact Boon flow if supported.
- [ ] Level to 4 and confirm ASI/feat.
- [ ] Level to 5 and confirm pact slot level changes correctly.
- [ ] Level to 11 and check Mystic Arcanum or equivalent high-level spell UX risk.
- [ ] Level to 17 and confirm high-level pact progression remains sane.
- [ ] Level to 20 and confirm capstone appears.

## Paladin test

Known focus: half casting, Lay on Hands, Channel Divinity, Extra Attack.

- [ ] Create Paladin level 1.
- [ ] Confirm Lay on Hands appears under Actions and has correct max.
- [ ] Spend Lay on Hands and confirm resource updates.
- [ ] Long rest restores Lay on Hands.
- [ ] Level to 2 and confirm spellcasting starts.
- [ ] Confirm spell slots and prepared spells area behaves correctly.
- [ ] Level to 3 and confirm oath/subclass and Channel Divinity appear.
- [ ] Confirm Channel Divinity resource appears under Actions.
- [ ] Level to 4 and confirm ASI/feat.
- [ ] Level to 5 and confirm Extra Attack.
- [ ] Level to 20 and confirm capstone/subclass high-level features display where local data exists.

## Sorcerer test

Known focus: Sorcery Points, Metamagic, known spells, full-caster progression.

- [ ] Create Sorcerer level 1.
- [ ] Confirm spellcasting works at level 1.
- [ ] Confirm subclass/origin appears at correct level for chosen rules edition.
- [ ] Level to 2 and confirm Sorcery Points appear with max 2.
- [ ] Confirm Bonus Actions include Convert Sorcery Points and Metamagic.
- [ ] Spend Sorcery Point and confirm resource updates.
- [ ] Long rest restores Sorcery Points.
- [ ] Level to 3 and confirm Metamagic choices if supported.
- [ ] Confirm spell slots follow full-caster table.
- [ ] Level through ASI/feat levels.
- [ ] Level to 20 and confirm capstone appears.

## Fighter test

Known focus: Action Surge, Second Wind, Extra Attack, ASI frequency, Battle Master resource.

- [ ] Create Fighter level 1.
- [ ] Confirm Second Wind appears under Bonus Actions.
- [ ] Level to 2 and confirm Action Surge appears under Actions.
- [ ] Level to 3 and choose Champion or Battle Master if available.
- [ ] If Battle Master, confirm Superiority Dice and maneuvers appear.
- [ ] Level to 4, 6, 8, 12, 14, 16, and 19 and confirm ASI/feat prompts.
- [ ] Level to 5, 11, and 20 and confirm Extra Attack scaling.
- [ ] Level to 9 and confirm Indomitable appears under Reactions.

## Rogue test

Known focus: Cunning Action, ASI at 10, subclass features, reaction features.

- [ ] Create Rogue level 1.
- [ ] Level to 2 and confirm Cunning Action appears under Bonus Actions.
- [ ] Level to 3 and choose subclass if available.
- [ ] Level to 4 and confirm ASI/feat.
- [ ] Level to 10 and confirm extra Rogue ASI/feat prompt.
- [ ] Confirm Sneak Attack and reaction/subclass features display clearly where local data exists.
- [ ] Level to 20 and confirm capstone appears.

## Public-ready sign-off rule

A class should not be marked public-ready until:

- automated audit tests pass
- a manual level 1-to-20 browser run has been completed
- mobile layout has been checked at least once
- any missing subclass/resource/spellcasting notes are recorded in `memory/CHARACTER_1_TO_20_AUDIT.md`
