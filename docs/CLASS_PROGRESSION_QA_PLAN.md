# Class Progression QA Plan

This checklist is the recommended way to make the player-side level-up system trustworthy for real campaigns.

## Why test one class at a time?

Yes. The safest rollout is to verify one class from level 1 to level 20 before moving to the next class. A class-by-class pass catches progression bugs where they actually matter: hit dice, spell slots, subclass timing, features, resources, attacks, and sheet display.

## Pass criteria for each class

For each class, create a fresh character and level it from 1 to 20. At every level, verify:

- HP workflow allows rolled or manual HP and stores the chosen value.
- Proficiency bonus and total level update correctly.
- Class features appear at the correct level.
- Subclass choices appear at the correct level for the selected rules edition.
- Resources/uses refresh correctly on short rest or long rest where applicable.
- Spellcasting, spell slots, prepared/known spells, spell save DC, and spell attack bonus update correctly for spellcasters.
- Multiclass math remains stable when another class is added.
- Equipment-derived AC and weapon attacks still display correctly after level-up.
- Character sheet, combat tab, and player dashboard all show the updated character after refresh.

## Recommended order

1. Fighter — simplest martial baseline, attacks/resources/action surge style checks.
2. Rogue — skill expertise, sneak attack scaling, finesse/ranged attack checks.
3. Cleric — prepared full caster, armor/shield, channel divinity-style resources.
4. Wizard — spellbook/full caster, prepared spell math, high-level spell slots.
5. Warlock — pact magic should remain separate from normal multiclass slots.
6. Paladin/Ranger — half-caster math and martial equipment checks.
7. Barbarian/Monk — unarmored defenses and class resources.
8. Bard/Druid/Sorcerer — full-caster variants, known/prepared spells, class resources.

## Epic level / beyond 20 campaigns

Characters may have total class levels above 20 in homebrew campaigns. Standard 5e spell-slot tables still top out at caster level 20, so spell-slot lookup should cap at 20 while keeping the real total/multiclass level visible for homebrew rules and GM decisions.

Future improvement: add a campaign-level setting for the GM's maximum total character level, then show that cap in the level-up UI before a player adds another class level.
