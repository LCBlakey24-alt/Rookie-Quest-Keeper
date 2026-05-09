# Character Rules Audit

## Purpose
Track 2014/2024 character creation and character sheet rule issues so fixes are deliberate rather than whack-a-mole.

## Confirmed fixed

### Mobile/clean character sheet resources
- Monk Ki now gated to level 2+.
- Cleric Channel Divinity now gated to level 2+.
- Druid Wild Shape now gated to level 2+.
- Fighter Action Surge now gated to level 2+.
- Sorcerer Sorcery Points now gated to level 2+.
- Warlock Pact Magic fallback now shows 1 slot at level 1, 2 slots from level 2+.
- Concentration saves now use Constitution modifier plus proficiency only if proficient in Constitution saves.

## Next audit targets

### Character creator level support
- Add starting level selection during character creation.
- When starting above level 1, run the same choices normally gained by leveling:
  - subclass timing by edition
  - ASI / feat levels
  - fighting style timing
  - spell/cantrip gains
  - known vs prepared vs spellbook casters
  - class resources and hit dice

### 2014 vs 2024 subclass timing
- 2014: subclass timing varies by class.
- 2024: most classes choose subclass at level 3.
- Builder must use edition choice to decide when subclass choice appears.

### Spellcaster creation and leveling
- Known casters must pick known spells/cantrips at creation and when spell known count increases.
- Prepared casters must be able to prepare spells, not just list known spells.
- Wizards need spellbook spell selection and prepared spell selection separately.
- Warlock Pact Magic should be separate from normal spell slots.

### Backgrounds
- Expand backgrounds for testing with a clearly marked non-final/test pack.
- Do not copy protected book text.
- Use generic compatible summaries, skill/tool/language/equipment scaffolds, and optional 2024-style ASI/origin feat placeholders.
- Later: lock/remove non-SRD or paid-source-style content before public launch.

## Suspected class/resource checks to verify next
- Barbarian Rage uses by level.
- Bard Bardic Inspiration die size and refresh timing.
- Fighter Extra Attack display scaling.
- Rogue Sneak Attack dice scaling.
- Monk Martial Arts die / movement scaling.
- Paladin Lay on Hands pool and spellcasting from level 2.
- Ranger spellcasting from level 2.
- Cleric/Druid prepared spell counts.
- Wizard prepared spell count and spellbook size.
