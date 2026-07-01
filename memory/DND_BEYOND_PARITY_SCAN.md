# D&D Beyond-Level Character Sheet Parity Scan

Date: 2026-07-01

Scope: full repository scan for what Rookie Quest Keeper needs before the character sheet can feel like a dependable D&D Beyond-style player tool across all core classes, race/species options, 2014 rules, 2024 rules, level-up, resources, spellcasting, and table play. This scan is based only on existing repo data and code. Do not import copyrighted third-party rules text; use repo data, SRD/CC-safe data, licensed user uploads, or homebrew-safe summaries.

## Executive summary

The repo has the beginning of a strong architecture: every core class has package-style frontend helper files, the clean sheet has separate combat/features/spells/inventory tabs, backend character creation stores edition/ruleset fields, and backend level-up endpoints can preview/apply the next level. However, it is **not yet D&D Beyond-level** because the rules engine is split across many partly-overlapping frontend and backend sources, character creation does not fully prove every 2014/2024 race/species/background/class/subclass choice, and the live sheet still lacks a canonical, test-backed derivation layer for all play-time actions, resources, spellcasting, equipment, rests, and level-up effects.

The practical path is not a broad rewrite. The path is to make one canonical rules snapshot shape, migrate one surface at a time to that shape, and add matrix tests so every class/species/background route can be created at level 1 and leveled to 20 under both editions.

## What exists now

### Class support

- The frontend has per-class helper packages for all 12 core classes: progression, subclass options, builder options/readiness, sheet summary, final status, and tests for many of those files.
- Fighter is the most developed class package, with separate helpers for Battle Master, Champion, magic subclass behavior, fighting styles, weapon mastery, and many focused tests.
- Backend `class_progression.py` contains a compact progression reference with subclass options, spell-known tables, cantrip-known tables, origin feats, and general feat lists.
- `LevelUpWizard.js` already calls backend preflight data when available, falls back to local class data, collects HP, subclass, ASI/feat, and spell choices, and posts to either level-up or multiclass endpoints.

### Edition support

- Creation rules know about 2014 and 2024 flow differences at a high level.
- Backend character creation validates edition-aware subclass unlock levels through `get_subclass_unlock_level`.
- Campaigns and dashboards carry a `rules_edition` field.
- There are tests for edition-aware subclass validation and storage.

### Race/species and background support

- There are several race/species sources: `characterRules5e.js`, `editionRules.js`, `starterOrigins5e.js`, and backend SRD JSON/routes.
- `characterRules5e.js` models core 2014 race ability increases and some 2024 species-style entries.
- `editionRules.js` exposes separate 2014 and 2024 race/species lists and simplified background lists.
- Background language helper files already exist and should be reused for language-choice work.

### Live sheet support

- `CleanCharacterSheet.js` loads characters, derives AC, HP, proficiency, rules edition, class features, action economy groups for the Features tab, and patches sheet updates with PATCH.
- `CleanCombatTab.js` provides Actions / Bonus Actions / Reactions for attacks, spells, resources, features, items, and common actions.
- `CleanSpellsTab.js` displays spell slots, known/prepared/cantrip lists, and can spend/restore slots.
- `classResourceRules.js` has centralized frontend resource rules for Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Sorcerer, Warlock, and Wizard.

## Main blockers to D&D Beyond-level usability

### 1. No single canonical rules engine

The biggest blocker is not one missing class feature; it is that rules facts are duplicated across:

- frontend class packages,
- `classFeatures.js`,
- `levelUpData.js`,
- `classResourceRules.js`,
- `characterFeatureSelectors.js`,
- `spellDatabase.js`,
- `characterRules5e.js`,
- `editionRules.js`,
- backend `class_progression.py`,
- backend `characters.py`,
- backend SRD JSON,
- optional rule-system and homebrew collections.

This means a class can appear correct in the builder but wrong in level-up, or correct in the Features tab but wrong in the Actions tab. D&D Beyond-level reliability requires one canonical derived-character snapshot that every UI surface uses.

Required target shape:

```text
DerivedCharacterSnapshot
- identity: name, edition, ruleset, level, class levels
- ability scores/modifiers/saves/skills/passives
- species/race traits and selected choices
- background traits, languages, tools, feats, ASI source
- class/subclass features by level and action type
- resources with key, label, current, max, recovery, spend actions
- attacks and action economy cards
- spellcasting blocks by class and source
- equipment-derived AC, attacks, proficiencies, attunement
- conditions, exhaustion, concentration, death saves
- validation warnings and missing choices
```

### 2. Backend and frontend progression disagree by design

Backend preflight returns subclasses, spell/cantrip gains, ASI flags, and spell slots. The frontend can override/fallback with local data. That is useful during development, but dangerous for launch because the user may see options the backend does not apply consistently.

Examples found in the scan:

- Backend has compact subclass option lists in `class_progression.py`.
- Frontend has richer per-class subclass helpers and local class feature data.
- `LevelUpWizard.js` mixes backend and local calculations for subclass, ASI, cantrips, spells, and spell lists.
- Backend spell slot calculation handles full/half/warlock classes but does not expose the missing `compute_multiclass_spell_slots` expected by backend tests.

### 3. Race/species support is fragmented

Race/species data exists in multiple places. Some files use "race", some use "species", and some 2024 entries are simplified. The builder can produce playable characters, but there is no guarantee that every race/species has:

- edition-specific availability,
- correct ability-score source,
- speed and size,
- languages and language choices,
- traits as sheet features,
- action economy classification for active traits,
- spellcasting traits where applicable,
- resource or limited-use trait tracking,
- migration from older flat `race` fields to 2024 `species` language.

### 4. Background/origin data is not yet fully enforced

2024 backgrounds should drive origin ASI and origin feats; 2014 backgrounds mainly provide skills/tools/languages/features. The app has helper work for language choices, but the current launch-readiness notes already identify background language choices as a pending Full Creation feature. D&D Beyond-level usability requires background choices to become first-class data, not text-only notes.

### 5. Resources are only partly canonical

Frontend resource rules are centralized and useful, but backend character models still describe `resources` as a loose dictionary and older tests expect long rest to clear resources for frontend re-init. This leaves ambiguity around whether current/max/rest behavior is owned by backend or frontend.

Needed behavior:

- every resource has a canonical key,
- max always derives from current class level/ability/proficiency,
- current is preserved when appropriate,
- max is refreshed after level-up,
- short/long rest recovery is rule-driven,
- resource-spending buttons update current uses only,
- old saved resource shapes are normalized.

### 6. Action economy is better, but still not fully rule-complete

The Actions tab is now simple, but D&D Beyond-level use needs a complete action-card derivation pass:

- class and subclass features,
- species/race traits,
- feats,
- items,
- spells by casting time,
- weapon attacks and unarmed strikes,
- condition/concentration reminders,
- per-card resource spend/restore behavior,
- no duplicate dead text cards when a clickable card exists.

The current sheet does some of this, but there is no comprehensive matrix proving every class/subclass/species/feat/item action appears in the correct bucket.

### 7. Spellcasting needs a canonical spellcasting block

`CleanSpellsTab.js` can show and spend slots, but D&D Beyond-level support needs each character to derive spellcasting by source:

- full caster slots,
- half caster slots,
- third-caster slots for Eldritch Knight/Arcane Trickster,
- Warlock Pact Magic and Mystic Arcanum style entries,
- cantrips known,
- spells known,
- prepared spells,
- always-prepared subclass/domain/oath/circle spells,
- innate species/background/feat spells,
- ritual casting where applicable,
- spell attack/DC per source,
- concentration tracking from spell cards.

### 8. Level-up flow does not yet prove 1-to-20 for every class and edition

There are many class tests, plus the new lightweight progression audit, but there is not yet a true level-up simulation that creates a character, applies choices at every required level, and verifies the final sheet at 20.

Minimum D&D Beyond-level proof:

- 12 classes × 2 editions × level 1 creation,
- level-up from 1 to 20 for each,
- required choices supplied at correct levels,
- ASI/feat levels applied,
- subclass features unlocked,
- resources created/scaled/recovered,
- spell slots/known/prepared updated,
- sheet action cards derived,
- no validation warnings left unexplained.

### 9. Test suite health blocks confidence

Current full frontend and backend test commands do not pass. That matters because a D&D Beyond-level rules engine needs heavy regression coverage.

Known current blockers from the latest runs:

- frontend full test run fails on missing `@testing-library/react` for several component tests,
- frontend full test run has existing progression/summary expectation mismatches,
- backend pytest fails during collection because `compute_multiclass_spell_slots` is imported by `tests/test_epic_level_spell_slots.py` but not exported by `routes.characters`.

## Recommended roadmap

### Phase 0 — Stop the bleeding: make tests trustworthy

1. Add or restore the missing frontend test dependency/config for `@testing-library/react`, or quarantine component tests behind a documented command if they are not meant to run in this environment.
2. Fix backend `compute_multiclass_spell_slots` export/import mismatch.
3. Decide whether the existing progression/summary test failures represent stale tests or real behavior regressions, then fix one suite at a time.
4. Add one `yarn test:rules` or documented focused test command for pure rules/data helpers.

### Phase 1 — Canonical derived character snapshot

1. Create `frontend/src/data/deriveCharacterSnapshot.js` or equivalent.
2. Feed it raw character + rules data.
3. Return the target snapshot shape described above.
4. Move current scattered derivations into this helper gradually: resources first, then action economy, then spellcasting, then species/background/feats.
5. Add snapshot tests with representative characters.

### Phase 2 — Rules source consolidation

1. Inventory every class/race/species/background/subclass data source.
2. Mark one source canonical for each domain.
3. Add adapters for backend SRD/homebrew/private ruleset data into the canonical shape.
4. Keep frontend package helpers if useful, but make them read from canonical data rather than competing with it.
5. Add a machine-readable data completeness report.

### Phase 3 — Creation parity for 2014 and 2024

1. For 2014: prove each race/subrace/class/background can create a complete level 1 character.
2. For 2024: prove each species/background/class can create a complete level 1 character with background ASI and origin feat.
3. Wire all pending language/tool/skill choices with existing language helper files.
4. Ensure no placeholder strings like `One of choice` are saved as real languages.
5. Add validation warnings for missing creation choices instead of silently saving incomplete characters.

### Phase 4 — Level-up parity 1 to 20

1. Build a pure level-up simulator that does not need the UI.
2. For each class and edition, apply required choices at each level.
3. Verify class level, total level, HP/hit dice, proficiency, ASI/feat, subclass features, resources, spellcasting, and action cards.
4. Add backend API tests for `/level-up-options`, `/level-up`, and `/multiclass` for representative classes.
5. Add special cases for Cleric/Druid/Sorcerer/Warlock/Wizard subclass-level differences between 2014 and 2024.

### Phase 5 — Sheet parity for actual play

1. Actions tab: use canonical action-card output only.
2. Features tab: group passive/reference features separately from clickable actions to avoid duplicate dead cards.
3. Spells tab: add source-aware spellcasting blocks, concentration actions, and prepared/known validation.
4. Inventory tab: derive attacks, AC, shields, armor stealth disadvantage, attunement, consumables, and magic item actions.
5. Rest buttons: run canonical short/long rest rules and show exactly what changed.

### Phase 6 — Content policy and extensibility

1. Keep built-in data SRD/CC-safe or homebrew-safe summaries.
2. Allow users/campaigns to upload private licensed/homebrew rules through the existing rule-system/homebrew paths.
3. Clearly label built-in, campaign, private, and homebrew sources in UI.
4. Add validation to prevent malformed uploads from breaking character sheets.

## Priority class-by-class work

| Priority | Class | Why |
|---|---|---|
| 1 | Monk | Reference class for resources, action cards, subclass aliases, and level-up state. |
| 2 | Fighter | Many mechanical branches: Action Surge, Second Wind, Indomitable, Battle Master dice, Eldritch Knight spellcasting, weapon mastery. |
| 3 | Warlock | Pact Magic is structurally different from normal spell slots and needs source-aware spellcasting. |
| 4 | Cleric/Druid/Paladin | Prepared casting plus Channel Divinity/Wild Shape/Oath/Circle/domain features. |
| 5 | Sorcerer/Bard | Known casting plus class resources and Metamagic/Bardic Inspiration. |
| 6 | Ranger/Rogue | Half/third casting subclasses and action economy edge cases. |
| 7 | Barbarian/Wizard | Barbarian is resource/action straightforward; Wizard is spellbook/preparation-heavy. |

## Definition of done for D&D Beyond-level core sheet

A character is considered fully supported when all of these are true:

1. It can be created at level 1 in both valid editions for its class/race/species/background combination.
2. Required creation choices cannot be skipped silently.
3. It can level from 1 to 20 through the app or pure simulator.
4. Every required level-up choice appears at the correct level.
5. Backend and frontend agree on subclass unlocks, ASI/feat levels, spell progression, resources, and class levels.
6. The sheet shows the right stats, saves, skills, passives, AC, HP, speed, hit dice, proficiency, and languages.
7. Resources display current/max/recovery correctly and never get stuck after level-up.
8. Actions, Bonus Actions, and Reactions include all usable features, spells, items, and attacks with no duplicate dead cards.
9. Spell slots and spell lists are source-aware and rest correctly.
10. Short rest and long rest update HP, hit dice, spell slots, class resources, and feature resources correctly.
11. Mobile/tablet/desktop layouts remain readable and fast.
12. The test suite includes matrix coverage for all classes and representative race/species/background combinations.

## Immediate next PR recommendation

Do **not** try to make everything D&D Beyond-level in one PR. The next safest, highest-confidence PR should be:

> Fix test-suite blockers and add a pure derived-character snapshot skeleton for Monk and Fighter only.

Acceptance criteria:

- Full backend tests at least collect successfully.
- Frontend rule/data focused tests pass.
- Snapshot helper returns resources, actions, passive features, spells, and validation warnings for Monk and Fighter.
- Clean sheet can continue using existing UI while tests prove the snapshot output.
