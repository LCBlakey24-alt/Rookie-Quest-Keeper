# Rookie Quest Keeper — cross-site code and UI review
**Date:** 23 October 2026  
**Baseline:** `main` `54cc64715798cfb7aeb305e4d328cc08d53dc594`, after Guild Ledger overhaul #615  
**Scope:** Source-based, risk-prioritised audit of key GM, player, character-sheet, mobile, calendar, VTT and styling entrypoints. This is **not** a browser-verified, exhaustive review of every file.

## Audit snapshot
- 1,650 tracked blobs and 162 CSS files under `frontend/src`.
- 299 frontend `*.test.*` unit test files; 71 Playwright E2E spec files in `tests/e2e`.
- `.github/workflows/build-check.yml` executes frontend Jest/build but only `playwright test --list`, not browser E2E execution.
- `tests/playwright.config.ts` only configures desktop Chromium at 1920×1080 by default.
- Brand PNG sizes from Git tree: app icon 2,613,284 B, symbol 2,101,122 B, primary logo 2,064,821 B, favicon 1,882,237 B, compact wordmark 1,540,022 B. Keep all original assets and brand approval intact; optimise derivatives later.

## Verified failures and changes

### P0 — GM Live Play combat route (fixed in #616)
- `frontend/src/components/gm/LiveSessionGridPage.js` launched `/campaign/:campaignId/combat` while `frontend/src/App.js` registers `/combat/:campaignId`.
- Fixed URL without changing navigation state/scenario; added route regression test.
- **No campaign records changed.**

### P1 — player dashboard stale data (addressed in #617)
- `PlayerDashboard.js` did not guard concurrent campaign/character refreshes. An old response could replace a newer selection or linked campaign list after join.
- Handout summary requests could similarly arrive out of order, producing stale unread counts.
- Change adds request-sequence guards, mount cleanup and a preference for the most recent explicit Received-handout state.

### P1 — user/account-scoped character selection (addressed in #617)
- Remembered active character used one shared localStorage key across sign-ins, surprising users on shared devices.
- Changed to account-scoped keys derived from the app's own username key; no cross-account migration from the old global value.
- Added tests for separate accounts and clearing.

### P1 — misleading player empty states (addressed in #617)
- A first-load request failure was represented by `[]`, making saved character/campaign libraries look genuinely empty.
- The UI now distinguishes "never loaded" from a confirmed empty response, retains previously loaded records, and offers Refresh.

### P2 — player/mobile interaction and visual consistency (addressed in #617)
- Legacy `playerDashboardBoard.css` shrank actionable labels to `font-size: 0` and constrained cards to 42px action icons on phones.
- `playerCampaign.css` likewise reduced "Open Sheet" to a chevron with no visible text and hid the Refresh button label.
- Guild Ledger finishing layer now gives phone-sized buttons readable labels, >=44px targets, swipeable campaign tabs, accessible keyboard rings, unambiguous player empty states, and coherent navy/brass/cream hierarchy.
- The character-sheet mobile HUD used labels as small as `0.58rem`; a targeted change raises key play captions to at least 11px without changing character data or game rules.

## Existing strengths to retain
- Signed-in navigation has distinct mobile/tablet/desktop views.
- Player campaign fetches validate membership, use a player-scoped endpoint and preserve prior data on partial failures.
- Campaign GM Home now preserves cached sections instead of erasing them on partial failure.
- NPC full stat blocks already preserve confirmed actions, lore, skills and source notes.
- Tia-Karta calendar uses a separate current date for each campaign.
- Latest `NPCRelationshipWeb.css` already restores mobile diagrams with swipeable/focused views; do not reintroduce the old mobile hide rule.
- `guildLedgerFinish.css` should remain the final presentation authority. Avoid new generic global `h1`/`button` CSS resets.

## Remaining priorities (not claimed fixed)

1. **P1: Actual responsive E2E test runs.** Run Playwright against a known test environment at 360×780, 768×1024, 1280×800 and 1920×1080. Current CI only lists tests. Review stale specs first: e.g. `tests/e2e/npcs-ux.spec.ts` navigates `/campaigns/:id` whereas the app route is `/campaign/:id`; current test also targets older selectors. Test campaign switching, player joins, NPC loads, character HP, combat launch and extended TV fit with seeded non-production data.
2. **P1: Image/network performance.** Create approved optimised WebP/AVIF responsive brand variants and use them on phone/desktop without distributing original font assets. Retain PNG fallbacks.
3. **P2: Consolidate CSS ownership.** Plan a staged removal of overlapping legacy `!important` rules in `CampaignDashboard.css`, `playerDashboardBoard.css`, `CleanSheetFinalHammer.css` and old theme layers. Refactor per-screen tokens into a shared design system with visual snapshots before removing any declarations. Avoid brittle blanket replacements.
4. **P2: Live GM/TV & VTT.** Exercise multi-NPC layout, image fit, fog-of-war, and no-scroll full-screen 16:9 display. Confirm source images and MP3 playback against actual media, not mocks.
5. **P2: Player campaign & character flow.** Cross-campaign return paths, D&D Beyond link experience, session recap, phone keyboard focus, screen-reader labels and live combat recovery need end-to-end coverage.
6. **P2: Calendar and NPC relationship UX.** Confirm irregular months, editing records and directional relationship details through browser tests. Do not propagate Friday-only consequences into Wednesday.

## Release safety
- Keep offline Windows release branches, signed update packages and OneDrive records separate.
- Do not mutate, duplicate or migrate Eldritch Heralds/Spilsby Wednesday data as part of UI fixes.
- Require passing frontend tests/build and route/character checks before merging; verify the production deployment reaches Ready before saying changes are live.
