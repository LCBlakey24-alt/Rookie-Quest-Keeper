# Class Completion Dashboard

This dashboard tracks class-completion work against the same standard used for the completed class packages.

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
| 0 | Rogue | 100% | Complete | Playtest polish only; core Rogue implementation is complete. |
| 0 | Monk | 100% | Complete | Playtest polish only; core Monk implementation is complete. |
| 0 | Paladin | 100% | Complete | Playtest polish only; core Paladin implementation is complete. |
| 0 | Ranger | 100% | Complete | Playtest polish only; core Ranger implementation is complete. |
| 0 | Bard | 100% | Complete | Playtest polish only; core Bard implementation is complete. |
| 0 | Cleric | 100% | Complete | Playtest polish only; core Cleric implementation is complete. |
| 1 | Druid | 40% | Next | Build Druid circle summaries, prepared-spell support, builder readiness, sheet summary, final status, package export, and tests. |
| 2 | Wizard | 20% | Queued | Build Wizard progression, Arcane Recovery/school summaries, spellbook/prepared-spell support, final status, package export, and tests. |
| 3 | Warlock | 20% | Queued | Build Warlock progression, Pact Magic, invocations, pact boon, patron summaries, final status, package export, and tests. |
| 4 | Sorcerer | 20% | Queued | Build Sorcerer progression, Sorcery Point/Metamagic summaries, origin summaries, final status, package export, and tests. |

## Next recommendation

Continue Druid next. Progression and character detection helpers are now started, so the next useful step is circle/subclass summaries followed by builder readiness. Druid is still close enough to Cleric to reuse prepared-caster patterns, but Wild Shape needs its own careful sheet summary layer.
