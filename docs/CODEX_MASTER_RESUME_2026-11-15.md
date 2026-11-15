# CODEX MASTER RESUME — ROOKIE QUEST KEEPER
**Owner handoff prepared 15 November 2026. Use this as an instruction to resume meaningful engineering work; verify current repository state before acting.**

You are working in **LCBlakey24-alt/Rookie-Quest-Keeper**. Resume from the actual current main branch, existing branches and open PRs rather than starting a parallel implementation or inventing completed work. Work as far as possible autonomously in small reviewable batches. The owner wants us to finish existing work, fix bugs and make progress toward the documented product roadmap, not just write more plans.

## 1. Read current sources of truth BEFORE modifying code

- AGENTS.md and the actual CI/workflow definitions.
- docs/DESIGN_SYSTEM.md for the approved **Dusk Sky / Neon Coast** identity (deep navy/dusk purple, pink-violet-blue outlines, warm selected accent, Cinzel headings/Inter text). Follow the current site implementation rather than outdated charcoal/red/gold references in older issues.
- docs/ROOKIE_QUEST_PRODUCT_ROADMAP.md (eight staged product phases, including current reliability-first priority).
- docs/CHARACTER_PDF_EXPORT_HANDOFF.md.
- **design/character-sheet-v7/HANDOFF.md** and every file it links. The full **real** Version 7 PDFs, source and original supplied logo have been committed in this folder; do not use outdated chatbot attachments or V6 mockups as the source of truth.
- Open tracking issues: #238 (launch stability), #439 (product blueprint), #905 (future ideas), #906 (PDF), #907 (spell loadouts), #908 (level-up hex wheel), #909 (future membership), #910 (creator collaborations). Review the current issue discussions and actual main branch; old backlog notes are not proof a feature remains broken.
- Run git status, inspect the current main commit, all open PRs, branch freshness, conflicts, CI and deployment statuses. Never trust an older green badge after rebasing.

## 2. Open PRs — REVIEW, REPAIR, TEST, THEN MERGE WHEN SAFE

At this checkpoint GitHub reported **six open PRs**, all **draft**:
- **#880 — privacy/legal/AI consent/global launch foundations** (25 files; overlaps #886 in auth/signup, #797 in app/webworkflows). Review secure consent gating across ALL third-party AI routes, optional analytics opt-out and recording removal, account deletion, private data export, public notices. No false claim of worldwide legal compliance; public privacy/terms wording requires actual operator and appropriate counsel review. Resolve conflicts and run backend+frontend privacy tests before any merge.
- **#886 — new-account 18+ age declaration for password/Google registration** (16 files; conflicts with #880 in backend/routes/auth.py, frontend AuthPage and build workflow). This is a **product/policy decision**, not merely styling. Review impacts on younger players, existing accounts and safeguarding. Never silently impose a permanent age-policy or exclude users without owner approval/legal review. If owner confirms age-gate policy, enforce it server-side for all new-account paths, keep existing accounts safe, test and merge after reconciling #880. If owner has not approved, leave draft and record the decision.
- **#879 — Admin Command Centre / verified account directory** (8 files; overlaps #797 in backend admin and user-tab files). Verify permissions on the SERVER, restrict account directory to authorised admins, prevent role/identity spoofing and cross-account data leaks. Preserve mobile/tabs and check normal member access is denied. Resolve conflicts, run tests, then merge if clean.
- **#876 — Universal Word campaign workbook import** (10 files). Verify well-structured DOCX template, NPCs with full usable stats, locations, quests, factions and calendar. Offer preview/dry-run, choose new vs existing campaign, append/merge safely, reject malformed/oversize archives, duplicate IDs, unsafe content, partial writes and cross-tenant imports. Keep imported content owned by the requesting user. Test realistic Word files before merging.
- **#797 — Encounter Builder / maps / player display integration** (103 files, particularly broad and old). Important owner vision: Start saved encounter in Live Play → dramatic but accessible Battle Starting signal on external player display → load linked saved battle map (fallback generic grass/sand/dirt/stone/cobbles) → GM/player views, visible safe tokens, initiative, HP, combined tracker+map, and a correct save/review lifecycle. Review ALL 103 files, security changes and embedded Tiacarta/TiaKarta data; **never seed the owner's private campaign into other accounts**. This PR overlaps #879/#880 and touches core auth/offline/GM/character paths. Split or transplant into smaller focused PRs if full merge is risky; do not force-merge it just to clear the queue.
- **#911 — editable character PDF export data mapper** (7 files). This is **V6-only draft code** assuming 7 pages / 422 fields; it is **incompatible with the archived V7 PDFs**. See section 3 below. Update the mapper/form writer and test with actual PDFs before making it ready. Do not merge as-is.

CI had previously passed on several draft heads, but many PRs were **not mergeable** against current main. Green status on an older SHA is not permission to merge. Compare changed files and identify cross-PR conflicts, especially #880↔#886 (auth), #879↔#797 (admin), and #797↔#880 (App/workflows). Rebase/port against current main as needed. Follow this cycle one coherent PR at a time: inspect diff → validate owner/product requirements → fix conflicts → run focused tests, full Build Check, Character Audit, Homebrew Regression, backend security/isolation tests and responsive browser smoke as applicable → check preview and user workflows → merge only after required checks and review. Never force merge or turn off protection. Log merged PR links, remaining blockers and decisions.

## 3. Highest-value feature to finish next: V7 printable/fillable character PDF (#906 / #911)

**Do not redesign the whole PDF again.** The owner has already approved the broad visual layout. Exact V7 source files are now in **design/character-sheet-v7/** on main, including four eight-page A4 editable AcroForm PDFs (2014/2024 x colour/black-and-white), exact official colour/greyscale badge, 2014/2024 504-field JSON field maps, generator scripts, play-table QA and 2024 filled demo.

The current V7 page organization is:
1. Character/play page: identity, all six abilities + modifiers + saving throws, 18 skills/proficiencies, AC, initiative, **base** speed, PB, inspiration, passive Perception/Insight, spell DC/attack, HP/max/temp, Hit Dice type/remaining/total, death saves, exhaustion hexes 1–6, active conditions, five quick attack rows, concentration/defences.
2. Dedicated **Actions (6), Bonus Actions (4), Reactions (4)** and quick resource tracker (3); there must NOT be tiny actions/bonus/reactions cluttering page 1.
3. Expanded attacks (10), resources (6), resistances/immunities/vulnerabilities, senses, passive Investigation, mixed multiclass Hit Dice, defensive notes.
4. Spellcasting and 24 spell rows, slots 1–9, separate Pact Magic/concentration.
5. Inventory (17), currency, attunement/storage.
6. Features, feats, portrait reference, backstory and roleplay.
7. Session journal/quests/notes.
8. Edition-specific exhaustion + conditions quick reference with proper SRD 5.1/5.2.1 CC-BY-4.0 attribution.

**Required engineering work:** Update #911's characterPdfCoreMapper, characterPdfExtendedMapper and characterPdfFormWriter against the **actual V7 field maps** (not just replacing hardcoded 7→8 / 422→504). Include actions.action.*, actions.bonus.*, actions.reaction.*, actions.resources.*, combat.concentration_summary, combat.defences_summary, combat.hit_dice.breakdown, combat.passive_investigation and changed/removed fields. Use existing authoritative combat, inventory, spells, proficiency and rest/edition engines; do not invent a competing formula layer. Ensure the writer checks correct PDF title/version, eight pages, 504 fields and types, and preserves editable AcroForms.

Implement website **Print / Export Character** user flow: allow blank template download and account-authorised filled export, editable vs print-only PDF, edition-specific colour/BW, sensible file naming and A4, with US Letter support as follow-up if not already implemented. Keep print margins and text legible; no overlap/clip/truncation. Additional spells, weapons, features, inventory and long descriptions require dynamically repeated continuation pages, not silent omission or unreadable auto-shrinking. Distinguish known, prepared, always-prepared and spellbook spells; don't confuse Warlock Pact Magic slots with normal slots or mix 2014/2024 rules. Use real attack bonuses and equipment stats. Provide optional authorised portrait if supported. No generic rest-count tracker on page 1; Hit Dice remaining and exhaustion hexagons are required.

**Privacy:** fetch the current character only after server-authorised account/party access; never assume client-provided character ID is safe, never include unpublished GM secrets or another user's data, and never silently sync edits made to a downloaded PDF back to the live account. New accounts start blank, including no owner's Tiacarta campaign. The offline PDF can be modified by users without auto-recalculating rules; current Keeper-derived values must be correct at export time. Include a user-facing note if the PDF does not live-sync to Keeper.

**Library and licensing:** evaluate MIT-licensed pdf-lib for local browser AcroForm filling, including actual PDF-byte tests and embedded licensed Unicode appearance font. Python PyMuPDF used in the archived prototypes is AGPL/commercial dual licensed: treat it as design/QA source, not an unreviewed hosted production dependency. Do not redistribute raw font files. Verify CC-BY SRD source/attribution and all original art/logo rights before commercial sale.

**QA:** four real V7 PDF files exist in GitHub. Their prototype QA found eight pages, 504 unique form widgets, no overlapping widgets/labels and saved form values after reopen. Re-run tests in production toolchain and on Android/iPad/desktop editors; check long spells, level 1 and 20, 2014 vs 2024, multiclass dice, known vs prepared, equipment, free blank download and strict cross-account isolation. Use the actual checked-in V7 field maps. Show working browser preview and downloadable exports before closing #906.

## 4. Continue current live-site reliability and UX fixes

Preserve current working behaviour. Confirm bugs on current main, don't blindly reintroduce old fixes.

- **Account privacy:** clean blank default for new accounts; only the actual owner sees their campaigns, characters, notes, settings, images and personal Tiacarta/Tier Carta data. Admin access must NOT make private admin campaigns public. Preserve proper invite-based permissions and the 5-digit gate where pages expose children's names/locations in the coaching/assessment areas.
- **Character experience:** improve the website's original hex character wheel with point at the top, clockwise numbers up, anticlockwise down, less sensitive rotation, readable labels outside and numbers inside wedges, portrait in upper-right hex, persistent bottom Back wedge, minimal scrolling and responsive Character/Combat/Spells views. Navigation can transform to skills, six abilities, dice and HP; confirm-damage/heal returns wheel to neutral. This is owner design direction; check existing implementation before making changes.
- **Level-up (#908, future spec):** update the outdated-looking HP die roller to current brand, with an edition-aware hex progression wheel. Each step explains newly gained features and required choices, e.g. ASI vs eligible feat; HP options fixed, branded in-app roll or entered physical die; valid previews, centre confirmation, completed cool-to-warm wedges and final celebration ONLY after a successful atomic save. Rook's plain-language explanation and optional funny line must not distort mechanics. Do NOT begin a risky universal rewrite before core character correctness is secure.
- **Spell presets (#907, future spec):** user-named Healing/Power/Defence/Balanced presets, Rook class/edition-valid suggestions, optional consent-based favourite spell recommendations. After a relevant long rest/short rest/level-up, offer **Keep current spells / Review changes** only if an actual rule permits changes. Warlock normally changes a known spell on level-up, NOT merely because Pact Magic slots refresh on a short rest; 2024 Paladin/Ranger may have one-spell rest swap constraints. No silent mass swap or invalid loadout activation.
- **Live Play/map/player display:** battle-start alert (accessible red-glow/reduced-motion option), saved map binding, terrain fallback, automatic roster/initiative as explicitly approved, combined map+tracker and correct GM/player visibility. Resolve player display delivery state before reporting success; protect secret objects and GM notes.
- **Navigation and mobile:** investigate Homebrew left rail collapsing, Open Campaigns submenu overflowing with tabs (prefer dropdown), offline pill covering Start, dice roller controls overlapping, inconsistent page header height, frozen character selection, auth/admin access errors. Verify on phone/PWA and desktop. Remove obsolete Offline tab if current design requires it, without losing offline functionality.
- **Campaign workbook / content:** Word imports for NPCs, locations, quests and configurable calendar fields, with safe preview/new-or-existing campaign selection. Keep the user's private world content private.

## 5. Long-term roadmap: preserve and sequence, do NOT deploy it all now

Use docs/ROOKIE_QUEST_PRODUCT_ROADMAP.md and issues #905–#910 as the authoritative idea backlog:
- Stage 0: security, account separation, reliable saves, stable core game loops and mobile/PWA.
- Stage 1: playable character UX, usable editable/exportable character sheets, correct spells/level-up.
- Stage 2: integrated GM encounters/maps and player displays, safe campaign imports.
- Stage 3: useful Rook explanations and review-first assistance, never silent canon mutation.
- Stage 4: free-first 3D Dice Vault with quality dice physics, readable results, style choice and standard free dice for all. Cosmetics must not affect RNG.
- Stage 5: **possible future affordable optional monthly/yearly membership**. Owner dislikes per-die purchases. A plan could include eligible new dice styles and small future content/cosmetic drops at no extra item-by-item cost. Keep core play, standard dice, security and accessibility free. Prices, entitlement definitions, release cadence, tax, contracts, subscriptions and billing are **NOT approved or live**; don't implement them without commercial/legal and owner signoff.
- Stage 6: Rookie Quest Worlds and Forge: original campaign books/adventures including Tiacarta only as the owner's private project or opted-in product, modular terrain/3D prints and secure cross-product importing.
- Stage 7: distinct original Rookie Quest RPG rules engine plus opt-in community quest/adventure submissions and collaborations. Private by default; rights/licensing, attribution, moderation, reporting/takedowns and payout/revenue share only after explicit owner/legal approval.
No loot boxes, pay-to-win dice, unlicensed artwork/text, forced microtransactions or public user content by default.

## 6. Execution requirements and reporting

Do real work, not endless status narration. First check main and the six PRs; prepare a compact PR risk/merge matrix. Prioritise **privacy/security and broken core play** over monetisation ideas. Use focused branches and regression tests. If independent CI-clean changes can be safely merged, do so one at a time after conflict resolution and current-SHA verification; do **not** force-merge a PR, bypass required approvals, assume green CI on stale heads, or merge a known-incompatible PDF V6 adapter. Defer explicit policy/commercial decisions (18+ gating, billing, public publishing and legal document signoff) for the owner. After each clean merge, refresh main and recheck remaining PRs for drift. Preserve all existing legitimate user data and permissions; no destructive migrations or false empty states. Never mark a delivery successful before the server or browser confirms it.

Keep GitHub issues/docs synchronized with genuine progress, not speculative completion. At the end, report:
1) exact PRs merged (links and checks),
2) exact PRs still blocked and why,
3) actual features/bugs implemented and tested,
4) any necessary owner/legal decisions,
5) next three highest-value actions and links.
Continue as far as available tools/credits permit, and leave a clear resume checkpoint if work must stop.
