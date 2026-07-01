# Character 1-to-20 Progression Audit

Scope: frontend progression data, class resource rules, action-economy cards, and backend level-up support for the twelve core classes. This audit intentionally uses existing repo/SRD-style/homebrew-safe summaries and does not import third-party copyrighted text.

## Audit legend

- ✅ Verified in data/tests for this pass.
- ⚠️ Partially supported or requires manual playthrough/UX confirmation.
- ❌ Known gap.

## Manual browser checklist

Use `memory/CHARACTER_MANUAL_TEST_CHECKLIST.md` for the live click-through checks. Automated helper tests prove the data can be derived; the manual checklist proves the actual app flow works for players on mobile, tablet, and desktop.

## Cross-class audit matrix

| Class | L1 creation | L2 unlocks | L3 subclass | ASI/feat levels | Extra Attack | Spell progression | Resources/recovery | L20 capstone | Subclass features | Action buckets |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Barbarian | ✅ | ✅ | ✅ | ✅ 4/8/12/16/19 | ✅ 5 | n/a | ✅ Rage, long rest | ✅ | ⚠️ data present by subclass where defined | ✅ Rage bonus action |
| Bard | ✅ | ✅ | ✅ | ✅ 4/8/12/16/19 | n/a | ✅ full caster tables | ✅ Bardic Inspiration, long rest then short rest at 5 | ✅ | ⚠️ data present by subclass where defined | ✅ inspiration bonus action |
| Cleric | ✅ | ✅ Channel Divinity | ✅ domain data / backend unlock varies by edition | ✅ 4/8/12/16/19 | n/a | ✅ full caster tables | ✅ Channel Divinity short rest | ✅ | ⚠️ domain features depend on available local data | ✅ Channel Divinity action |
| Druid | ✅ | ✅ Wild Shape | ✅ circle data / backend unlock varies by edition | ✅ 4/8/12/16/19 | n/a | ✅ full caster tables | ✅ Wild Shape short rest | ✅ | ⚠️ circle features depend on available local data | ✅ Wild Shape action |
| Fighter | ✅ | ✅ Action Surge | ✅ | ✅ 4/6/8/12/14/16/19 | ✅ 5/11/20 | ⚠️ Eldritch Knight only if selected data exists | ✅ Second Wind, Action Surge, Indomitable, Superiority Dice | ✅ Extra Attack (3) | ⚠️ subclass feature depth varies | ✅ action/bonus/reaction resources |
| Monk | ✅ | ✅ Ki/Discipline | ✅ Open Hand/Shadow aliases fixed | ✅ 4/8/12/16/19 | ✅ 5 | n/a | ✅ Ki/Discipline = Monk level, short/long rest restore | ✅ Perfect Self / Body and Mind | ✅ Open Hand and Shadow levels checked | ✅ no duplicate dead Ki cards |
| Paladin | ✅ | ✅ spellcasting/style | ✅ | ✅ 4/8/12/16/19 | ✅ 5 | ✅ half caster tables | ✅ Lay on Hands long rest, Channel Divinity from 3 | ✅ | ⚠️ oath features depend on local data | ✅ Lay on Hands/Channel Divinity actions |
| Ranger | ✅ | ✅ spellcasting/style | ✅ | ✅ 4/8/12/16/19 | ✅ 5 | ✅ half caster tables | n/a core resource | ✅ | ⚠️ archetype features depend on local data | ✅ spells/attacks/common actions |
| Rogue | ✅ | ✅ Cunning Action | ✅ | ✅ 4/8/10/12/16/19 | n/a | ⚠️ Arcane Trickster only if selected data exists | n/a core resource | ✅ | ⚠️ archetype features depend on local data | ✅ Cunning Action bonus action |
| Sorcerer | ✅ | ✅ Sorcery Points | ✅ backend subclass at 1, frontend class data varies | ✅ 4/8/12/16/19 | n/a | ✅ full caster/known tables | ✅ Sorcery Points long rest | ✅ | ⚠️ origin features depend on local data | ✅ Metamagic bonus actions |
| Warlock | ✅ | ✅ invocations/options | ✅ backend subclass at 1, frontend class data varies | ✅ 4/8/12/16/19 | n/a | ✅ pact-magic progression resource/check | ✅ Pact Magic short rest | ✅ | ⚠️ patron features depend on local data | ✅ pact slots and spells |
| Wizard | ✅ | ✅ Arcane Tradition in older data / backend at 2 | ✅ if route requests at 2 | ✅ 4/8/12/16/19 | n/a | ✅ spellbook/full caster slots | ✅ Arcane Recovery long rest use, short-rest activity | ✅ | ⚠️ school features depend on local data | ✅ Arcane Recovery action |

## Monk reference-class repair notes

- Open Hand lookup accepts `way-of-the-open-hand`, `Way of the Open Hand`, `Warrior of the Open Hand`, and `Open Hand` aliases while displaying the local feature names instead of slugs.
- Ki/Discipline Points are unlocked at Monk level 2, derive max from Monk class level, and restore on short rest and long rest.
- Sheet-side resource max calculation prefers rule-derived max when saved resource data is stale after level-up.
- Flurry of Blows, Patient Defense, and Step of the Wind are generated as resource-backed Bonus Action cards and filtered out of dead text-only duplicates.
- Open Hand feature levels checked: 3 Open Hand Technique, 6 Wholeness of Body, 11 Tranquility, 17 Quivering Palm.
- Shadow feature action types checked: Shadow Arts action, Shadow Step bonus action, Cloak of Shadows action, Opportunist reaction.

## Remaining risks / follow-up

1. This pass adds automated data/helper coverage, but not a full browser click-through for every class from level 1 to 20.
2. Subclass feature depth varies by the existing local class data. Missing or simplified subclass summaries should be filled with SRD/homebrew-safe summaries only.
3. Backend and frontend still have separate progression datasets. The level-up wizard uses backend preflight when available and local data as fallback, but a future PR should make the canonical source explicit.
4. Warlock Pact Magic is represented as a short-rest resource for action/resource validation, while actual pact slot level and Mystic Arcanum UX may need a dedicated spellcasting follow-up.
