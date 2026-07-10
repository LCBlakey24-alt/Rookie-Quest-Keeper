# Rules Data Architecture

This note answers a recurring implementation question: **should Rookie Quest Keeper keep big rules-data files for spells, feats, species, and class feature wiring?**

Yes — but with a clear split between **canonical data**, **ruleset/class indexes**, and **derived character helpers**. This keeps the app moving toward fully usable characters without scattering spell, feat, and class logic across builders and sheets.

## Recommended shape

Use these layers:

1. **Canonical rules data**
   - One record per spell, feat, species trait, class feature, or equipment item.
   - Records should be source-aware and ruleset-aware.
   - Records should not know which builder or sheet component is rendering them.

2. **Eligibility/index data**
   - Maps classes, subclasses, species, backgrounds, and rulesets to canonical IDs.
   - Example: Wizard points at a list of spell IDs; 2024 Human points at species trait IDs; an origin feat list points at feat IDs.

3. **Derived helpers**
   - Functions answer questions like:
     - Which spells can this character choose?
     - Which feats are legal at this level/ruleset?
     - Which resources/actions should show on the sheet?
     - Which selected choices are still missing before save?

4. **Builder/sheet UI**
   - UI should consume derived helper results.
   - UI should not hardcode class spell lists, feat prerequisites, or ruleset exceptions when a helper can provide them.

## Spell data

Keep spells in a canonical spell registry, then map class access separately.

Recommended fields:

```js
{
  id: 'magic-missile',
  name: 'Magic Missile',
  level: 1,
  school: 'Evocation',
  castingTime: '1 action',
  range: '120 feet',
  components: ['V', 'S'],
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  attackType: null,
  saveAbility: null,
  damage: [{ dice: '1d4+1', type: 'force' }],
  healing: [],
  tags: ['damage', 'force', 'auto-hit'],
  rulesets: ['2014', '2024'],
  source: 'SRD',
}
```

Then keep class/ruleset access as indexes:

```js
{
  Wizard: {
    '2014': ['magic-missile', 'shield'],
    '2024': ['magic-missile', 'shield'],
  },
  Sorcerer: {
    '2014': ['magic-missile', 'shield'],
    '2024': ['magic-missile', 'shield'],
  },
}
```

This lets one spell exist once while multiple classes and rulesets point at it.

## Feat data

Feats should use the same pattern: one canonical feat record, then ruleset/category indexes.

Recommended fields:

```js
{
  id: 'tough',
  name: 'Tough',
  category: 'origin',
  rulesets: ['2024'],
  prerequisites: [],
  effects: [
    { type: 'max_hp_per_level', value: 2 },
  ],
  grants: [],
  source: 'SRD',
}
```

Important feat effect types to support over time:

- Ability-score increases.
- Skill/tool/weapon/armor proficiencies.
- Languages.
- Spells granted by feat.
- Actions, bonus actions, and reactions.
- Resource pools.
- HP/AC/speed changes.
- Reroll or advantage notes.

Do not store feats only as display text if they are expected to affect the sheet.

## Ruleset handling

Every canonical record that changes between 2014 and 2024 should either:

- include `rulesets: ['2014']`, `rulesets: ['2024']`, or both; or
- use versioned records when mechanics differ enough to matter.

Good:

```js
{ id: 'human-2014', name: 'Human', rulesets: ['2014'], ... }
{ id: 'human-2024', name: 'Human', rulesets: ['2024'], ... }
```

Also good when mechanics are identical:

```js
{ id: 'light', name: 'Light', rulesets: ['2014', '2024'], ... }
```

Avoid mixing 2014 and 2024 mechanics in one record unless helpers can cleanly separate the behavior.

## Source and content safety

Rules data must be source-aware.

Use:

- `source: 'SRD'` for SRD-safe content.
- `source: 'starter-origin-data'` for generic app-authored starter data.
- `source: 'homebrew'` for user-created data.
- `source: 'licensed'` only if the app has explicit rights to use that content.

Do not paste protected sourcebook text into canonical data. Prefer short app-authored summaries, IDs, tags, and mechanical fields.

## Suggested file direction

The current repo already has useful rules-data files. Future work should move toward this structure without doing one risky rewrite:

```text
frontend/src/data/rules/spells/spellRegistry.js
frontend/src/data/rules/spells/spellClassLists.js
frontend/src/data/rules/spells/spellcastingProgression.js
frontend/src/data/rules/feats/featRegistry.js
frontend/src/data/rules/feats/featIndexes.js
frontend/src/data/rules/species/speciesRegistry.js
frontend/src/data/rules/classes/classFeatureRegistry.js
frontend/src/data/rules/classes/classProgressionIndexes.js
frontend/src/data/rules/derive/characterRulesSnapshot.js
```

Do this gradually. The first safe step is to add registries/helpers for one area, then make existing builders/sheets consume them.

## Practical next steps

1. Create a canonical spell registry for SRD-safe spells.
2. Split class spell lists into class/ruleset indexes.
3. Add helper tests for:
   - Wizard 2014 spell access.
   - Cleric prepared caster access.
   - Ranger/Paladin half-caster access.
   - Warlock pact magic access.
   - Eldritch Knight / Arcane Trickster subclass casting.
4. Create a canonical feat registry for 2024 origin feats first.
5. Wire feat effects into derived character snapshots before adding more feat content.
6. Keep builder UI consuming helper results instead of reading raw registries directly.

## Bottom line

Centralized rules-data files are worth it. They are the right path to 100% usable characters, as long as the app keeps:

- canonical records separate from class/ruleset indexes,
- helper functions separate from UI,
- 2014 and 2024 mechanics explicitly separated,
- and protected sourcebook text out of repo data unless licensed.
