# ROOK Character Creator + Combat System — Emergent Implementation Handoff (v1)

## Goal
Ship a production-safe, ruleset-aware character system that supports:
- Creation modes: Premade / Basic / Full / Kids
- Canonical rulesets: `dnd5e_2014` and `dnd5e_2024`
- Reliable level progression from 1 → 20
- Combat-first play surface (actions, bonus actions, reactions, movement, conditions, spell slots)
- SRD/public-domain-safe content ingestion and equipment effects.

---

## 1) Architecture Decisions (Source of Truth)

### Backend is authoritative for legality
Frontend should render options from backend preflight responses; it should not be the final arbiter of:
- level-up eligibility
- ASI/feat legality
- subclass unlock legality
- spell learn/prepare legality
- multiclass spell slot math

### Ruleset partitioning
Create independent rules modules:
- `backend/rulesets/dnd5e_2014/*`
- `backend/rulesets/dnd5e_2024/*`

Each module contains:
- class progression
- subclass unlock levels
- ASI/feat levels
- spell slot progression
- known/prepared spell rules
- cantrip progression
- class resource progression

### Unified slot storage
Canonical fields only:
- `spell_slots: { "1": n, "2": n, ... }`
- `spell_slots_remaining: { "1": n, ... }`
Remove mixed per-level ad hoc fields.

---

## 2) Data Models to Add/Refine

## `character_templates` collection
```json
{
  "id": "wizard_scholar_2014_v1",
  "name": "Arcane Scholar",
  "ruleset_id": "dnd5e_2014",
  "version": 1,
  "is_active": true,
  "complexity": 3,
  "playstyle_tags": ["magic", "control", "utility"],
  "pitch": "A tactical spellcaster with broad utility.",
  "base_character": {
    "race": "High Elf",
    "character_class": "Wizard",
    "background": "Sage",
    "ability_scores": {"str":8,"dex":14,"con":13,"int":15,"wis":12,"cha":10},
    "skills": ["Arcana","History"],
    "spells_known": [],
    "cantrips_known": []
  },
  "autopilot_defaults": {"asi":"auto","feats":"auto","spells":"guided","subclass":"guided"},
  "created_at": "...",
  "updated_at": "..."
}
```

## `srd_content_manifest` (new)
Tracks legal source provenance:
```json
{
  "content_key": "spell_fireball",
  "source_name": "5.1 SRD",
  "license": "CC-BY-4.0",
  "attribution": "Wizards of the Coast LLC",
  "allowed": true,
  "imported_at": "..."
}
```

## Character combat extensions
- `attunement_slots_max` (default 3)
- `attuned_items: [item_id]`
- `turn_state: { action_used, bonus_action_used, reaction_used, movement_used }`

---

## 3) API Contracts to Implement

### Creation/Validation
- `POST /api/characters/validate-build`
  - request: full creation payload
  - response: `{ valid: bool, errors: [{path, message}], warnings: [...] }`

### Level-up preflight
- `GET /api/characters/{id}/level-up-options?target_level=N`
  - response includes legal:
    - ASI/feat choices
    - spell learn count + legal spells
    - cantrip learn count
    - spell replacement allowance
    - subclass options if unlocked
    - resource deltas

### Level-up apply
- `POST /api/characters/{id}/apply-level-up`
  - server validates against preflight policy version

### Templates
- `GET /api/character-templates?ruleset_id=&mode=`
- `POST /api/character-templates/create-character`
- `POST /api/character-templates/ai-match`

### Equipment effects
- `POST /api/characters/{id}/equip-item`
- `POST /api/characters/{id}/unequip-item`
- `POST /api/characters/{id}/attune-item`
- `POST /api/characters/{id}/unattune-item`

All endpoints return a `derived_stats` block:
- AC
- speed
- initiative
- spell save DC
- attack bonus modifiers
- resource caps

---

## 4) Combat Page Requirements (D&D Beyond-like without copying proprietary text)

## Tabs within Character Sheet
1. **Combat**
   - Action / Bonus Action / Reaction toggles
   - Movement tracker (`0 / speed`)
   - Initiative roller
   - Condition manager (SRD conditions)
   - Death saves
   - Concentration tracker + auto DC suggestion
2. **Actions**
   - Weapons, class actions, spell actions, item actions
3. **Spells**
   - prepared/known split
   - slot spend/recover
4. **Inventory**
   - equip/unequip
   - attunement slots + lock when full

## Rules behavior
- Conditions impact rolls through a shared condition effect layer.
- Turn-state resets on end-turn / short-rest / long-rest depending rule.

---

## 5) Ability Score UX (already partly fixed; finish)
- Standard array assignment must remain editable per ability.
- Rolled scores assignment must remain editable per ability.
- Show **Base score** and **Final score** separately to avoid confusion when racial/origin bonuses push to 16.
- Add explicit tooltip: “Standard array base max is 15; bonuses can increase final value.”

---

## 6) SRD/Public Content Ingestion Plan

Create importable JSON catalogs:
- `frontend/src/data/srd/spells_5e_srd.json`
- `frontend/src/data/srd/weapons_5e_srd.json`
- `frontend/src/data/srd/armor_5e_srd.json`
- `frontend/src/data/srd/items_5e_srd.json`
- `frontend/src/data/srd/magic_items_5e_srd.json`

Each entry includes:
- id
- name
- rules text (only from allowed source)
- source/license metadata
- effect descriptors for engine (e.g., `{"type":"ac_bonus","value":1}`)
- attunement requirement flags

---

## 7) Testing Matrix (must pass before production)

## Creation tests
- Full create for each class with 2014 and 2024 rulesets.
- Basic/Premade/Kids creation smoke tests.

## Level-up tests
- Per-class level progression 1→20.
- ASI/feat levels including Fighter/Rogue exceptions.
- Known vs prepared spellcasters.
- Wizard 2-spellbook gain validation.
- Multiclass caster slot validation.

## Combat tests
- HP/Temp HP/death saves constraints.
- Spell slot spend/recover lifecycle.
- Conditions + concentration behavior.
- Attunement cap and derived-stat updates.

---

## 8) Delivery Phases

### Phase A (2–3 days)
- Backend preflight endpoint
- Unified spell slot storage
- Ability score UX finalization

### Phase B (3–5 days)
- Combat action economy + turn state
- Attunement/equipment effects MVP

### Phase C (5–8 days)
- Ruleset module split (2014/2024)
- Template DB migration + admin management

### Phase D (ongoing)
- SRD content expansion and balancing
- Kids mode curated simplification catalog

---

## 9) Definition of Done
- Player can create in all modes, pick ruleset, and level 1→20 without invalid states.
- Backend rejects illegal transitions with actionable errors.
- Combat page supports complete in-session loop.
- Only legal public/SRD content is shipped, with attribution metadata.
