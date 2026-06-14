# Roadmap

This roadmap focuses on stability first, then player/GM features. The app already has a lot of functionality, so the next work should reduce fragility before adding more big systems.

## P0 — Stability and safety

### 1. Character saving consistency

- Confirm every active sheet save path uses the lenient PATCH route for live state.
- Reserve strict PUT updates for full edit-mode flows only.
- Add regression tests for HP, temp HP, death saves, conditions, exhaustion, spell slots, notes, inventory, portrait, and personality fields.

### 2. Account deletion cleanup

- Ensure deleting an account removes or anonymises all user-owned data.
- Cover characters, campaigns, homebrew, uploaded content, notes, NPCs, maps, combat records, invites, password reset tokens, and any user-owned rulesets/templates.
- Add backend tests that create sample records across collections and confirm cleanup.

### 3. Auth and AI rate limits

- Add basic rate limits for login, register, forgot-password, password-reset, AI generation, and file parsing.
- Add per-user daily/monthly AI usage counters before public launch.

### 4. Mobile character sheet

- Verify the mobile sheet layout component is actually mounted in the active character sheet route.
- Test Android Chrome and iOS Safari widths.
- Preserve desktop layout while improving phone layout.

## P1 — Code health

### 1. Split large frontend files

Start with the safest extractions:

- `UnifiedDashboard.js` → header, character section, campaign section, modals.
- Active character sheet file → vitals header, tabs, mobile layout, shared chips.
- `CombatPage.js` → initiative tracker, combatant card, map, log.
- `GMScreen.js` → sidebar, header, dice panel, tab renderer.

Avoid changing layout or behaviour during these refactors.

### 2. Lazy-load heavy routes and tabs

Use `React.lazy` and `Suspense` for admin, homebrew, character builder, combat, GM screen, and heavy sheet tabs where possible.

### 3. Extract repeated inline styles

Move repeated style objects to shared constants or CSS classes. Keep the existing charcoal, red, and white visual direction.

### 4. Shared API client

Keep frontend API calls routed through the shared `apiClient` helper so every request gets:

- Base URL handling.
- Auth token handling.
- Common 401 handling.
- Toast-friendly formatted error messages.

## P2 — User-facing improvements

### 1. Player handouts

- GM can create/share a handout with selected players or whole campaign.
- Player dashboard shows unread handouts.
- MVP can poll before WebSocket push.
- Next pass: add tests for GM re-share controls, read/unread status, and locked player sharing.

### 2. World map travel overlay

- Upload/use world map.
- Calibrate two points to a travel distance or travel-days value.
- Draw route lines and estimate travel time.
- Add pins for cities, dungeons, towns, and teleportation circles.

### 3. Homebrew Workshop expansion

- Improve AI draft review.
- Add clearer missing-field warnings.
- Add versioning for user homebrew.
- Allow export/import of homebrew packs.

### 4. NPC, monster, item image support

- Reuse the upload-only image component.
- Mount it into NPC, monster, item, and inventory editors.
- Do not reintroduce AI image generation; visual assets should come from manual uploads only.

### 5. GM/player live sync

- Sync combat state, selected map, handouts, and visible encounter state.
- Keep private GM notes private by default.

## P3 — Commercial polish

- Better onboarding for first-time users.
- Sample campaign/demo mode.
- Public landing page improvements.
- Pricing/account limits if needed.
- Exportable PDF/session recap packs.
- Accessibility audit.
- Lighthouse performance audit.
