# Rules Data Completion Tracker

This tracker is developer-facing. Its purpose is to prevent silent incomplete character saves across Full Creation, Basic Build, Premade Characters, Kids Mode, the character sheet, and backend persistence.

Last audited: after the premade/kids payload helper and builder split work. This tracker is intentionally conservative: **Partial** means the code exists somewhere, but route parity or end-to-end save/display coverage is not fully proven yet.

Status key:

- **Complete** — implemented and saved/displayed reliably for the current supported scope.
- **Partial** — present in some routes or only as fallback/text data.
- **Missing** — not currently implemented in a meaningful way.
- **Deferred** — intentionally left for a later deeper rules pass.
- **Needs audit** — code exists, but coverage or save/display behavior needs confirmation.

## Current high-level assessment

| Area | Overall status | Notes |
| --- | --- | --- |
| Basic Build | **Partial** | Healthiest traditional builder for usable sheets: saves HP, skills, proficiencies, languages, traits, class features, and starting equipment. Still needs shared AC/equipment helpers, structured equipped items, spell defaults, and route-level save tests. |
| Premade Characters | **Partial** | Now uses the shared template payload helper to derive HP, AC, equipment, languages, traits, class features, warnings, and prepared spell loadouts. Still needs every template validated with tests and sheet-display smoke checks. |
| Kids Mode | **Partial** | Dedicated Simple hero builder now maps plain-English choices to real class/species/background payloads and previews HP/AC/skills. Still needs every hero mapping tested, broader caster/equipment coverage, and end-to-end UI coverage. |
| Full Creation | **Partial** | Detailed step structure exists and is being split into safer components, but it is level-1 only, AC is still too basic for armour/shield choices, equipment is mostly choice/list based, and homebrew normalization needs work. |
| Character Sheet | **Partial** | Displays and patches many combat fields, conditions, inventory, spells, and class summaries, but depends on builders/backends saving complete data. Needs incomplete-data warnings and route parity checks. |
| Backend create flow | **Partial** | Calculates fallback HP, proficiency bonus, basic AC, spellcasting ability, and normalizes spell lists; recent model fields allow spell stats/slots/equipment metadata, but deeper equipment-derived AC and route tests still need hardening. |

## Builder support matrix

| Data area | Full Creation | Basic Build | Premade Characters | Kids Mode | Character Sheet display | Backend save flow |
| --- | --- | --- | --- | --- | --- | --- |
| Name/class/species/background/level | **Complete** | **Complete** | **Complete** | **Partial** | **Complete** | **Complete** |
| Ability scores | **Complete** | **Complete** | **Partial** | **Partial** | **Complete** | **Complete** |
| Ability modifiers | **Partial** | **Partial** | **Partial** | **Partial** | **Complete** | **Partial** |
| HP / hit points | **Partial** | **Partial** | **Partial** | **Partial** | **Complete** | **Partial** |
| AC / armour / shields | **Partial** | **Partial** | **Partial** | **Partial** | **Complete** | **Partial** |
| Skills/proficiencies | **Partial** | **Partial** | **Partial** | **Partial** | **Complete** | **Complete** |
| Languages | **Partial** | **Partial** | **Partial** | **Partial** | **Partial** | **Complete** |
| Species/racial traits | **Partial** | **Partial** | **Partial** | **Partial** | **Partial** | **Complete** |
| Class features/resources | **Partial** | **Partial** | **Partial** | **Partial** | **Partial** | **Partial** |
| Subclass choice/save | **Partial** | **Missing** | **Partial** | **Missing** | **Partial** | **Partial** |
| Starting equipment/inventory | **Partial** | **Partial** | **Partial** | **Partial** | **Partial** | **Partial** |
| Spells/cantrips | **Partial** | **Missing** | **Partial** | **Partial** | **Partial** | **Partial** |
| Spell save DC / attack / slots | **Partial** | **Missing** | **Partial** | **Partial** | **Partial** | **Partial** |
| Conditions/combat state | **Deferred** | **Deferred** | **Deferred** | **Deferred** | **Partial** | **Partial** |
| Notes/personality/backstory | **Partial** | **Missing** | **Missing** | **Partial** | **Partial** | **Complete** |

## Classes

| Field | Status | Evidence / notes |
| --- | --- | --- |
| Hit die | **Complete** | Static class data and backend hit-die fallback exist; class packages also encode hit-die-sensitive summaries where needed. |
| Primary ability | **Partial** | Basic Build uses primary ability for starter stat arrays; Full Creation displays/uses class data but not all builders rely on it consistently. |
| Saving throw proficiencies | **Partial** | Full Creation and Basic Build save class saving throws; Premade/Kids payload helpers can derive them, but every template/mapping still needs validation. |
| Skill choices | **Partial** | Full Creation and Basic Build validate class skill picks; Premade/Kids can supply defaults from templates/mappings, but do not yet run the same choice validation. |
| Skill count | **Partial** | Full Creation and Basic Build enforce counts; homebrew normalization and Premade need improvement. |
| Armour proficiencies | **Partial** | Full Creation and Basic Build save class armour proficiencies; Premade/Kids can derive them through payload helpers, but template coverage needs tests. |
| Weapon proficiencies | **Partial** | Full Creation and Basic Build save class weapon proficiencies; Premade/Kids can derive them through payload helpers, but template coverage needs tests. |
| Tool proficiencies | **Partial** | Background tools are saved in Full Creation/Basic Build; class/tool edge cases and Premade need improvement. |
| Starting equipment | **Partial** | Full Creation/Basic Build save class/background starting lists, but equipment is not always structured/equipped and does not reliably drive AC. |
| Class features by level | **Partial** | Basic Build can include features through selected level; Full Creation currently saves level-1 features only; new class packages cover Fighter/Barbarian/Rogue/Monk/Paladin summaries. |
| Spellcasting info | **Partial** | Backend/frontend now have fields and helpers for casting ability, prepared loadouts, spell slots, DC, and attack values, but Basic Build defaults, pact magic, and route-level tests remain incomplete. |
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
| Subclass choice supported in Kids Mode | **Deferred** | Simple hero builder intentionally avoids subclass choices at level 1; subclass support belongs in later level-up or advanced flows. |
| Subclass data saved | **Partial** | `subclass` can be saved, but subclass features are not consistently derived into saved sheet data. |

## Species / races

| Field | Status | Notes |
| --- | --- | --- |
| Name | **Complete** | Static race/species names exist and builders save race names. |
| Speed | **Partial** | Full Creation/Basic Build save race speed; Premade/Kids derive speed from species data, but route parity tests still need expansion. |
| Size | **Partial** | Static data/homebrew merge contains size, but save/display coverage needs audit. |
| Languages | **Partial** | Full Creation/Basic Build save base languages and selected language choices; Premade/Kids derive sensible defaults, but choice-based language UI remains incomplete. |
| Traits | **Partial** | Full Creation/Basic Build save traits; Premade/Kids derive species traits, but choice-based trait support remains incomplete. |
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
| Skills | **Partial** | Full Creation/Basic Build include background skills; Premade/Kids can derive defaults through payload helpers, but every template/mapping needs tests. |
| Tools | **Partial** | Full Creation/Basic Build include background tools; Premade/Kids can derive defaults through payload helpers, but tool/equipment display parity needs tests. |
| Languages/language choices | **Partial** | Static data supports some languages; Premade/Kids derive sensible defaults, but choice flow and route parity still need audit. |
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
| Max HP | **Partial** | Full Creation/Basic Build send max HP; Premade/Kids now derive max HP, but every template/mapping needs save/display tests. |
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
| Saved `armor_class` | **Partial** | Backend preserves explicit AC and falls back when default; Premade/Kids can derive AC, but Full Creation still needs armour/shield selection and route parity tests. |
| Equipped armour/shield | **Partial** | Character model/sheet inventory support exists; builders are inconsistent. |
| Starting armour/shield equipment | **Partial** | Basic/Full starting equipment lists exist but are not reliably structured/equipped. |
| Magic item AC bonuses | **Deferred** | Inventory sheet may support item effects later; creation should not overbuild this now. |

## Skills and proficiencies

| Field | Status | Notes |
| --- | --- | --- |
| Class skill choices | **Partial** | Full Creation and Basic Build validate choices; Premade/Kids derive defaults, but do not yet run the same validation flow. |
| Background-granted skills | **Partial** | Full Creation and Basic Build include them; Premade/Kids derive defaults, but every mapping/template needs tests. |
| Species-granted skills | **Partial** | Some Full Creation species choices exist; route parity incomplete. |
| Half-Elf skill versatility | **Partial** | Full Creation has a specific path; other routes need defaults/derivation. |
| Duplicate prevention | **Partial** | Full Creation/Basic Build avoid background duplicates for class picks; route parity incomplete. |
| Skill count validation | **Partial** | Full Creation/Basic Build validate; Premade/Kids need validation/defaults. |
| Saving throws | **Partial** | Full Creation/Basic Build save class saves; Premade/Kids derive defaults, but every mapping/template needs tests. |
| Tools | **Partial** | Background tools saved in Full Creation/Basic Build; class/tool edge cases need audit. |
| Weapons | **Partial** | Full Creation/Basic Build save class weapon proficiencies; Premade/Kids derive defaults, but every mapping/template needs tests. |
| Armour | **Partial** | Full Creation/Basic Build save armour proficiencies; Premade/Kids derive defaults, but every mapping/template needs tests. |
| Languages | **Partial** | Full Creation/Basic Build save base languages; Premade/Kids derive defaults, but language-choice UI still needs parity. |

## Equipment and inventory

| Field | Status | Notes |
| --- | --- | --- |
| Class starting equipment | **Partial** | Full Creation/Basic Build save lists; Premade/Kids now derive starting lists through payload helpers, but structured equipment/equipped state needs validation. |
| Background starting equipment | **Partial** | Full Creation/Basic Build save lists; Premade/Kids now derive background equipment through payload helpers, but structured inventory parity needs validation. |
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
| Cantrips known | **Partial** | Full Creation, Premade, and Kids can save cantrips where mapped; Basic Build still needs starter defaults. |
| Spells known | **Partial** | Full Creation, Premade, and Kids can save known spells where mapped; spell counts/deeper rules need audit. |
| Spells prepared | **Partial** | Full Creation distinguishes prepared vs known for some classes; backend stores prepared lists. |
| Spellbook for Wizard | **Deferred** | Wizard spellbook-specific support needs dedicated work. |
| Spell save DC | **Partial** | Payload/backend fields support spell save DC for generated characters; needs backend route tests and Basic Build defaults. |
| Spell attack bonus | **Partial** | Payload/backend fields support spell attack bonus for generated characters; needs backend route tests and Basic Build defaults. |
| Spell slots | **Partial** | Payload/backend fields support starting spell slots for generated casters; pact magic and route-level tests still need work. |
| Spell slots remaining | **Partial** | Can mirror starting slots for generated payloads; needs backend tests to ensure created sheets start with correct remaining slots. |
| Pact magic | **Deferred** | Warlock pact magic needs dedicated class-package and backend creation handling. |
| Half-caster support | **Partial** | Paladin package summarizes half-caster slots; backend creation still needs spell slot initialization. |
| Prepared vs known distinction | **Partial** | Full Creation and backend fields support both; route coverage and counts need audit. |
| Premade spell lists | **Partial** | Premade now supports Rook prepared-spell loadouts and template spell payloads; every caster template needs validation and sheet-display tests. |
| Basic Build spell fallback | **Missing** | Basic Build does not currently provide starter spell defaults. |
| Full Creation spell choice | **Partial** | Spell step exists for spellcasters; level/saves/slots need improvement. |
| Kids Mode simple magic mapping | **Partial** | Kids Mode maps Magic User/Helpful Healer/Nature Friend to real starter cantrips/spells, but needs every mapping tested and deeper spell-choice UI later. |

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

1. **Character creation payload tests** — prove Premade/Kids/Full/Basic payloads include HP, AC, proficiencies, equipment, spell fields, and warnings where needed.
2. **Ranger package to 100%** — next class by the class-completion dashboard: progression, choices, sheet summary, subclass summary, final status, package export, and tests.
3. **Continue splitting `CharacterBuilder.js`** — extract race/class/background/skills/spells/equipment steps before larger Full Creation changes.
4. **Continue splitting `LevelUpWizard.js`** — extract path/HP/class-choice/spell/ASI/confirm step panels before theme/logic changes.
5. **Full Creation armour/equipment** — make saved AC/equipment match selected gear and structured equipped items.
6. **Backend spell stat tests and hardening** — spell save DC, spell attack bonus, starting slots, and pact magic expectations.
7. **Premade template validation pass** — validate every template and display friendly warnings when data is incomplete.
8. **Kids Mode validation pass** — validate every simple hero mapping and caster/equipment mapping.
9. **Conditions/exhaustion audit** — align canonical names and persistence expectations.
10. **Homebrew normalization** — make homebrew shapes match static data before deeper Full Creation work.

## Known risk notes

- Do not mark a route complete just because the backend has a field. The builder must send it or the backend must safely derive it.
- Text/list starting equipment is better than nothing, but structured equipment is still the goal for AC, attacks, and inventory quality.
- Premade and Kids Mode should show friendly warnings/defaults when template/rules data is missing instead of silently creating thin sheets.
- The tracker should be updated whenever a helper gains support but route-level save/display tests are still missing; do not silently upgrade a status to Complete until the whole route is proven.
- Continue using Velvet Tabletop tokens for UI work. This tracker does not change app styling or logic.
