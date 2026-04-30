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

## Phase 21 — P2 Cleanup Sweep (Apr 30)
- **GM theme parity**: GMScreen.js theme object swapped to navy/gold; bulk sed-replaced all purple (`#8A2BE2`, `#4B0082`, `#9932CC`, `#BA55D3`) and cyan (`rgba(77,208,225,*)`, `rgba(138,43,226,*)`) tokens across GMScreen + every gm/* tab
- **Login icon overrides**: AuthPage.js purple icon colors (`#8A2BE2`, `#4DD0E1`) replaced with gold (`#D4A017`)
- **Multiclass spell slots**: new `getMulticlassSpellSlots(classLevels)` helper in spellDatabase.js applies SRD multiclass rules — full casters contribute full level, half casters `floor(level/2)`, Warlock pact tracked separately. CharacterSpellbook detects `class_levels`/`multiclass_levels` with 2+ entries and uses the multiclass slot table (with separate Pact Magic display for Warlock multiclass).
- **2024-specific feats**: every feat in `levelUpData.js` now has `editions: ['2014', '2024']` + `category: 'origin'|'general'|'epic'`. Added 6 new 2024-only Origin feats (Crafter, Musician, Lucky-Origin, Healer-Origin, Savage Attacker-Origin, Alert-Origin) and 8 Epic Boons (Combat Prowess, Dimensional Travel, Fate, Fortitude, Irresistible Offense, Spell Recall, Night Spirit, Truesight). New `getFeatsByEdition(edition, category?)` helper. LevelUpWizard now filters via `getFeatsByEdition(character.edition || '2014')`.
- **Residual purple/cyan purge**: bulk sed across CharacterBuilder, CharacterSheetFull, CharacterSpellbook, CharacterCombatTab, UnifiedDashboard removed all remaining `rgba(138, 43, 226, *)` and `rgba(77, 208, 225, *)` tokens → gold.

## Phase 22 — Spellbook Rest, Conditions Audit, Class Accents, Combat Log (Apr 30 / Iter 83)
- **Spellbook Short / Long Rest buttons** replaced the single Reset All. Short Rest restores Pact Magic only; Long Rest restores all slots + decrements exhaustion (RAW). Both buttons hook into existing `handleRest` flow so backend `/long-rest` / `/short-rest` endpoints fire.
- **`used_spell_slots` persistence**: CharacterSheetFull hydrates from `character.used_spell_slots` on fetch and PATCHes via a `persistUsedSlots` wrapper on every change → slot consumption now survives page reloads.
- **Conditions → sheet linkage audit**: speed-zero conditions (`grappled`, `restrained`, `paralyzed`, `petrified`, `stunned`, `unconscious`) now force SPD vital chip to 0; new `active-conditions-strip` in the header shows active conditions + exhaustion as labeled chips; `incapacitated` chain detection added. Existing roll-mode mapping (advantage/disadvantage/auto-fail) for blinded, paralyzed, poisoned, frightened, prone, restrained, stunned, unconscious, invisible, petrified — re-verified working through `getConditionRollEffect`.
- **Per-class color accents**: new `CLASS_ACCENTS` map + `getClassAccent(character)` helper in `lib/theme.js`. Applied as: small accent crest dot on the character portrait (data-testid='class-accent-dot'), and slot-fill color on gem-style spell slots. Subtle by design — borders + surfaces remain strict Dark Navy + Gold.
- **Gem-style spell slots**: rotated-square (45°) diamond shapes with flat fills, gold borders, class-tinted active fill. Applied in both CharacterSpellbook and CharacterCombatTab.
- **Per-character Combat Log** (`CombatLog.js`): new collapsible panel in Combat tab. Captures HP delta, rolls (classified into attack / spell / roll), rests, condition changes, exhaustion changes. Filter buttons + clear, auto-expands on first entry.
- **Tests**: backend 6/6 pass (used_spell_slots PATCH persistence, conditions PATCH persistence, /long-rest, /short-rest). Frontend 100% on critical flows (class dot, conditions strip, speed-zero under grappled, rest buttons, gem slots, persistence, combat log present). See `/app/test_reports/iteration_83.json`.

## Phase 23 — Live Play Polish + GM Rules Edition (Apr 30 / Iter 84)
- **Removed Map Maker from Live Play Mode** (Battle Map and World Map tabs deleted; `MapMaker` import + `Grid3x3`/`Globe` icon imports removed). Live Play Mode is now strictly: COMBAT (Combat) → WORLD (Location, Events) → CHARACTERS → REFERENCE → SESSION.
- **`gm/MiniGameEngine.js` deleted** — Event System fully absorbed it; no callers remained.
- **`condition-toggle-{key}` data-testids** added to every condition button in `CharacterCombatTab.js`.
- **2014 / 2024 Rules Edition Toggle** in GMScreen header. Backend Campaign model now exposes `rules_edition: str = "2024"`; `PUT /api/campaigns/{id}` persists changes; UI toast confirms switch.
- **Edition-aware AI prompts**: new `edition_prompt_fragment(campaign)` helper in `routes/ai.py` injects 2024 mechanics (Origin Feats, Weapon Mastery, Subclasses-at-L3, Species over Race, Background ASI) or 2014 mechanics (Race ASIs, Half-Elf/Half-Orc, original subclass timing) into the system/world context of every GM-facing AI endpoint: `ai_generate_with_rules`, `generate_ai_content`, `rook chat`, `session planner`, `prep checklist`. Helper falls back to inferring from `system` string when `rules_edition` missing.
- **Tests**: backend 4/4 pass (rules_edition GET/PUT round-trip, helper code review, edition fragment markers verified); frontend 100% on critical flows (toggle visible, PUT fires + toast, gold active state, MapMaker tabs gone, all condition-toggle testids present + persistence). See `/app/test_reports/iteration_84.json`.

## Phase 24 — Landing/Home Visual Unification + Montserrat Bold (Apr 30)
- **Landing page rewritten** to match `/home` (UnifiedDashboard) — strict Dark Navy `#0A1628` + Gold `#D4A017` palette. Removed all purple/cyan AI-slop gradients, glow shadows, and `linear-gradient` backgrounds. Hero, features grid, pricing tiers, and footer now use the same flat panel/border conventions as the rest of the app.
- **Global Montserrat font lock** (`index.css`): replaced Outfit + Manrope + Cinzel imports with a single Montserrat (400/500/600/700/800) import. Added a `*, *::before, *::after { font-family: 'Montserrat' !important; }` override so every existing inline `fontFamily: 'Cinzel'/'Outfit'` declaration in any component now renders as Montserrat without further code edits. Body weight defaults to 700 (bold) per user spec; Tailwind utility classes (`font-medium`, `font-bold`, etc.) restored to maintain hierarchy.

## Phase 25 — Audit Fixes Batch 1 (Apr 30 / Iter 85)
Tackled the highest-impact P0 bugs + first wave of P1 polish from `/app/memory/AUDIT.md`:
- **Combat tab**: "no-weapons-hint" gold callout when only Unarmed Strike is available, prompting the user to equip from Inventory. CONDITIONS section now **open by default** (was collapsed → invisible to new players).
- **CombatPage** (full-screen combat): replaced AI-slop purple/red header with strict Dark Navy + Gold; visible labelled "Back" button (was just an icon); endCombat now **PATCHes each player combatant's `current_hit_points` / `temporary_hit_points` / `conditions` back to their character record** so HP changes persist post-combat.
- **Home page**: live `character-search-input` + `campaign-search-input` filter inputs (filter by name/class/race or name/setting/description), and a `2024 RULES` / `2014 RULES` gold pill on every campaign card.
- **Admin page**: unified all 4 stat boxes to flat Dark Navy + Gold (removed teal/red/green/orange tints), tabs gold-active (was red/cyan), removed gradient `borderImage` divider.
- **Character creation mode picker**: Kids Mode reordered to first; grid layout `auto-fit minmax(240px, 1fr)` + maxWidth 800 yields clean 2×2 on desktop (no orphan-card 3+1 wrap).
- **GM CombatTab**: Spontaneous Combat button red→gold; "Quick Start with Players (0)" now hidden when no players.

**Tests**: backend 5/5 (POST login, GET character, PATCH with HP/temp/conditions persists, partial PATCH no-422, campaign rules_edition regression). Frontend 12/12 critical flow checks. See `/app/test_reports/iteration_85.json`. Testing agent created `/app/backend/tests/test_iter85_audit_batch1.py` for regression.

**Known non-blockers flagged by testing agent for future cleanup:**
- AdminPage stat boxes lack `data-testid` (cosmetic — visual unification still verified in code)
- `UnifiedDashboard.js` is 1376 lines — should split into Header / PlayerSection / CampaignSection / Modals
- Live admin API returns 403 for `lcblakey24` (env-specific role gating, not a regression)

## Phase 26 — Audit Fixes Batch 2 (Apr 30 / Iter 86)
Continued audit polish — heavier touch on character sheet + GM + Live Session:
- **MapMaker DELETED** (frontend `gm/MapMaker.js`). Backend `/api/campaigns/{cid}/maps`, `/world-maps`, `/local-maps` endpoints PRESERVED for data safety. New concept (square-grid travel overlay) documented in `/app/memory/ROADMAP.md` per user spec.
- **Character Sheet — Skills upgraded** to 3-tier proficiency display: ○ not-proficient · ● proficient · ★ expertise (×2 prof bonus). Tooltips + colored modifier values match.
- **Character Sheet — `SPELLS NOT PREPARED` warning chip** in header for prepared casters (Cleric/Druid/Wizard/Paladin/Artificer) when `spells_known > 0` but `prepared_spell_names` is empty. Click → opens Spells tab.
- **GM Screen — sidebar collapsed-state persisted** to localStorage (`gm.sidebar.collapsedGroups`). The right-side **dice panel show/hide also persisted** (`gm.dicePanel.show`).
- **Live Combat (CombatPage) — `HIDE HP` toggle** in header. When ON, monster HP renders as fuzzy labels (Healthy / Wounded / Bloodied / Critical / Down) instead of numeric — perfect for screen-share play. Player HP always shows numeric.

**Tests**: backend 6/6 (login + character GET + partial PATCH + 3 maps endpoints all 200). Frontend 8/8 critical flows verified (skill ○ icons, prepared-spells warning hidden correctly, GM sidebar persistence, dice panel persistence, MapMaker file deleted with no orphan refs, Iter 85 regression). See `/app/test_reports/iteration_86.json`.

## Phase 27 — Audit Fixes Batch 3 + Session Recap P2 (Apr 30 / Iter 87)
Ambitious batch — builder, admin, combat polish + first shipped P2 feature:
- **Character Builder live preview + progress**: new 2-column layout (wizard panel + sticky preview on the right). Preview shows name, race/subrace, class/subclass, edition + background, ability-score grid with modifiers, selected-skills/cantrip/spell counts, and origin feat. Progress bar shows `STEP X OF N` + live percentage — updates on every Next/Previous.
- **AdminPage testids**: all 4 stat boxes now carry `admin-stat-users / -codes / -referrals / -reviews` for testing stability.
- **CombatPage — drag-to-reorder initiative**: HTML5 native drag (no library) — drag any initiative card into a new slot; toast confirms "Initiative reordered"; opacity 0.4 on the dragged card.
- **CombatPage — Concentration save prompt**: when a combatant with `concentrating_on` takes damage, a long-duration warning toast fires with `DC = max(10, floor(damage/2))` — standard 5e RAW.
- **[P2 SHIPPED] Session Recap Sharing**: `SHARE RECAP` button in the Combat Log copies a Discord/Slack-friendly markdown summary (`**Session Recap — {characterName}**` + emoji-prefixed entry lines ⚔/💥/💚/✨/🌙/🛡/🎲) to the clipboard via `navigator.clipboard.writeText`. `window.prompt` fallback for locked-down browsers. `rook:toast` CustomEvent + sonner listener shows "Recap copied" confirmation.

**Tests**: backend 4/4 (auth, character GET/PATCH round-trip, campaign GET). Frontend 9/9 (builder-progress + live-preview, 4 admin testids, regression for search + pill + skill icons + condition toggles, code review for drag-drop + concentration + share recap). See `/app/test_reports/iteration_87.json` + `/app/backend/tests/test_iter87_audit_batch3.py`.

## Test iterations
77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87 (Phase 27 — 100% backend, 100% frontend audit batch 3 + P2 Recap)

---
*Last updated: April 30, 2026*
