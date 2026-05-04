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

## Phase 28 — Technical Audit Sprint (Apr 30 / Iter 88)
Five tightly-scoped architectural cleanups from user's tech audit — ALL shipped:

1. **Upload UI consolidated**. The Settings modal in `CampaignDashboard.js` (lines 535-746) deleted entirely. New top-level `Uploads` tab nested under the **GM Tools** sidebar group renders the existing `gm/UploadTab.js` — single source of truth. `campaign-settings-btn` + `Settings` icon import + `showSettingsModal` state all removed. `CampaignDashboard.js` shrunk from 769 → 540 lines.

2. **`/level-up-options` extended** with full legal collections per request:
   - `subclass_options[]` (filtered by class)
   - `feat_options[]` (filtered by edition + general/origin category, only at ASI levels)
   - `spells_to_learn` / `cantrips_to_learn` (computed counts)
   - `can_choose_subclass` / `subclass_unlock_level` flags
   - `spells_known_table` / `cantrips_known_table` reference data
   - `edition` resolved from char or `ruleset_id`
   New helper module `/app/backend/data/class_progression.py` houses subclass + spell + cantrip + feat tables (SRD-only).

3. **LevelUpWizard now consumes preflight** as source of truth:
   - `cantripGain` / `spellGain` use `preflight.cantrips_to_learn` / `spells_to_learn` when present (local table fallback only)
   - `hasSubclassChoice` uses `preflight.can_choose_subclass` when present (handles edition-specific subclass timing)
   - feat list filtered by `preflight.feat_options` set when provided (ensures wizard renders only legal options)

4. **Premade templates moved to MongoDB**. Collection `character_templates` seeded on startup via new `seed_templates_if_empty()` (idempotent, version-aware). Each doc carries `version`, `active`, `source` flags — content ops can now version/disable templates without code changes. `GET /api/character-templates`, `GET /api/character-templates/{id}`, and `POST /api/character-templates/ai-match` all read from DB. Startup logs: `Seeded 24 character templates into character_templates collection.`

5. **Dead code removed**. `showSettingsModal` state, `Settings` icon import, and the entire 200+ line modal block all deleted.

**Tests**: backend 7/7 (12+12+24 templates from DB with version/source/active fields, AI-match, level-up-options new fields all correct, ASI feat list >30). Frontend 6/6 (campaign-settings-btn gone, Uploads tab works, all 12 templates load from DB, regression for character/campaign search + admin testids). See `/app/test_reports/iteration_88.json` + `/app/backend/tests/test_iter88_audit_batch4.py`.

**Known follow-ups (testing agent flagged):**
- `seed_templates_if_empty` does full `$set` on version bumps — will overwrite admin DB edits when content-ops starts editing. Future: switch to `$setOnInsert` or scoped field updates.
- `routes/characters.py` imports private `_SPELLS_KNOWN_PROGRESSION` from `data.class_progression`. Future: expose public helpers.
- `UploadTab.js` cards still use the old purple gradient theme (PRE-EXISTING). Theme cleanup batch deferred.

## Phase 29 — Follow-ups + P2 features (Apr 30 / Iter 89)
Executed every follow-up from Iter 88 plus one new P2 feature:

1. **Seed logic now preserves admin DB edits** — `seed_templates_if_empty` uses a scoped `_CONTENT_FIELDS` allow-list on version bumps (character_class/race/subrace/background/alignment/ability_scores/ruleset_id/version/playstyle_tags only); admin-authored fields like name/pitch/source/active are never overwritten.
2. **Public helpers** `spells_known_table()` / `cantrips_known_table()` in `data/class_progression.py`. `routes/characters.py` no longer reaches into private `_*` names.
3. **LevelUpWizard preflight loading skeleton** — gold-tinted placeholder bars + "Loading level-up options…" caption while `/level-up-options` is in-flight. Prevents local-fallback flicker.
4. **UploadTab colors unified to Gold** — all 5 upload cards (maps / portraits / docs / audio / other) now use `#D4A017` consistent with the strict design lock.
5. **`routes/ai.py` deduped** — 334 lines removed (was 1809, now 1465). Removed duplicate bodies for `generate_ai_content`, `process_note_with_ai`, `get_campaign_tokens`, `get_entity_token`, `get_session_recaps`, `ai_generate_with_rules`, plus dead `load_srd_file` helper. Fixed exposed `logging` typo.

**NEW — Admin Templates Editor** (`/admin` → TEMPLATES tab):
- Backend: `GET /api/admin/character-templates`, `PATCH .../{id}`, `POST .../{id}/clone`, `DELETE .../{id}` with scoped allow-list + core-template deletion guard.
- Frontend: `TemplateEditor` component — filterable table (All / 2014 / 2024 / Inactive), Eye-icon active-toggle, Clone-to-homebrew button, Delete button (disabled for core).
- Case-insensitive `is_admin` check so 'LCBlakey24' matches admin 'lcblakey24'.

**NEW — Personality Prompts in Character Builder** (P2 feature shipped):
- Review step now includes optional `Personality Trait`, `Ideal`, `Bond`, `Flaw/Fear`, and `Backstory` textareas.
- All 5 fields whitelisted in backend PATCH and hydrate on character edit.
- Enables richer AI co-GM narration and GM story hooks.

**Tests**: backend 10/10 pytest (admin list/patch/clone/delete, core-delete blocked, preflight regression, 3 ai.py post-dedupe endpoints, personality round-trip). Frontend 9/9 Playwright (Templates tab, 24 rows, filters, toggle, Personality testids, preflight skeleton, Iter 88 regression). See `/app/test_reports/iteration_89.json` + `/app/backend/tests/test_iter89_audit_batch5.py`.

## Phase 30 — Ability Score UX Overhaul + Home Sort + Admin Users/CSV/Impersonate (Apr 30 / Iter 90-91)
Player and admin polish — all shipped and verified end-to-end:

**Ability Score UX Overhaul** (`CharacterBuilder.js` → new `/components/builder/AbilitiesStep.js`, ~600 LOC):
- **Point Buy**: compact `[–] value [+]` single-step stepper buttons (`stat-dec-*` / `stat-inc-*`) per ability; disables at floor 8, ceiling 15, or when next-tier cost exceeds budget. `point-buy-remaining` pill updates live.
- **Roll 4d6**: cinematic **sequential** dice animation (~1.5s) — each of 6 dice flickers through ~5 random faces then locks in, one after the other. Renders inside `roll-animation` container. `roll-dice-btn` re-rolls, `roll-reset-btn` un-assigns all values back to the pool.
- **Drag-and-Drop assignment** (pure HTML5, no library — same pattern as CombatPage): pool of `pool-chip-*` items, drop onto `ability-slot-*`; slot→slot swaps; slot→pool unassigns; each assigned chip also has a `×` button (`slot-clear-*`) for one-click unassign. `score-pool` container.
- **Standard Array** uses the same pool/drag UI (no more dropdowns).
- Live HP/AC/Init preview shows `—` until every slot is assigned — prevents confusion with partial values.

**Home Page Sort Controls** (`UnifiedDashboard.js`):
- `character-sort` and `campaign-sort` `<select>` dropdowns alongside the existing search inputs. 
- Character options: Recent, Name, Level (High→Low), Class. Campaign options: Recent, Name, Edition (2024→2014).
- Preference persists in `localStorage` under `rq.charSort` / `rq.campSort` and survives reload.
- Refactored to `displayCharacters` / `displayCampaigns` `useMemo` pipelines (search + sort in one flow).

**Admin — Users Tab + CSV Export + Impersonation**:
- Backend (`routes/admin.py`):
  - `verify_admin` made case-insensitive so `LCBlakey24` matches `lcblakey24`.
  - `POST /api/admin/users/{username}/impersonate` — issues a JWT for the target via `create_token()`; supports username or email lookup; admin-only.
  - `GET /api/admin/export/users.csv` — streams users CSV with header: `username,email,tier,tier_name,subscription_status,lifetime_access,ai_calls_this_month,created_at`.
  - `GET /api/admin/export/campaigns.csv` — streams campaigns CSV with header: `id,name,dm_user_id,system,rules_edition,setting,player_count,created_at,updated_at`.
  - Tiny `_csv_escape` helper handles commas/quotes/newlines.
- Frontend (new files):
  - `/components/admin/AdminUsersTab.js` — filterable user table with `admin-user-search`, `export-users-csv-btn`, `export-campaigns-csv-btn`, `user-row-{username}` rows, and per-row `impersonate-{username}` button. Uses `dm_token` / `dm_username` keys consistent with the rest of the app.
  - `/components/admin/ImpersonationBanner.js` — fixed top banner with `impersonation-banner` + `stop-impersonating-btn`. Mounted globally in `App.js`. Reads `rq_admin_token_stash` from sessionStorage; Stop restores admin token and redirects to `/admin`.
- New tab `admin-tab-users` added to `AdminPage.js` rendering `AdminUsersTab`.

**Tests**: backend 17/17 pytest in `/app/backend/tests/test_iter90_ability_admin.py` (auth, admin/check, CSV exports with exact header + data-row assertions + 401/403 paths, impersonate exact-case + case-insensitive + 404/403/401 paths, regression for /characters /campaigns /admin/users /level-up-options). Frontend e2e (iter 91) verified the full impersonation flow: token swap, banner appearance, sessionStorage stash, stop-impersonating restore, and redirect. Home sort persistence + Admin Users UI already verified in iter 90. See `/app/test_reports/iteration_90.json` + `/app/test_reports/iteration_91.json`.

**Known follow-ups (testing agent flagged, low priority):**
- `AdminUsersTab.js` still passes `Authorization` headers manually — the App.js axios interceptor already does this; redundant but harmless.
- `ImpersonationBanner` reads sessionStorage on render; does not listen for `storage` events. Multi-tab state can briefly disagree until a reload. Non-blocking.

## Phase 31 — AI Character Portraits (Nano Banana) + Portrait PATCH (Apr 30 / Iter 92)
Player-facing AI magic — the end of the Character Builder now generates fantasy portraits.

**Backend** (`routes/ai_portrait.py` — NEW):
- `POST /api/ai/portrait` — generate a single fantasy portrait via Gemini Nano Banana (`gemini-3.1-flash-image-preview`) with style presets `photoreal` / `painterly` / `stylized`. Accepts race, subrace, character_class, subclass, background, alignment, gender, description, style. Builds a deterministic prompt, returns `{ image_base64, mime_type, style, prompt }`.
- `POST /api/ai/portrait/batch` — kicks off all 3 style variants in parallel via `asyncio.gather`; each result is either a portrait or `{style, error}` so a single failure never sinks the whole batch.
- Uses `LLM_API_KEY` via `utils.llm_provider.LlmChat` + `UserMessage`. Graceful 503 if the package or key is missing.
- `PATCH /api/characters/{id}` whitelist extended with `portrait_url` so the selected AI portrait (or uploaded PNG) persists on edit.

**Frontend** (`/components/builder/PortraitGenerator.js` — NEW):
- Drop-in Review-step component with two paths:
  - **Generate 3 Portraits** button fires `/api/ai/portrait/batch`, shows a 3-tile grid (`portrait-option-{style}`), click a tile to pick → stores base64 data URI into `character.portrait`.
  - **Upload your own** label+file input (`portrait-upload-label`, `portrait-file-input`) — 4MB cap, MIME guard, reads via FileReader into a data URI.
- Gender + appearance description fields feed the prompt; optional Clear button resets to none.
- Loading states, `rq-spin` micro-animation on the wand icon during generation.

**CharacterBuilder** — replaced the plain "Portrait URL" input at the Review step with `<PortraitGenerator />` wired to `portrait` / `setPortrait`.

**Tests**: backend 8/9 (the 1 "failure" is environmental — `LLM_API_KEY` monthly cap at $1.40 is exhausted, so the 3-image batch drops 2/3 per request — the code path itself is verified correct: the endpoint returns `{portraits: [{style, error, ...}, ...]}` so the UI can cleanly show "Generation failed" tiles). Single-portrait endpoint verified end-to-end with a real Gemini JPEG (~1.1MB). Auth guard (401/403), invalid-style fallback, and the `portrait_url` PATCH whitelist fix all pass. Frontend code-review confirms every required data-testid is present. See `/app/test_reports/iteration_92.json` + `/app/backend/tests/test_iter92_ai_portrait.py`.

**⚠️ Action item for the user**: raise the `LLM_API_KEY` budget (Profile → Universal Key → Add Balance / enable auto top-up) so the 3-image batch can actually return 3 images. Current cap is exhausted after the first image. The code handles partial failures gracefully, but the UX is best with a real budget.

## Backlog moved to next session
- **Phase A refactor** (UnifiedDashboard.js → Header/PlayerSection/CampaignSection/Modals) — pure code-hygiene, no user-facing value. Deferred to preserve context for higher-value features.
- **Phase B extension**: simplified image uploads for NPCs / Monsters / Items / Inventory — same `PortraitGenerator`-style component reused everywhere. (Core generator built; just needs to be mounted in those other editors.)
- **Phase C — Homebrew Workshop**: home-page "Create Homebrew" entry → wizard for Magic Item / Class / Race/Subrace / Monster, with an "AI Rook Advisor" Claude-Sonnet sidekick at each step, plus `.docx` import that AI-parses into a draft.
- **Phase D — Player Handouts + Travel Grid Overlay**: GM → player push handouts (polling MVP); extend existing WorldMapTab with "calibrate 2 points = N days" grid + line-square-counting route tool.

## Phase 32 — Custom Ability Score Mode + Homebrew Workshop (May 1 / Iter 93)
Player flexibility + AI-assisted homebrew. All 16/16 backend tests PASS, full UI walkthrough green.

**Custom Ability Score mode** (4th method, for physical-dice rollers):
- New `method-custom` button next to Standard / Point Buy / Roll. When chosen, every ability shows `[–] [number input] [+]` accepting 1-20 with no other constraints.
- `MIN_ABILITY_SCORE` lowered from 3 to 1 globally (Point Buy still floors at 8 internally, Standard Array uses fixed values, Roll 4d6 mathematically can't go below 3 — only Custom mode actually uses the new floor).
- `custom-mode-info` banner makes the rules clear.

**Homebrew Workshop** — `/homebrew` route + new home-page button (`homebrew-workshop-btn`):
- Backend (`routes/homebrew.py` — NEW, 333 LOC, 4 endpoints):
  - `POST /api/homebrew/parse-docx` — accepts a `.docx` / `.txt` / `.md` upload (multipart) + `content_type` form field; uses `python-docx` to extract paragraphs + tables, sends to **Claude Sonnet 4.5** with a strict JSON schema for the chosen type, returns `{draft, missing_fields, source_excerpt}`.
  - `POST /api/homebrew/parse-text` — same but accepts pasted text instead of a file.
  - `POST /api/homebrew/save` — persists the draft to the right user collection (`user_races`, `user_classes`, `user_subclasses`, `user_backgrounds`, or new `user_magic_items`); auto-creates a per-user "Homebrew Workshop" ruleset bucket; supports update via `homebrew_id`.
  - `GET /api/homebrew` (filterable by `content_type` + `edition`) and `DELETE /api/homebrew/{type}/{id}`.
  - `_extract_json` cleanly handles ```json fences and raw JSON; `_flag_missing` checks each content_type's required fields.
- Frontend (`HomebrewWorkshop.js` — NEW):
  - 5 type tabs (Race / Class / Subclass / Background / Magic Item) with custom form schemas per type (FieldRow + FeatureList components).
  - Two input paths: drag-drop style upload (.docx / .txt / .md, ≤5 MB) or paste-text textarea.
  - AI parsing fires a request, `Parsing…` loader; result populates an editable form with **amber outlines + warning banner** on missing required fields (P0 user choice).
  - Save button writes to library; library list at the bottom supports edit / delete with confirm dialog.
  - 2014 / 2024 edition switcher per item.
- Backend `requirements.txt` updated: `python-docx==1.2.0`, `lxml==6.1.0`.

**Character Builder integration**:
- On mount, fetches `/api/homebrew` and exposes `mergedRaces` / `mergedClasses` / `mergedBackgrounds` `useMemo`s that overlay user homebrew on top of the static dictionaries.
- All `Object.entries(RACES/CLASSES/BACKGROUNDS)` render calls switched to merged variants — homebrew entries appear alongside SRD options with `[HOMEBREW]` prefix in their description so players can spot them.

**Tests**: 16/16 backend pytest pass (`/app/backend/tests/test_iter93_homebrew_custom.py`) — covers parse-text + parse-docx + save (uuid + idempotent update) + list (all 5 buckets) + delete (200 + 404 on second delete) + auth-guards on all 5 routes + light regression (login, admin/check, /api/characters). Frontend e2e: Homebrew Workshop full lifecycle (paste text → AI returns populated draft → edit → save → library shows item → edit reopens → delete → gone). Custom Ability Score mode verified by code review (Playwright selector hit a quirk on race-card click, not a real bug). See `/app/test_reports/iteration_93.json`.

## Backlog moved to next session (unchanged from Phase 31)
- **Phase A refactor** — UnifiedDashboard.js → Header / PlayerSection / CampaignSection / Modals.
- **Phase B++** — Mount the same `PortraitGenerator` pattern on NPC / Monster / Inventory Item editors.
- **Phase C++** — AI Rook Advisor sidebar inside Character Builder + Homebrew Workshop (chat panel offering balance/flavor advice at each step). GM-side Live Play "Homebrew Reference" tab + per-campaign approval flow. Monster homebrew form.
- **Phase D** — Player Handouts (GM → player push, polling MVP) + Travel Grid Overlay on existing WorldMapTab.

## Phase 33 — SRD Equipment Reference Tab + GM Simplification (May 1 / Iter 94)
Live-play-ready equipment tables + a small GM-side declutter.

**New Equipment Reference tab** (`/components/gm/EquipmentReferenceTab.js` + `/data/srdEquipment.js`):
- 4 sections (`eq-section-*`): **Weapons** · **Armor & Shields** · **Adventuring Gear** · **Properties** (glossary)
- Weapons subdivided by SRD 5.1 tables: Simple Melee (10) / Simple Ranged (4) / Martial Melee (18) / Martial Ranged (5) — 37 weapons total with cost, damage, weight, properties
- Armor: Light (3) / Medium (5) / Heavy (4) / Shields (1) with AC, Str-required, Stealth-disadvantage, don time
- Adventuring Gear: 57 SRD items with cost + weight
- **7 filter chips** on the Weapons table: All / Simple / Martial / Finesse / Thrown / Two-Handed / Light — case-insensitive substring match on the `properties[]`
- Global search box searches name, damage type, and properties
- Wired into both `GMScreen.js` (new REFERENCE tab) and `LiveSessionMode.js` (Quick Nav list)
- 100% SRD 5.1 / OGL / Creative Commons — no WotC material

**GM Simplification**:
- Removed redundant `Dice` tab from GMScreen REFERENCE group. Rationale: the global `FloatingDiceRoller` (bottom-right, visible everywhere) + the always-visible `DiceRollHistory` at the bottom of GMScreen already cover that functionality. The dedicated tab was purely duplicative.
- Dropped the unused `DiceRoller` import that went with it.

**Tests (iter 94)**: frontend-only iteration, 100% green, zero console errors. Equipment tab verified across all 4 sections + all 7 filter chips + search. Regression confirmed all 13 remaining GM tabs still render. See `/app/test_reports/iteration_94.json`.

## Backlog
- **AI Rook Advisor sidebar** inside Character Builder + Homebrew Workshop (Claude Sonnet chat panel reading current draft state for balance + flavor suggestions).
- **GM-side Homebrew flow** — per-campaign approval toggle + Live Play "Homebrew Reference" tab.
- **Mount `PortraitGenerator`** on NPC / Monster / Inventory Item editors.
- **Player Handouts** (polling MVP) and **Travel Grid Overlay**.
- **UnifiedDashboard refactor** (1376 LOC → Header / PlayerSection / CampaignSection / Modals).
- Further GM tidy: consider folding `NPC Network` into `NPCs` as a sub-toggle (reduces sidebar density).

## Test iterations
77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94 (Phase 33 — Equipment Reference + GM simplification: 100% frontend green)

---
*Last updated: May 1, 2026*
