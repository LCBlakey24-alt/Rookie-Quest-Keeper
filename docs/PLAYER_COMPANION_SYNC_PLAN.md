# Player Companion — Windows Offline GM ↔ Phone & Tablet

Date: 2026-10-17. This document distinguishes **what currently works** from the missing sync bridge. It is a design specification, NOT a claim of player sync completion.

## Existing services to reuse

- The hosted/web Keeper already has a PWA manifest at `frontend/public/site.webmanifest`, a service worker, mobile views, player sign-in and character sheets.
- Campaign join/approval flow exists: `backend/routes/campaign_invites.py` issues six-character join codes and links a player-owned character to one campaign, pending GM approval when configured.
- Player-facing campaign workspace: `frontend/src/components/player/PlayerCampaignPage.js`.
- The Windows desktop is private offline and uses local `rqk.desktopWorkspace.v1`. It does not automatically share writes with the hosted database.
- The desktop Wi-Fi link from `desktop/lanDisplayServer.js` is an **audience spectator display**, not an authenticated per-player API. Do NOT repurpose its shared spectator key as a character write token.

## Product requirement

Each player installs the web companion to a home screen on iOS or Android/tablet, signs into **their own** account, links exactly their own character to Eldritch Heralds, and sees the correct character HP, resources, inventory, XP, spells, conditions, etc. Changes made by the player or GM should propagate. The GM retains an offline-first Windows program and controls who can join, what can be changed, and which information is public.

## Safe staged implementation

1. **Identity and mapping.** In GM setup, explicitly link the offline campaign to an existing web campaign (never match only on campaign name). Store `offline_campaign_id ↔ cloud_campaign_id` and `offline_character_id ↔ cloud_character_id ↔ player_user_id` locally. Show linked / awaiting approval / offline states for each character, with unlink and revoke controls.
2. **Device installs.** Install existing PWA with Add to Home Screen. Do not advertise an APK, IPA, Google Play or App Store build until signed packages actually exist. Add a mobile first-run wizard for account, join code, character, and explicit GM confirmation.
3. **Sync transport.** Preserve offline primary data. For remote access, use an authenticated HTTPS cloud sync channel rather than opening GM PC ports to the internet. For no-internet local sessions, optionally offer a separate authenticated local companion endpoint with unique per-player pairing codes, not the spectator key. Reconcile both only after conflict handling.
4. **Field allow-list.** Sync character-owned fields only: HP, temporary HP, spell slots, resource counters, conditions, inventory, currencies, prepared spells, death saves, class features, notes scoped appropriately. Never send full campaign workspace, NPC secret sheets, unrevealed maps, DM lore, other players' private notes, hidden enemies, GM wallets or vault references.
5. **Conflicts.** Field-level version/timestamp and revision; don't overwrite newer local edits with an old cached phone. Explicit GM approval for irreversible progression / leveling and sensitive narrative fields. Queue player edits offline with local expiry/retry; explain last successful sync and any conflict.
6. **Security.** Never trust a client-provided `character_id` as proof of ownership. Authorize each read/write against server-side campaign membership and player identity, check membership active state, rate limit pairing, revoke lost devices, rotate tokens, scope data by campaign. Leave the offline `.rqkpack` and local userData backups GM-only.
7. **Testing.** Two player accounts plus one GM, Android/iPad device install flow, edit while offline, reconnect/concurrent edits, party changes, identity lockout after removal, bad join codes, LAN isolation, no cloud connection. Test portrait and landscape responsive layouts.

## Delivery phases

- **VTT phase**: fitted whole-row/column grid, fog, weather, ping, party marker on world map, saved encounter. On the desktop and spectator screens.
- **Player phase 1**: complete hosted player PWA linking and character sheet through existing campaign invites; confirm live web data with proper account.
- **Player phase 2**: add a deliberate offline Desktop ↔ hosted campaign bridge (mapping, policy, sync, conflicts) before promising true real-time GM ↔ phone editing.
- **Player phase 3**: optionally add secure on-LAN companion mode for internet-free sessions once the authentication and edit permissions are proven.

No background server/client or data synchronization is made automatic merely by installing the player PWA. The owner must choose a pairing/sync model; the system must not auto-publish private campaign data.
