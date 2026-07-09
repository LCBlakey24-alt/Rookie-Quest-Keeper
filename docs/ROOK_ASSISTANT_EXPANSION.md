# ROOK Assistant Expansion

ROOK is intended to become the always-available helper inside Rookie Quest Keeper: part player coach, part Co-GM, part homebrew editor, part app guide.

## Current implementation

- `frontend/src/components/RookGlobalAssistant.js` mounts a global floating assistant for authenticated users.
- `frontend/src/components/RookGlobalAssistant.js` also fetches the active character on `/characters/:characterId` and `/characters/:characterId/edit`, then feeds a concise sheet summary into Rook's system context.
- `frontend/src/data/rookAssistantKnowledge.js` provides page-aware assistant modes, starter prompts, quick suggestion chips, original name banks, place banks, GM moves, adventure hooks, player reminders, and homebrew checks.
- `frontend/src/styles/rookAssistant.css` gives ROOK a polished floating panel, compact pill state, loaded-context badge, and mobile-friendly layout.
- `frontend/src/App.js` mounts ROOK across authenticated pages, including pages that are not wrapped by the normal app shell.
- `frontend/src/components/app/AppShell.js` exposes an Ask Rook shortcut in the desktop rail and mobile More tools panel.
- `frontend/src/data/rookAssistantKnowledge.test.js` covers route mode detection, campaign ID extraction, starter prompts, micro suggestion chips, and context construction.
- Backend chat still flows through the existing `/rook/chat` endpoint, which already combines request context, campaign context, campaign edition rules, and the existing AI source boundary.

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
- Stay spoiler-safe on player-facing screens.
- Create original content rather than borrowing named third-party lore.
- Prefer table-ready answers over theory, especially in live play.
- Help newer players without talking down to them.
- Suggest importable, field-ready copy for homebrew and campaign content.

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

1. Add backend-side ROOK brain fragments so `/rook/generate`, `/rook/form-fill`, and any future Rook endpoint share the same source of truth even when called from older components.
2. Add campaign-dashboard data hydration so Rook can see a concise campaign snapshot before the user asks.
3. Add Rook panels inside key forms: NPCs, locations, gods, custom creatures, homebrew feats, homebrew classes, and session notes.
4. Add import actions where safe: "Send this to NPC form", "Turn this into a location", "Create a session checklist", "Save as campaign note".
5. Build a campaign knowledge index that summarises NPCs, locations, gods, player characters, notes, homebrew, and unresolved threads for ROOK.
6. Add admin-facing telemetry for which Rook starters are used most, which fail, and where users ask for help most often.
7. Add component-level render tests for the floating assistant and `/rook/chat` payload shape.

## Rough priority

1. Stabilise the global assistant UI.
2. Make Rook smarter on campaign dashboards.
3. Add Rook form-fill everywhere content is created.
4. Add save/import actions from Rook responses.
5. Add backend shared brain and campaign knowledge indexing.
