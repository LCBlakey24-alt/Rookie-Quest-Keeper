# Known Issues and Technical Debt

This file tracks issues that should be fixed before larger feature work continues.

## High priority

### Character save paths need consolidation

The app has both a strict PUT character update route and a lenient PATCH route. This was useful for fixing failed character-sheet saves, but the frontend should consistently use PATCH for live sheet state and reserve PUT for full edit-mode updates.

Risk if ignored: HP, spell slots, notes, portraits, conditions, or inventory can fail to save when a frontend component sends fields not accepted by the strict model.

### Account deletion may leave orphaned records

The current account deletion route must be kept in sync with every user-owned and campaign-owned collection. It should delete or anonymise all associated user data, including characters, campaigns, content, uploads, homebrew, reset tokens, and invites.

Risk if ignored: deleted accounts leave data in MongoDB, causing privacy and maintenance problems.

### Rate limits are missing or incomplete

Login, register, forgot-password, AI generation, and file parsing need basic throttling.

Risk if ignored: brute-force login attempts, reset-email abuse, and accidental AI budget burn.

### Mobile sheet integration needs verification

A mobile sheet layout exists in the repo history, but it must be verified against the active character sheet route.

Risk if ignored: phone users may still get cramped desktop-style sheets.

## Medium priority

### Large frontend components

Several components are large enough to slow development and make bugs harder to isolate. Refactor carefully without changing UI behaviour.

Priority candidates:

- `UnifiedDashboard.js`
- active character sheet file/components
- `GMScreen.js`
- `CombatPage.js`

### Heavy inline styles

Many components define style objects inside render functions. This makes re-renders noisier and visual consistency harder.

Fix gradually by extracting repeated styles into constants or CSS classes.

### WebSocket message validation

The WebSocket handler accepts known message types but also broadcasts unknown message types with raw data.

Risk if ignored: harder debugging and potential misuse as the app grows.

### AI usage controls

`check_ai_access` currently allows all AI calls while limits are paused. Before public launch, add usage counters and admin-visible usage tracking.

## Lower priority

### README and docs drift

Docs now exist, but they must be kept current whenever architecture changes.

### Test coverage gaps

Backend has several iteration-specific tests, but core flows should be consolidated into stable regression suites:

- Auth
- Character creation
- Character live saves
- Level-up
- Campaign creation
- GM screen basics
- Combat persistence
- Homebrew parsing/save
- Account deletion cleanup

### Design token consistency

Dark navy and gold are the intended visual direction. Some older components may still have leftover gradients, non-gold accents, or inconsistent spacing.

## Do not do casually

- Do not rewrite the whole frontend at once.
- Do not replace the working character builder in one large edit.
- Do not remove old backend routes until the frontend has definitely migrated away from them.
- Do not add protected publisher rules text into the codebase.
- Do not reintroduce AI image generation; use manual upload support for portraits, maps, items, and other visuals.
