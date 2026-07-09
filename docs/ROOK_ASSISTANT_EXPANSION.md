# ROOK Assistant Expansion

ROOK is intended to become the always-available helper inside Rookie Quest Keeper: part player coach, part Co-GM, part homebrew editor, part app guide.

## Current implementation

- `frontend/src/components/RookGlobalAssistant.js` mounts a global floating assistant for authenticated users and now delegates route/context hydration to a dedicated helper instead of keeping all logic in the UI component.
- `frontend/src/data/rookContextHydration.js` normalises Rook route context, detects player-facing campaign routes, extracts real character IDs while ignoring `/characters/create`, summarises character sheets, summarises GM/player-safe campaign context, and builds the loaded-context badge text.
- `frontend/src/components/RookGlobalAssistant.js` fetches the active character on `/characters/:characterId` and `/characters/:characterId/edit`, then feeds a concise sheet summary into Rook's system context.
- `frontend/src/components/RookGlobalAssistant.js` fetches campaign context when a campaign ID is present in the route. GM-facing routes can include campaign metadata, setting notes, GM rules, current table environment, and custom-rule upload names. Player-facing display routes only receive spoiler-safe campaign/environment context.
- `frontend/src/data/rookAssistantKnowledge.js` provides page-aware assistant modes, starter prompts, quick suggestion chips, route playbooks, original name banks, place banks, GM moves, adventure hooks, player reminders, and homebrew checks.
- `frontend/src/styles/rookAssistant.css` gives ROOK a polished floating panel, compact pill state, loaded-context badge, route playbook card, and mobile-friendly layout.
- `frontend/src/App.js` mounts ROOK across authenticated pages, including pages that are not wrapped by the normal app shell.
- `frontend/src/components/app/AppShell.js` exposes an Ask Rook shortcut in the desktop rail and mobile More tools panel.
- `frontend/src/components/RookFormFillPanel.js` powers review-first AI drafting for forms that should not immediately auto-save content.
- `frontend/src/components/tabs/NPCsTab.js` now uses `RookFormFillPanel` inside the add/edit NPC dialogs, while keeping the existing fast auto-save ROOK generator in the side panel.
- `frontend/src/components/tabs/LocationsTab.js` now uses `RookFormFillPanel` inside both location and place-of-interest dialogs, while keeping the existing instant Rook location/place generator in the side panel.
- `frontend/src/components/tabs/HandoutsTab.js` uses `RookFormFillPanel` for lore, clue, secret, letter, and handout drafts.
- `backend/utils/rook_brain.py` provides a dependency-free backend prompt fragment for shared ROOK identity, behaviour rules, player-safe rules, JSON-only rules, and original quick banks.
- `frontend/src/data/rookAssistantKnowledge.test.js` covers route mode detection, campaign ID extraction, starter prompts, micro suggestion chips, and context construction.
- `frontend/src/data/rookContextHydration.test.js` covers character/campaign context summaries, player-safe context filtering, player-facing endpoint skipping, context badges, and the `/characters/create` guard.
- `backend/tests/test_rook_brain.py` covers the shared backend ROOK brain fragments.
- Backend chat still flows through the existing `/rook/chat` endpoint, which already combines request context, campaign context, campaign edition rules, and the existing AI source boundary. The shared backend brain helper is ready to wire into `/rook/chat`, `/rook/generate`, and `/rook/form-fill` in a safer focused edit.

## Assistant modes

ROOK adapts by route:

- Dashboard Guide: next steps, app overview, workspace guidance.
- Character Builder Coach: character concepts, rules explanations, names, flaws, backstories.
- Player Sheet Helper: turn options, sheet reading, combat reminders, roleplay help.
- Campaign Launcher: campaign concepts, session zero, invites, tone setup.
- Campaign Co-GM: campaign prep, NPCs, locations, factions, gods, story hooks.
- Live Play Co-GM: fast tactical answers, boxed text, rulings, complications.
- Player-Facing Helper: spoiler-safe descriptions, recaps, reminders, table text.
- Homebrew Workshop Assistant: balance checks, field-ready wording, import cleanup.
- Upload & Import Assistant: clean messy notes, sort content, prepare structured data.
- Admin QA Assistant: feedback triage, bug reports, release notes, priorities.
- Account Helper: plain-English support and settings help.

## Design rules

ROOK should:

- Be visible and reachable everywhere once the user is authenticated.
- Use saved campaign context when a campaign ID can be inferred from the route.
- Use the current character sheet as the first source when helping on character sheet pages.
- Never try to fetch `/characters/create` or `/characters/new` as if they were real character sheets.
- Stay spoiler-safe on player-facing screens.
- Create original content rather than borrowing named third-party lore.
- Prefer table-ready answers over theory, especially in live play.
- Help newer players without talking down to them.
- Suggest importable, field-ready copy for homebrew and campaign content.
- Prefer review-first form drafting for editable records; reserve instant auto-save generation for explicit one-click creation flows.

## Campaign context rules

GM-facing campaign routes may include:

- Campaign name, system, rules edition, world/tone labels, available classes, and max level.
- Saved campaign setting notes.
- GM-only rules or prep notes.
- Current shared table environment: location, weather, lighting, mood, and environment notes.
- Uploaded/custom rule names and counts, but not full uploaded rule bodies.

Player-facing routes may include:

- Campaign name/system if available.
- Shared table environment and reveal-safe environment notes.
- Uploaded/custom rule names and counts when the user has membership access.

Player-facing routes must not include GM-only notes, hidden prep, private setting text, unrevealed NPC motives, unrevealed secrets, or anything intended only for the GM.

## Knowledge pack principles

The knowledge pack deliberately contains original material only:

- Fantasy names by broad ancestry or role.
- Orphan and urchin names for quick NPC generation.
- Taverns, shops, and settlement names.
- GM moves for improvisation.
- Adventure hooks.
- Player-help reminders.
- Homebrew wording checks.

This keeps ROOK useful even when campaign context is thin while avoiding protected setting lore.

## Next upgrades

1. Wire `backend/utils/rook_brain.py` into `/rook/chat`, `/rook/generate`, and `/rook/form-fill` so all backend Rook calls share one source of truth.
2. Add a campaign knowledge index that summarises NPCs, locations, gods, player characters, notes, homebrew, and unresolved threads for ROOK.
3. Add Rook panels inside key forms: gods, custom creatures, homebrew feats, homebrew classes, and session notes.
4. Add import actions where safe: "Send this to NPC form", "Turn this into a location", "Create a session checklist", "Save as campaign note".
5. Add admin-facing telemetry for which Rook starters are used most, which fail, and where users ask for help most often.
6. Add component-level render tests for the floating assistant and `/rook/chat` payload shape.

## Rough priority

1. Stabilise the global assistant UI.
2. Wire backend Rook routes to the shared Rook brain.
3. Add campaign knowledge indexing.
4. Add Rook form-fill to the remaining content creation forms.
5. Add save/import actions from Rook responses.
