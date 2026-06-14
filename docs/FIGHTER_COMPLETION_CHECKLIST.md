# Fighter Completion Checklist

This checklist tracks when the Fighter class can be considered complete enough to move on to the next class.

## Current status

**Status: In progress — Fighter is table-ready for core 2014/2024 play, but not marked 100% until edit-mode Battle Master/Eldritch Knight pickers and full UI smoke passes are complete.**

## Already implemented

- Fighter level detection works for single-class and multiclass characters.
- Extra Attack count is shown on the combat sheet: 2 attacks at Fighter 5, 3 at Fighter 11, 4 at Fighter 20.
- Champion critical range is shown: 19–20 at Fighter 3, 18–20 at Fighter 15.
- Fighter resources are tracked on the combat page: Second Wind, Action Surge, Indomitable, and Battle Master superiority dice.
- Second Wind rolls healing, updates HP, and spends the resource.
- Action Surge, Indomitable, and Battle Master maneuvers can spend their tracked resources.
- Battle Master maneuver list is surfaced with descriptions and superiority die size.
- Level-up can prompt for a missing Fighter fighting style on later levels if an older/imported Fighter does not have one saved.
- Battle Master maneuver selection in level-up now scales beyond the first 3 maneuvers as Fighter level increases.
- Indomitable has a save-reroll panel on the combat sheet, including the 2024 bonus when using 2024 rules.
- Action Surge now leaves an explicit extra-action reminder after use so players know what to do with the spent resource.
- Champion helpers now surface Remarkable Athlete and Survivor reminders, including a Survivor heal action when the level 18 trigger is valid.
- Eldritch Knight now has a compact spell helper for Intelligence spell DC, spell attack, Weapon Bond, and War Magic reminders.
- Eldritch Knight now also has a Spells-tab helper for spell DC, spell attack, cantrip targets, known-spell targets, max spell level, Weapon Bond, and War Magic reminders.
- Eldritch Knight can now add/remove Wizard cantrips and known spells directly from the Spells tab, capped by the current Fighter level target counts.
- Fighter fighting styles now affect derived combat math where possible:
  - Defense adds +1 AC while armour is equipped.
  - Archery adds +2 to ranged weapon attack rolls.
  - Dueling adds +2 damage for one-handed melee weapons when no off-hand weapon is equipped.
- Fighter resources now use Fighter class level for multiclass characters rather than total character level.
- Basic character creation now requires and saves a Fighter Fighting Style at level 1, with short guidance for each style.
- Fighter overview now mirrors the most important Combat-tab readiness data: attacks per action, Champion critical range, Fighting Style, Action Surge, Indomitable, Battle Master maneuver count, subclass note, and next milestone.
- Automated Fighter progression coverage now verifies Fighter ASI/feat cadence is consistent across character rules and level-up helpers, plus Extra Attack milestone coverage from levels 1–20.

## Must finish before Fighter is complete

- Full browser-level smoke passes should explicitly verify Fighter levels 1–20, including Fighter ASI/feat levels and subclass selection at level 3.
- Full character edit should make missing Fighting Style repair easier before the player reaches level-up; basic and full creation paths now cover it.
- Battle Master maneuver selection is editable from the combat sheet, but should also be available in character edit.
- Eldritch Knight spell editing now exists on the Spells tab; still add deeper school/edition restrictions and browser smoke coverage before marking it final.
- Action Surge now blocks spending a second use while the extra-action reminder is active; still add automated coverage for this behavior.
- Great Weapon Fighting, Protection/Interception-style reactions, and Two-Weapon Fighting need clearer table guidance; some require user choice or situational rerolls rather than pure automatic math.
- Add automated tests for Fighter level milestones 1–20 and key multiclass resource edge cases.

## Recommended next class after Fighter

Rogue should be next because it is another mostly non-spellcasting class and will validate the action/bonus-action/reaction layout with Sneak Attack, Cunning Action, Uncanny Dodge, Evasion, and Reliable Talent before moving to full spellcasters.
