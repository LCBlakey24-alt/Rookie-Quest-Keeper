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
- `frontend/src/components/tabs/InGameNotesTab.js`
- `frontend/src/components/tabs/ItemCreatorTab.js`
- `frontend/src/components/tabs/PlayerNotesTab.js`
- `frontend/src/components/clean-sheet/CleanNotesTab.js`
- `frontend/src/components/gm/AISessionPlanner.js`
- `frontend/src/components/gm/EnvironmentControl.js`
- `frontend/src/components/gm/NotesTab.js`
- `frontend/src/components/gm/UploadTab.js`

## Backend/data safety work already started

- `backend/tests/test_campaign_permissions.py` was added as integration coverage for campaign ownership and custom-rule access boundaries.
- `docs/AI_SAFE_RULES.md` clarifies text AI is allowed and image AI is not allowed.

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

This file still uses raw `axios` and contains several local UI flows. It should be cleaned carefully in smaller passes, not as one giant rewrite.

Recommended UnifiedDashboard cleanup order:

1. Convert `axios` import/API constant to `apiClient`.
2. Keep all existing route targets unchanged.
3. Replace the local review modal with `ReviewModal.js`, or remove the unused `ReviewModal.js` if the local modal is intentionally kept.
4. Check create campaign still navigates to `/campaign/:campaignId`.
5. Check character cards still navigate to `/characters/:characterId`.
6. Check admin button still routes to `/admin` only for admins.
7. Check account button still routes to `/account`.
8. Check logout clears auth and returns the user to a logged-out state.

## Files still using raw axios

These still need conversion to `apiClient`, preferably in small batches:

- `frontend/src/components/UnifiedDashboard.js`
- `frontend/src/components/CampaignDashboard.js`
- `frontend/src/components/GMScreen.js`
- `frontend/src/components/CombatPage.js`
- `frontend/src/components/MobilePlayerCampaignView.js`
- `frontend/src/components/BasicCharacterBuilder.js`
- `frontend/src/components/PremadeCharacterBuilder.js`
- `frontend/src/components/LevelUpWizard.js`
- `frontend/src/components/CharacterSheetFull.js`
- `frontend/src/components/CharacterSpellbook.js`
- `frontend/src/components/CharacterInventory.js`
- `frontend/src/components/PartyInventory.js`
- `frontend/src/components/PlayerPartyLoot.js`
- `frontend/src/components/PlayerProgressionDashboard.js`
- `frontend/src/components/PartyLocationTracker.js`
- `frontend/src/components/NPCCombatRecruiter.js`
- `frontend/src/components/NPCRelationshipWeb.js`
- `frontend/src/components/NPCQuickReference.js`
- `frontend/src/components/QuickCombatModal.js`
- `frontend/src/components/CustomCreatureManager.js`
- `frontend/src/components/CombatTokenGenerator.js`
- `frontend/src/components/MapBuilder/MapBuilder.js`
- `frontend/src/components/gm/EventSystem.js`
- `frontend/src/components/gm/SendItemPanel.js`
- `frontend/src/components/gm/SmartSessionLog.js`
- `frontend/src/components/tabs/MapsTab.js`
- `frontend/src/components/tabs/WorldBuilderTab.js`
- `frontend/src/components/tabs/LocationsTab.js`
- `frontend/src/components/tabs/NPCsTab.js`
- `frontend/src/components/tabs/LocalMapTab.js`
- `frontend/src/components/tabs/GodsTab.js`
- `frontend/src/components/tabs/EncounterGeneratorTab.js`
- `frontend/src/components/tabs/PartyInventoryTab.js`
- `frontend/src/components/tabs/CombatCreatorTab.js`
- `frontend/src/components/tabs/CalendarTab.js`
- `frontend/src/components/tabs/NotesTab.js`
- `frontend/src/components/tabs/WorldMapTab.js`
- `frontend/src/components/tabs/CampaignSettingTab.js`
- `frontend/src/components/SessionJournal.js`
- `frontend/src/components/SessionTimeline.js`
- `frontend/src/components/RuleSystemManager.js`

`frontend/src/lib/apiClient.js` correctly imports axios because it is the shared API wrapper.

## Risky files: patch in small sections only

Do not full-rewrite these unless absolutely necessary:

- `frontend/src/components/PartyInventory.js`
- `frontend/src/components/CombatPage.js`
- `frontend/src/components/GMScreen.js`
- `frontend/src/components/CampaignDashboard.js`
- `frontend/src/components/CalendarTab.js`
- `frontend/src/components/SessionTimeline.js`
- `frontend/src/components/SessionJournal.js`
- `frontend/src/components/RuleSystemManager.js`
- `frontend/src/components/CharacterSheetFull.js`

Reason: these files are large, feature-dense, and more likely to break during full-file replacement.

## Image-generation cleanup status

Current state:

- `ImageUploadPanel.js` is the correct upload-only component.
- The deprecated `AIImageGeneratorPanel.js` compatibility wrapper has been removed.
- Active UI must use manual image upload components only.
- No frontend component should mention generating AI images or send image-generation payloads.

## Recommended next mini-sprints

### Sprint A: dashboard flow cleanup

- Convert `UnifiedDashboard.js` to `apiClient`.
- Keep navigation behaviour identical.
- Do not redesign the whole dashboard in the same commit.
- Check Vercel after the commit.

### Sprint B: safe tab API cleanup

Convert one at a time:

1. `MapsTab.js`
2. `WorldBuilderTab.js`
3. `LocationsTab.js`
4. `CampaignSettingTab.js`
5. `GodsTab.js`

Check Vercel after each file.

### Sprint C: old-theme pockets

Search and remove old theme drift:

- `#D4A017`
- `#F59E0B`
- `#8A2BE2`
- `#4DD0E1`
- `#06B6D4`
- `#3B82F6`
- `#8B5CF6`
- `#14304F`
- `#0A1628`
- `gold-text`
- `parchment-dark`

Patch small sections at a time.

### Sprint D: real upload flow

`UploadTab.js` currently simulates uploads. Future work should decide whether uploads should be:

- stored in backend/database
- stored in object storage
- scoped per campaign
- removable by the campaign owner
- usable by maps/portraits/documents/audio tools

The UI should clearly communicate manual upload behaviour and should not imply AI image generation.

## Flow checklist for every future change

Before merging a change, check:

1. Can a logged-out user reach landing and auth?
2. Can a logged-in user reach `/home`?
3. Can a user create/open a character?
4. Can a user create/open a campaign?
5. Can GM tools open from the campaign flow?
6. Can player campaign view still open safely?
7. Does mobile routing still make sense?
8. Are auth tokens handled through `apiClient`?
9. Is Rook described as text-only?
10. Is there no AI image-generation UI or behaviour?
11. Does Vercel pass?
