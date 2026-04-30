# ROOK — PRD

## Original problem statement
Immersive SRD-5.1-compliant TTRPG app with GM tools + a Player experience that matches D&D Beyond quality. Four character creation modes (Full / Basic / Premade / Kids). Dual-edition support (2014 + 2024). Dark navy + gold-outline simple design.

## Architecture
```
/app
├── backend/
│   ├── server.py
│   ├── models/__init__.py                       # PlayerCharacter[Create|Update] + multiclass model
│   ├── routes/
│   │   ├── character_templates.py               # 24 templates (12×2 editions), AI match
│   │   ├── characters.py                        # CRUD, level-up, /multiclass, HP/temp-HP/exhaustion clamping
│   │   ├── srd.py                               # /api/srd/spells filtered by class+level
│   │   └── ... (18 more)
│   └── data/srd/spells.json
└── frontend/src/
    ├── App.js
    ├── components/
    │   ├── CharacterCreationModePicker.js
    │   ├── CharacterBuilder.js                  # 9-step dynamic wizard (Spells+Gear conditional)
    │   ├── BasicCharacterBuilder.js
    │   ├── PremadeCharacterBuilder.js
    │   ├── KidsCharacterBuilder.js
    │   ├── CharacterSheetFull.js                # Vitals bar, exhaustion-aware HP/speed, multiclass display
    │   ├── CharacterCombatTab.js                # 16 conditions + exhaustion levels passed through
    │   ├── CharacterSpellbook.js                # Slot tracker, Learn Spell modal, prepare/known/spellbook
    │   ├── LevelUpWizard.js                     # Multiclass + ASI/Feat + spell pick + HP roll
    │   └── gm/...
    └── data/
        ├── characterRules5e.js                  # MULTICLASS_REQUIREMENTS + canMulticlassFrom/Into
        ├── conditionEffects.js                  # CONDITIONS + getExhaustionEffects (1–6) + getConditionRollEffect
        └── spellDatabase.js
```

## Implemented

### Phase 16 — D&D Beyond Quality Player (Apr 25)
7-step wizard, vitals bar, backend extensions.

### Phase 17 — Block B Rule Correctness (Apr 30)
- 24 premade templates with AI match
- 9-step dynamic wizard (Spells + Gear show conditionally)
- Half-Elf floating ASI + Skill Versatility, language picker
- Subclass-at-L1 enforcement, Fighting Style picker
- Spell selection step per class (Wizard 3/6, Sorc 4/2, Bard 2/4, Warlock 2/2, Cleric 3/WIS+1, Druid 2/WIS+1)
- Equipment choice step (gear vs gold)
- Basic builder rewritten with real skill picker
- Premade builder uses full template data
- HP/temp-HP persistence bug fixed

### Phase 18 — Mid-game Spell Mgmt + Exhaustion + Multiclass (Apr 30)
- **Learn/Prepare Spell modal** on Spellbook: gold "LEARN SPELL" button → modal with cantrip/L1-9 filter + search → fetches SRD spells filtered by character's class → "LEARN" persists to spells_known/spells_prepared/cantrips_known via PATCH
- **Exhaustion mechanics expanded** to all 6 levels:
  - L1: disadvantage on ability checks
  - L2: speed halved (vitals bar reflects)
  - L3: disadvantage on attacks AND saves
  - L4: HP max halved (vitals bar reflects)
  - L5: speed → 0
  - L6: death
  - Wired into `getConditionRollEffect` and `getConditionIndicator`. Both Sheet save/skill rolls and Combat Tab attack rolls pass `exhaustion_level` through.
- **Multiclass support**: backend `/api/characters/{id}/multiclass` and `class_levels` already existed. LevelUpWizard already had multiclass branch. Character sheet header now displays multiclass progression e.g. "Fighter 3 / Wizard 2" (falls back to single class display).

## Prioritized backlog
### P1 — next
- **Block A: design reset** — strip all player + homepage pages to dark navy + gold-outline (user-requested next)

### P2 — later
- 2024-specific feats (currently shared with 2014)
- Creation-time backstory/personality prompts
- GM-authored custom templates endpoint
- Multiclass spell-slot calculation on the Spellbook (currently shows base class only)

### Blocked
- Production login / password reset (hosting config)

## Test iterations
77, 78, 79, 80, 81 (Block B 14/14 backend pass + smoke), 82 (Phase 18 — **critical Learn Spell persistence bug found and fixed**: added cantrips_known/spells_known/spells_prepared/used_spell_slots to PATCH whitelist in routes/characters.py; handleUpdateCharacter now rethrows + rolls back optimistic state on failure)

## Phase 19 — Post-test Fixes (Apr 30)
- **Learn Spell persistence bug** (from iteration 82): backend PATCH whitelist now accepts `cantrips_known`, `spells_known`, `spells_prepared`, `used_spell_slots`. Frontend `handleUpdateCharacter` rethrows errors and rolls back optimistic state so callers can show real toasts.
- Verified end-to-end: Learn Fire Bolt → reload → UI shows CANTRIPS (1) Fire Bolt, API confirms persistence.

---
*Last updated: April 30, 2026*
