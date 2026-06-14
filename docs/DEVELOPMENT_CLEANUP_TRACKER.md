# Development Cleanup Tracker

This document tracks the current cleanup direction for Rookie Quest Keeper so future AI/code helpers keep the same product direction and do not repeat old mistakes.

## Product direction

Rookie Quest Keeper is a tabletop RPG campaign companion for GMs and players.

Core flow:

1. Visitor lands on the public landing page.
2. User signs up or logs in through the auth page.
3. Logged-in user lands on the unified dashboard.
4. Player side lets users create/open characters.
5. GM side lets users create/open campaigns.
6. Campaign dashboard gives access to campaign management tools.
7. GM screen gives live running tools for sessions.
8. Player campaign view gives player-safe campaign access.
9. Combat, notes, maps, locations, inventories, uploads, and Rook text helpers support play.

## AI policy

Rook remains a text-based helper.

Allowed Rook uses:

- session notes
- session recaps
- NPC text
- location text
- item descriptions
- campaign prep
- lore expansion
- note parsing
- rules-safe summaries
- homebrew drafting
- text handouts

Not allowed:

- AI image generation
- AI portraits
- AI tokens
- AI maps
- AI item art
- AI monster art
- AI scene backdrops

Manual uploads are allowed for images and files. AI image generation should not be reintroduced.

## Current design direction

Use the charcoal, red, and white design system:

- charcoal/dark grey panels
- red accents
- white primary text
- muted grey secondary text
- sharp or minimally rounded panels
- minimalist box layout
- avoid old fantasy gold/navy/purple styling

Avoid drifting back to:

- gold-heavy UI
- blue/cyan neon UI
- purple gradients
- highly rounded cards
- mixed legacy colours

## Recently cleaned files

These files have been updated recently and should be treated as closer to the target direction:

- `frontend/src/components/AuthPage.js`
- `frontend/src/components/ReviewModal.js`
- `frontend/src/components/AccountSettings.js`
- `frontend/src/components/JoinCampaignModal.js`
- `frontend/src/components/ImageUploadPanel.js`
- `frontend/src/components/SessionRecapAI.js`
- `frontend/src/components/SmartNoteParser.js`
- `frontend/src/components/RookFormFillPanel.js`
- `frontend/src/components/builder/PortraitGenerator.js`
- `frontend/src/components/tabs/HandoutsTab.js`
- `frontend/src/components/tabs/InGameNotesTab.js`
- `frontend/src/components/tabs/ItemCreatorTab.js`
- `frontend/src/components/tabs/PlayerNotesTab.js`
- `frontend/src/components/tabs/PrivatePlaytestPacksTab.js`
- `frontend/src/components/clean-sheet/CleanNotesTab.js`
- `frontend/src/components/gm/AISessionPlanner.js`
- `frontend/src/components/gm/EnvironmentControl.js`
- `frontend/src/components/gm/NotesTab.js`
- `frontend/src/components/gm/UploadTab.js`
- `backend/routes/handouts.py`

## Backend/data safety work already started

- `backend/tests/test_campaign_permissions.py` was added as integration coverage for campaign ownership and custom-rule access boundaries.
- `docs/AI_SAFE_RULES.md` clarifies text AI is allowed and image AI is not allowed.
- Private playtest pack import now has validation, structured error details, and a client-side JSON size guard.
- Handout sharing now includes GM-controlled re-share settings across backend delivery records and frontend UI.
- In-game notes can update campaign tabs and now show note-level update feedback.

## Current flow audit notes

### Main route flow

`frontend/src/App.js` currently has a sensible top-level flow:

- `/` shows landing page for logged-out users and redirects logged-in users to `/home`.
- `/auth` and `/login` show auth for logged-out users and redirect logged-in users to `/home`.
- `/home` shows the unified dashboard behind auth.
- character creation routes are behind auth.
- character sheet routes are behind auth.
- campaign routes are behind auth.
- GM screen routes are behind auth.
- combat route is behind auth.
- account route is behind auth.
- admin route checks both authentication and admin status.
- reset-password remains available without the normal auth redirect.

### Dashboard flow

`frontend/src/components/UnifiedDashboard.js` is currently a major flow hub.

It controls:

- character list
- campaign list
- character creation entry
- campaign creation modal
- campaign deletion
- character deletion
- review prompt/modal
- admin button
- account button
- logout
- homebrew workshop entry
- ruleset JSON upload
- source index panel

This file should be cleaned carefully in smaller passes, not as one giant rewrite.

Recommended UnifiedDashboard cleanup order:

1. Keep all existing route targets unchanged.
2. Replace the local review modal with `ReviewModal.js`, or remove the unused `ReviewModal.js` if the local modal is intentionally kept.
3. Check create campaign still navigates to `/campaign/:campaignId`.
4. Check character cards still navigate to `/characters/:characterId`.
5. Check admin button still routes to `/admin` only for admins.
6. Check account button still routes to `/account`.
7. Check logout clears auth and returns the user to a logged-out state.
8. Avoid mixing big dashboard layout changes with data/API changes.

## API client cleanup status

Code search now only finds direct `axios` imports in the shared `frontend/src/lib/apiClient.js` wrapper and documentation references. New frontend API work should continue using `apiClient` so auth headers, timeouts, 401 handling, and formatted error details stay consistent.

## Recommended next small cleanup passes

Prefer one focused PR at a time:

1. Improve remaining toast/catch blocks so they prefer `error.formattedDetail` before raw backend details.
2. Remove or update stale docs that still refer to old AI-image flows.
3. Add focused tests around handout sharing, private playtest imports, and note-to-tab updates.
4. Split any large dashboard or character-sheet UI polish into tiny visual-only PRs.
