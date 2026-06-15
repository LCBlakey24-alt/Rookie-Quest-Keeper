# Class Completion Dashboard

This dashboard tracks class-completion work against the same standard used for Fighter and Barbarian.

## Completion standard

A class is 100% complete when it has:

1. Core class data
2. Character detection helper
3. Progression helper
4. Resource rules
5. Builder options
6. Builder readiness
7. Sheet summary
8. Subclass summary
9. Final status
10. Package export and focused tests

## Current class status

| Priority | Class | Completion | Status | Next work |
| --- | --- | ---: | --- | --- |
| 0 | Fighter | 100% | Complete | Playtest polish only; core Fighter implementation is complete. |
| 0 | Barbarian | 100% | Complete | Playtest polish only; core Barbarian implementation is complete. |
| 1 | Rogue | 10% | Next | Build Rogue progression, Sneak Attack scaling, Cunning Action sheet actions, subclass summaries, final status, package export, and tests. |
| 2 | Monk | 20% | Queued | Build Monk progression, Ki/Discipline point summaries, unarmored movement/defense summaries, subclass summaries, final status, package export, and tests. |
| 3 | Paladin | 20% | Queued | Build Paladin progression, Lay on Hands/Channel Divinity/Divine Smite summaries, aura tracking, spellcasting integration, final status, package export, and tests. |
| 4 | Ranger | 10% | Queued | Build Ranger progression, exploration/combat feature summaries, weapon/spell choices, subclass summaries, final status, package export, and tests. |
| 5 | Bard | 20% | Queued | Build Bard progression, Bardic Inspiration scaling, Expertise/Magical Secrets choices, spellcasting summaries, final status, package export, and tests. |
| 6 | Cleric | 20% | Queued | Build Cleric progression, domain summaries, Channel Divinity scaling, prepared-spell support, final status, package export, and tests. |
| 7 | Druid | 20% | Queued | Build Druid progression, Wild Shape summaries, circle summaries, prepared-spell support, final status, package export, and tests. |
| 8 | Wizard | 20% | Queued | Build Wizard progression, Arcane Recovery/school summaries, spellbook/prepared-spell support, final status, package export, and tests. |
| 9 | Warlock | 20% | Queued | Build Warlock progression, Pact Magic, invocations, pact boon, patron summaries, final status, package export, and tests. |
| 10 | Sorcerer | 20% | Queued | Build Sorcerer progression, Sorcery Point/Metamagic summaries, origin summaries, final status, package export, and tests. |

## Next recommendation

Start Rogue next. It is the clearest martial baseline after Fighter and Barbarian because it introduces one major scaling combat mechanic, Sneak Attack, plus Cunning Action and subclass feature tracking without requiring full spellcasting infrastructure.
