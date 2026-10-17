# D&D Beyond character links — player companion (development)

**Current implementation:** Each signed-in Keeper player can enter their own D&D Beyond character **Share URL** from either their character's **Character** tab or their player campaign roster. Keeper saves, reads and removes that source link through three owner-only routes on `backend/routes/characters.py`:

- `GET /characters/{id}/dndbeyond-link`
- `PUT /characters/{id}/dndbeyond-link` — JSON `{ "url": "https://www.dndbeyond.com/characters/12345" }`
- `DELETE /characters/{id}/dndbeyond-link`

`backend/utils/dndbeyond_links.py` accepts only HTTPS links to a specific numerical character ID on the exact `dndbeyond.com` host. It canonicalises the URL and removes unnecessary query information; it **never fetches** D&D Beyond, uses internal APIs or attempts account access. Each read/write checks user ownership of the Keeper character. The saved metadata explicitly returns `sync_status: not_available` and `import_status: link_only_manual_import_required`.

The existing Keeper import flow at `/characters/import` can accept a **player-provided exported PDF or image**, using a review-first scan where supported. It currently **creates a new Keeper character**; it does not safely merge into a linked existing character, nor update it from the D&D Beyond link. No character stats are changed by link save or unlink.

**Important legal/technical reality (reviewed 2026-10-17):** D&D Beyond's June 2026 terms forbid unauthorised automated extraction and reverse engineering and there is no publicly supported character-sync API identified. Never use undocumented endpoints, bots or proxy workarounds. Do not claim automatic one-time import or background sync from a shared link. User must never paste D&D Beyond account passwords, cookies or tokens into Keeper.

**Prioritised future work:**
1. With player consent, add a review-first **merge imported PDF** flow for existing owned characters, showing individual changed values. Keep a restoreable snapshot before applying selected fields, preserve homebrew/GM-approved overrides, and avoid overwriting newer in-session edits.
2. An authorised external sync integration, if D&D Beyond provides or licenses one, with per-field sync status, timestamp, rate limits and conflict handling. Do not schedule link polling unless authorisation and access truly exist.
3. The separate **hosted player PWA ↔ offline desktop GM** bridge; keep GM data private and track last successful sync / offline queue / conflicts. See `docs/PLAYER_COMPANION_SYNC_PLAN.md`.
4. End-to-end tests with owned/not-owned characters, D&D Beyond public/private URLs and signed-in iOS/Android PWA. Confirm app-store release claims separately from browser installation.

**Deployment:** Commits on the development branch are not automatically proof the production mobile PWA/backend is deployed. Check server deployment and live permissions before telling players the link field is available.
