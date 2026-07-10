# Rules Data Completion Tracker

This tracker is developer-facing. Its purpose is to prevent silent incomplete character saves across Full Creation, Basic Build, Premade Characters, Kids Mode, the character sheet, and backend persistence.

For the recommended long-term structure for spell, feat, species, class, and ruleset data, see [Rules Data Architecture](./RULES_DATA_ARCHITECTURE.md).

Status key:

- **Complete** — implemented and saved/displayed reliably for the current supported scope.
- **Partial** — present in some routes or only as fallback/text data.
- **Missing** — not currently implemented in a meaningful way.
- **Deferred** — intentionally left for a later deeper rules pass.
- **Needs audit** — code exists, but coverage or save/display behavior needs confirmation.

## Current high-level assessment

| Area | Overall status | Notes |
| --- | --- | --- |
| Basic Build | **Partial** | Healthiest builder for usable sheets: saves HP, skills, proficiencies, languages, traits, class features, and starting equipment, but AC/equipment are still not structured enough and the UI still has some old hardcoded styling. |
| Premade Characters | **Partial** | Visual flow exists and saves abilities/skills/spells, but payload is too thin for full usable sheets: AC, HP, equipment, languages, traits, saving throws, proficiencies, and features need to be derived or copied from templates/rules data. |
| Kids Mode | **Missing** | Route exists, but `KidsCharacterBuilder` currently renders `BasicCharacterBuilder`; it is not a separate simplified mode yet. |
| Full Creation | **Partial** | Detailed step structure exists and saves more fields than Premade, but it is level-1 only, AC is basic 10 + Dex, equipment is mostly a choice/starting list, and homebrew normalization needs work. |
| Character Sheet | **Partial** | Displays and patches many combat fields, conditions, inventory, spells, and class summaries, but depends on builders/backends saving complete data. |
| Backend create flow | **Partial** | Calculates fallback HP, proficiency bonus, basic AC, spellcasting ability, and normalizes spell lists; spell DC/attack/slots and deeper equipment-derived AC need improvement. |

## Builder support matrix

| Data area | Full Creation | Basic Build | Premade Characters | Kids Mode | Character Sheet display | Backend save flow |
| --- | --- | --- | --- | --- | --- | --- |
| Name/class/species/background/level | **Complete** | **Complete** | **Complete** | **Missing** | **Complete** | **Complete** |
| Ability scores | **Complete** | **Complete** | **Partial** | **Missing** | **Complete** | **Complete** |
| Ability modifiers | **Partial** | **Partial** | **Partial** | **Missing** | **Complete** | **Partial** |
| HP / hit points | **Partial** | **Partial** | **Missing** | **Missing** | **Complete** | **Partial** |
| AC / armour / shields | **Partial** | **Partial** | **Missing** | **Missing** | **Complete** | **Partial** |
| Skills/proficiencies | **Partial** | **Partial** | **Partial** | **Missing** | **Complete** | **Complete** |
| Languages | **Partial** | **Partial** | **Missing** | **Missing** | **Partial** | **Complete** |
| Species/racial traits | **Partial** | **Partial** | **Missing** | **Missing** | **Partial** | **Complete** |
| Class features/resources | **Partial** | **Partial** | **Missing** | **Missing** | **Partial** | **Partial** |
| Subclass choice/save | **Partial** | **Missing** | **Partial** | **Missing** | **Partial** | **Partial** |
| Starting equipment/inventory | **Partial** | **Partial** | **Missing** | **Missing** | **Partial** | **Partial** |
| Spells/cantrips | **Partial** | **Missing** | **Partial** | **Missing** | **Partial** | **Partial** |
| Spell save DC / attack / slots | **Missing** | **Missing** | **Missing** | **Missing** | **Partial** | **Missing** |
| Conditions/combat state | **Deferred** | **Deferred** | **Deferred** | **Deferred** | **Partial** | **Partial** |
| Notes/personality/backstory | **Partial** | **Missing** | **Missing** | **Missing** | **Partial** | **Complete** |

## Classes

| Field | Status | Evidence / notes |
| --- | --- | --- |
| Hit die | **Complete** | Static class data and backend hit-die fallback exist; class packages also encode hit-die-sensitive summaries where needed. |
| Primary ability | **Partial** | Basic Build uses primary ability for starter stat arrays; Full Creation displays/uses class data but not all builders rely on it consistently. |
| Saving throw proficiencies | **Partial** | Full Creation and Basic Build save class saving throws; Premade does not currently include/derive them. |
| Skill choices | **Partial** | Full Creation and Basic Build validate class skill picks; Premade does not run choice validation. |
| Skill count | **Partial** | Full Creation and Basic Build enforce counts; homebrew normalization and Premade need improvement. |
| Armour proficiencies | **Partial** | Full Creation and Basic Build save class armour proficiencies; Premade currently does not. |
| Weapon proficiencies | **Partial** | Full Creation and Basic Build save class weapon proficiencies; Premade currently does not. |
| Tool proficiencies | **Partial** | Background tools are saved in Full Creation/Basic Build; class/tool edge cases and Premade need improvement. |
| Starting equipment | **Partial** | Full Creation/Basic Build save class/background starting lists, but equipment is not always structured/equipped and does not reliably drive AC. |
| Class features by level | **Partial** | Basic Build can include features through selected level; Full Creation currently saves level-1 features only; new class packages cover Fighter/Barbarian/Rogue/Monk/Paladin summaries. |
| Spellcasting info | **Partial** | Backend determines casting ability, frontend has spell selection in Full Creation/Premade, but spell DC/attack/slots are not fully derived. |
| Subclass choice timing | **Partial** | Backend validates unlock level; Full Creation supports some subclass timing; Basic Build does not expose subclass choice. |
| Class resources | **Partial** | Resource rules exist for major resources and recent work improved Fighter/Barbarian/Monk/Paladin; remaining classes and builder save/display integration need audit. |

### Completed class package audit

| Class | Package status | Notes |
| --- | --- | --- |
| Fighter | **Complete** | Package exports and audit support are present; recent audit fixed sheet-summary class name/multiclass support. |
| Barbarian | **Complete** | Package helpers, resource rules, sheet summary, subclass support, and tests are present. |
| Rogue | **Complete** | Package helpers, Sneak Attack summary, subclass support, builder readiness, and tests are present. |
| Monk | **Complete** | Package helpers, Ki/Discipline summary, subclass support, resource rules, and tests are present. |
| Paladin | **Complete** | Package helpers, Lay on Hands/Channel Divinity summaries, spell slot summary, resource rules, and tests are present. |
| Ranger | **Partial** | Static data exists, but package/readiness/sheet/final-status parity is not complete. |
| Bard | **Partial** | Static data/resources exist; package/readiness/sheet/final-status parity is not complete. |
| Cleric | **Partial** | Static data/resources exist; domain/prepared-caster package work remains. |
| Druid | **Partial** | Static data/resources exist; Wild Shape and prepared-caster package work remains. |
| Wizard | **Partial** | Static data/resources exist; spellbook/prepared spell package work remains. |
| Warlock | **Partial** | Static data/resources exist; Pact Magic/invocations/patron package work remains. |
| Sorcerer | **Partial** | Static data/resources exist; Sorcery Points/Metamagic/origin package work remains. |

## Subclasses

| Field | Status | Notes |
| --- | --- | --- |
| Unlock level by edition | **Partial** | Backend validates subclass unlock level and edition helpers exist; builder coverage is inconsistent by route/class. |
| Subclass feature levels | **Partial** | Completed class packages include subclass feature summaries; remaining classes need parity. |
| Subclass choice supported in Full Creation | **Partial** | Full Creation supports subclass for some timing/class cases, but needs broader class-package integration. |
| Subclass choice supported in Basic Build | **Missing** | Basic Build does not currently expose subclass selection. |
| Subclass choice supported in Premade | **Partial** | Premade can send a template subclass, but does not validate/derive full subclass feature data. |
| Subclass choice supported in Kids Mode | **Missing** | Kids Mode is not separate yet. |
| Subclass data saved | **Partial** | `subclass` can be saved, but subclass features are not consistently derived into saved sheet data. |

## Species / races

| Field | Status | Notes |
| --- | --- | --- |
| Name | **Complete** | Static race/species names exist and builders save race names. |
| Speed | **Partial** | Full Creation/Basic Build save race speed; Premade and Kids Mode need derivation. |
| Size | **Partial** | Static data/homebrew merge contains size, but save/display coverage needs audit. |
| Languages | **Partial** | Full Creation/Basic Build save base languages and selected language choices; Premade and Kids Mode need derivation. |
| Traits | **Partial** | Full Creation/Basic Build save traits; Premade and Kids Mode need derivation. |
| Subraces | **Partial** | Full Creation supports subrace choices; other builders are incomplete. |
| 2014 ability score rules | **Partial** | Full Creation supports race/species ASI and some floating choices; Basic Build uses starter arrays rather than full choice flow. |
| 2024 compatibility | **Partial** | Full Creation supports background ASI/origin feat in places; route parity is incomplete. |
| Choice-based traits | **Partial** | Language and Half-Elf-style choices exist in Full Creation; broader choice traits need audit. |
| Floating ASIs | **Partial** | Full Creation has floating ASI handling for supported race data; Basic/Premade/Kids need parity or clear defaults. |
| Extra skills | **Partial** | Full Creation has Half-Elf skill versatility handling; route parity needs audit. |
| Extra languages | **Partial** | Full Creation handles race language choices; Premade/Kids need defaults/derivation. |

## Backgrounds

| Field | Status | Notes |
| --- | --- | --- |
| Name | **Complete** | Static background names exist and builders save background names. |
| Description | **Partial** | Present in static data/UI; not always meaningful in saved character payload. |
| Skills | **Partial** | Full Creation/Basic Build include background skills; Premade/Kids need derivation. |
| Tools | **Partial** | Full Creation/Basic Build include background tools; Premade/Kids need derivation. |
| Languages/language choices | **Partial** | Static data supports some languages; choice flow and route parity need audit. |
| Equipment | **Partial** | Full Creation/Basic Build include background equipment as text/list; structured inventory is incomplete. |
| Background feature | **Needs audit** | Static data may contain features, but save/display consistency needs audit. |
| 2024 ability score bonuses | **Partial** | Full Creation has 2024 background ASI support; other routes need parity. |
| 2024 origin feat | **Partial** | Full Creation can save selected origin feat; Basic/Premade/Kids need defined behavior. |

## Ability scores

| Field | Status | Notes |
| --- | --- | --- |
| Standard array | **Complete** | Full Creation supports ability-score methods; Basic Build uses starter arrays. |
| Manual entry | **Complete** | Full Creation supports manual scores. |
| Point buy | **Complete** | Full Creation validates point-buy budget. |
| Rolled stats | **Needs audit** | Full Creation mentions rolled-style support in components, but save/validation coverage should be confirmed. |
| 2014 race/species bonuses | **Partial** | Full Creation applies 2014 race/species bonuses; route parity incomplete. |
| 2024 background bonuses | **Partial** | Full Creation applies background ASI; route parity incomplete. |
| Floating bonuses | **Partial** | Full Creation supports some floating race bonuses; route parity incomplete. |
| Ability modifiers | **Partial** | Frontend and sheet derive modifiers for display/calculations; backend does not persist explicit modifier fields. |
| Saving throws | **Partial** | Proficiencies are saved by Full Creation/Basic Build; modifiers/display need consistent end-to-end tests. |
| Skill modifiers | **Partial** | Character sheet derives skills from ability scores and proficiencies; builders do not persist per-skill modifiers. |

## HP / hit points

| Field | Status | Notes |
| --- | --- | --- |
| Level 1 HP | **Partial** | Full Creation/Basic Build calculate level-1 HP; backend falls back to class hit die + Con mod. |
| Higher-level starter HP | **Partial** | Basic Build has level selection but HP formula appears level-1 only; Full Creation is level-1 only. |
| Constitution modifier | **Partial** | Used in frontend/backend HP calculations; needs shared helper/tests. |
| Class hit die | **Complete** | Static class/backend hit-die data exist. |
| Current HP | **Partial** | Backend starts current HP equal to max HP; frontend builders should send more complete max HP. |
| Max HP | **Partial** | Full Creation/Basic Build send max HP; Premade/Kids need derivation. |
| Temporary HP | **Deferred** | Model/sheet support exists, but builders do not set starter temporary HP. |
| Hit dice | **Partial** | Backend sets `1dX`; higher-level hit dice support needs improvement. |
| Hit dice remaining | **Partial** | Backend sets 1 at creation; higher-level support needs improvement. |
| Short rest/long rest support | **Partial** | Resource/rest helpers exist in places; full HP/hit-dice rest behavior needs audit. |

## AC / armour / shields

| Field | Status | Notes |
| --- | --- | --- |
| No armour | **Partial** | Backend fallback calculates 10 + Dex if AC is default 10. |
| Light armour | **Partial** | Basic Build has armour options; Full/Premade save flow needs structured armour/equipped data. |
| Medium armour Dex cap | **Partial** | Basic Build AC preview supports stronger AC logic; shared helper and route parity needed. |
| Heavy armour | **Partial** | Basic Build can represent heavy armour options; Full/Premade need structured save. |
| Shield bonus | **Partial** | Basic Build has shield toggle/preview; Full/Premade need structured save. |
| Monk unarmoured defence | **Partial** | Monk sheet summary computes it; creation AC helpers need parity. |
| Barbarian unarmoured defence | **Partial** | Barbarian sheet summary computes it; creation AC helpers need parity. |
| Armour proficiency restrictions | **Needs audit** | Basic Build likely handles options; Full/Premade should validate equipment vs proficiency. |
| Saved `armor_class` | **Partial** | Backend preserves explicit AC and falls back when default; Premade and Full need better frontend AC. |
| Equipped armour/shield | **Partial** | Character model/sheet inventory support exists; builders are inconsistent. |
| Starting armour/shield equipment | **Partial** | Basic/Full starting equipment lists exist but are not reliably structured/equipped. |
| Magic item AC bonuses | **Deferred** | Inventory sheet may support item effects later; creation should not overbuild this now. |

## Skills and proficiencies

| Field | Status | Notes |
| --- | --- | --- |
| Class skill choices | **Partial** | Full Creation and Basic Build validate choices; Premade/Kids need derivation/defaults. |
| Background-granted skills | **Partial** | Full Creation and Basic Build include them; Premade/Kids need derivation. |
| Species-granted skills | **Partial** | Some Full Creation species choices exist; route parity incomplete. |
| Half-Elf skill versatility | **Partial** | Full Creation has a specific path; other routes need defaults/derivation. |
| Duplicate prevention | **Partial** | Full Creation/Basic Build avoid background duplicates for class picks; route parity incomplete. |
| Skill count validation | **Partial** | Full Creation/Basic Build validate; Premade/Kids need validation/defaults. |
| Saving throws | **Partial** | Full Creation/Basic Build save class saves; Premade/Kids need derivation. |
| Tools | **Partial** | Background tools saved in Full Creation/Basic Build; class/tool edge cases need audit. |
| Weapons | **Partial** | Full Creation/Basic Build save class weapon proficiencies; Premade/Kids need derivation. |
| Armour | **Partial** | Full Creation/Basic Build save armour proficiencies; Premade/Kids need derivation. |
| Languages | **Partial** | Full Creation/Basic Build save base languages; Premade/Kids need derivation/defaults. |

## Equipment and inventory

| Field | Status | Notes |
| --- | --- | --- |
| Class starting equipment | **Partial** | Full Creation/Basic Build save lists; Premade/Kids need derivation. |
| Background starting equipment | **Partial** | Full Creation/Basic Build save lists; Premade/Kids need derivation. |
| Armour | **Partial** | Basic Build has AC options; structured saved armour remains incomplete across routes. |
| Shields | **Partial** | Basic Build has shield toggle; structured saved shield remains incomplete across routes. |
| Weapons | **Partial** | Starting equipment lists exist; equipped weapon structure needs consistency. |
| Tools | **Partial** | Background tools and equipment lists exist; structured inventory needs consistency. |
| Packs/items | **Partial** | Starting equipment text/list support exists; structured items need consistency. |
| Currency | **Needs audit** | Character model supports currency/gold; builder save behavior needs audit. |
| Equipped item structure | **Partial** | Model/sheet inventory support exists; builders do not consistently initialize equipped items. |
| Inventory structure | **Partial** | Model/sheet support exists; builder payloads often use text/list starting equipment. |
| Starting equipment saved as structured data | **Partial** | Mostly text/list today; should be improved with shared payload helper. |

## Spells

| Field | Status | Notes |
| --- | --- | --- |
| Spellcasting classes | **Partial** | Static/backend data knows spellcasting classes; package parity still missing for many caster classes. |
| Cantrips known | **Partial** | Full Creation and Premade can save cantrips; Basic/Kids need defaults. |
| Spells known | **Partial** | Full Creation and Premade can save known spells; spell counts/deeper rules need audit. |
| Spells prepared | **Partial** | Full Creation distinguishes prepared vs known for some classes; backend stores prepared lists. |
| Spellbook for Wizard | **Deferred** | Wizard spellbook-specific support needs dedicated work. |
| Spell save DC | **Missing** | Backend model has a field, but create flow does not calculate it yet. |
| Spell attack bonus | **Missing** | Backend model has a field, but create flow does not calculate it yet. |
| Spell slots | **Missing** | Backend model has fields, but create flow does not fully initialize slots. |
| Spell slots remaining | **Missing** | Needs to be initialized from starting spell slots. |
| Pact magic | **Deferred** | Warlock pact magic needs dedicated handling. |
| Half-caster support | **Partial** | Paladin package summarizes half-caster slots; backend creation still needs spell slot initialization. |
| Prepared vs known distinction | **Partial** | Full Creation and backend fields support both; route coverage and counts need audit. |
| Premade spell lists | **Partial** | Premade saves cantrips/spells when present but lacks spell stats/slots. |
| Basic Build spell fallback | **Missing** | Basic Build does not currently provide starter spell defaults. |
| Full Creation spell choice | **Partial** | Spell step exists for spellcasters; level/saves/slots need improvement. |
| Kids Mode simple magic mapping | **Missing** | Kids Mode is not separate yet. |

## Conditions and combat state

| Field | Status | Notes |
| --- | --- | --- |
| Conditions list | **Complete** | Canonical D&D condition list appears in UI/reference areas. |
| Active conditions | **Partial** | Character sheet can display and patch conditions; live/combat parity needs more audit. |
| Inspiration | **Partial** | Model/patch support exists; builder initialization is not a focus. |
| Concentration | **Partial** | Model/sheet support exists; route parity and combat flow need audit. |
| Exhaustion | **Partial** | Backend patch and tests indicate `exhaustion_level` persistence; UI displays exhaustion separately from conditions. |
| Death saves | **Partial** | Model/patch support exists; creation initializes defaults. |
| Used spell slots | **Partial** | Model/patch support exists; starting spell slot initialization is missing. |
| Combat tab support | **Partial** | Clean sheet/combat components support several states; deeper live-play sync needs audit. |
| Live Play support | **Needs audit** | Live Play has combat/session features but condition/exhaustion parity should be checked separately. |
| Backend persistence | **Partial** | Conditions/exhaustion/patch fields are supported; canonical naming and complete route coverage need audit. |

## Immediate PR order

1. **Premade character creation payload** — highest risk because it creates apparently finished heroes with missing sheet data.
2. **Real Kids Mode builder** — currently not a separate mode.
3. **Full Creation Velvet + warnings pass** — styling and missing-data clarity without a big logic rewrite.
4. **Full Creation armour/equipment** — make saved AC/equipment match selected gear.
5. **Spell stat calculation** — spell save DC, spell attack bonus, and starting slots.
6. **Conditions/exhaustion audit** — align canonical names and persistence expectations.
7. **Homebrew normalization** — make homebrew shapes match static data.
8. **Character creation rules tests** — lock HP/AC/proficiencies/spells/payload behavior.

## Known risk notes

- Do not mark a route complete just because the backend has a field. The builder must send it or the backend must safely derive it.
- Text/list starting equipment is better than nothing, but structured equipment is still the goal for AC, attacks, and inventory quality.
- Premade and Kids Mode should show friendly warnings/defaults when template/rules data is missing instead of silently creating thin sheets.
- Continue using Velvet Tabletop tokens for UI work. This tracker does not change app styling or logic.
- Homebrew/private sharing model: see [Homebrew Content Sharing Model](./HOMEBREW_CONTENT_SHARING.md) for user-provided subclasses, monsters, and content packs.
