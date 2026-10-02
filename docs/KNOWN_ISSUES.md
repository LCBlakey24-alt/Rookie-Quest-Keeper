# Known Issues and Technical Debt

This file tracks current risks that still deserve work. Fixed items should not remain written as if they are still broken.

## High priority

### Account-deletion coverage must stay current

Account deletion now sweeps campaign-owned data and covers the current user-owned collections, including newer user NPC, monster, custom-rule, feedback, and legacy player records. Regression coverage protects the current collection list.

Remaining risk: a future user-owned collection could be added without being registered in deletion coverage. Prefer shared ownership metadata or a central collection registry over repeatedly growing hand-written lists.

### Character-save regression coverage

The active character sheet, combat flows, notes, inventory, profile editor, and current builder use the lenient character PATCH path for live/editable state. Keep the strict replacement route only for flows that intentionally replace a complete record.

Remaining work: expand stable regression coverage for HP, temp HP, death saves, conditions, exhaustion, spell slots, notes, inventory, portrait, personality fields, and offline combat replay.

### Mobile character-sheet device QA

The active `/characters/:characterId` route renders `CleanCharacterSheet`, and the current presentation stack includes the explicit mobile character-sheet lane.

Remaining work: complete real-device/browser QA at representative Android Chrome and iOS Safari widths, including tabs, HP controls, combat cards, inventory, spells, dice results, and long-content overflow.

## Medium priority

### Rate limiting is process-local

Auth, password reset/change, Rook AI, legacy AI, and expensive homebrew parsing routes have route-level sliding-window limits.

Remaining risk: the limiter is in memory and therefore only coordinates within one backend process. If Render scales to multiple instances, move rate-limit state to a shared store such as Redis/Key Value.

### AI usage controls

Rook usage is recorded in MongoDB, monthly usage is visible in the admin overview, and `AI_MONTHLY_LIMIT` can enforce a per-user monthly cap when set above zero.

Remaining work: decide commercial/public limits before launch, make the chosen allowance clear to users, and consider daily/burst limits separately from the monthly cap.

### Large frontend components

Several components are still large enough to slow development and make bugs harder to isolate. Refactor carefully without changing UI behaviour.

Priority candidates:

- `UnifiedDashboard.js`
- remaining large character-sheet orchestration
- `GMScreen.js`
- `CombatPage.js`

### Heavy inline styles

Some components still define substantial style objects inside render modules. This makes visual consistency and maintenance harder.

Fix gradually by extracting repeated styles into the approved shared design system and responsive device lanes.

### Live-sync schema evolution

Client-originated campaign WebSocket messages now use an allowlist and unknown message types are rejected instead of rebroadcast.

Remaining work: give each supported message type a typed/validated payload schema as live-sync features expand.

## Lower priority

### README and docs drift

Architecture and service ownership are documented, including the separation between Keeper and Stage Flow. Keep those docs current whenever deployment or storage ownership changes.

### Test coverage gaps

Core flows still need broader consolidated regression suites:

- Auth and account lifecycle
- Character creation and live saves
- Level-up
- Campaign creation and GM Home
- Combat persistence and offline replay
- Homebrew parsing/save
- Account deletion
- Live-session sync

### Design token consistency

Deep navy, warm cream, antique gold, and restrained ledger blue are the intended Keeper direction. Older screens should continue migrating away from leftover one-off colours, gradients, and spacing rules.

## Recently resolved

- GM Home no longer crashes when bootstrap data is null or malformed.
- Current auth-sensitive, Rook AI, legacy AI, and parsing routes have basic rate limiting.
- Unknown client WebSocket message types are no longer rebroadcast to a campaign.
- Account deletion covers the newer user-owned collections identified in the live database.
- Campaign settings and calendars now have campaign-id indexes.
- Monthly Rook request/user counts are exposed to Admin Mission Control.

## Do not do casually

- Do not rewrite the whole frontend at once.
- Do not replace the working character builder in one large edit.
- Do not remove old backend routes until the frontend has definitely migrated away from them.
- Do not add protected publisher rules text into the codebase.
- Do not reintroduce AI image generation; use manual upload support for portraits, maps, items, and other visuals.
- Do not turn Supabase into a second Keeper source-of-truth database without a deliberate migration plan.
