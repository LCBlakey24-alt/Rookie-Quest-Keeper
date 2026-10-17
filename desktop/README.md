# Rookie Quest Keeper Desktop

Windows-first, laptop-only edition of Rookie Quest Keeper.

## Current goals

- Runs without Vercel, Render or MongoDB Atlas.
- Uses Keeper's isolated local workspace transport.
- Stores campaign/character workspace data locally on the laptop.
- No cloud sign-in is required.
- Cloud-only features are hidden rather than pretending to work offline.
- The existing web application remains unchanged.
- Private `.rqkpack` campaign packs can be imported without committing personal campaign material to the public repository.
- Re-importing a pack updates matching source records while preserving unrelated local campaigns and notes.

## Campaign packs

Desktop v0.2 adds **Import Campaign Pack** on the Campaigns page.

A pack contains ordinary Keeper workspace records plus optional attachments. Text records are merged into the laptop-only workspace. Attachments are copied into Keeper's local application-data folder and exposed through a read-only desktop attachment protocol, so PDFs and images do not need to be stored inside browser local storage.

The campaign pack itself can remain private. Only the generic importer lives in the public Keeper source code.

## Small offline campaign updates (.rqkupdate)

The **Import / Apply Update** button on **My Campaigns** now accepts two files:

- `.rqkpack`: the initial full campaign library, including reference images/maps.
- `.rqkupdate`: a small **content-only** update containing just new/changed
  campaigns, handouts, NPCs, maps and related reference records. It is **not**
  a program executable or an Electron code update.

Install Keeper once. For a campaign update, download the `.rqkupdate` file,
copy it to the laptop (USB stick works with no internet), open Keeper, choose
**My Campaigns → Import / Apply Update**, select the file and confirm.
The original campaign, local player characters, session notes and recaps remain
on the laptop. New files are added without deleting attachments absent from the
patch; matching included attachment IDs replace their corresponding asset.
A before-import backup protects the workspace and imported attachments.

**Authoring from Google Drive:** Keep canonical campaign documents and art in
Drive. Convert their current contents into Keeper's version-1 workspace JSON
with stable IDs; compare with the last published JSON snapshot and produce
a small update file using the standard-library command below:

```bash
python desktop/tools/build_campaign_update.py \
  --before last-published-workspace.json \
  --after current-workspace.json \
  --pack-id eldritch-heralds \
  --pack-name "Eldritch Heralds — Lore Update" \
  --attachments-manifest changed-attachments.json \
  --output Eldritch-Heralds-Lore-Update.rqkupdate
```

The `--before` and `--attachments-manifest` arguments are optional. A
manifest is a JSON array of `{"id": "world-map", "path": "./maps/world.jpg",
"file_name": "world.jpg"}` entries, with paths relative to the manifest.
The output is JSON with an `.rqkupdate` extension, readable by the desktop
importer without any internet, Python, or development tools on the player's PC.
Media items have the existing 25 MiB **per attachment** import limit.

Updates are **additive**: absent records are never removed. Updated campaign
reference metadata wins, but existing characters, personal notes, recaps,
homebrew, in-progress combats and live counters are protected when applying
`.rqkupdate` content packs. Existing world-reference records with the same
stable ID are refreshed. Keep private GM-only content out of player-facing
packs and never commit your private campaign packs to the public repo.

**App code updates are separate.** Desktop already has **Updates & backups →
Check for updates** for published Windows builds. Depending on Electron's
differential update support and availability of release artifacts, an online
app update may download only changed blocks; otherwise the full installer is
downloaded automatically. It still updates the existing installed app without
clearing its stored campaigns. To apply an app-code update when completely
offline, transfer and run the new Windows installer over the existing
installation. The `.rqkupdate` importer cannot replace executable code.

**Phone/tablet caveat:** Desktop is offline and self-contained on the laptop.
A player's separate phone/tablet does not automatically share the laptop's
live state. A trusted local Wi-Fi/LAN sync service or separate offline import
workflow must be implemented and tested before claiming multi-device sync.

## Portable campaign backup for laptop replacement (Desktop v0.3.6)

For extra protection, use **Updates & backups → Export backup to USB / folder**.
Keeper creates a dated **Rookie-Quest-Keeper-Backup-...** folder containing:

- `workspace.json` — campaigns, characters, local session notes and reference data.
- `manifest.json` — backup metadata and the version of the data.
- `campaign-packs/` — imported maps, audio and document files, when present.

Keep the **entire folder together**, and copy it to a USB stick, other disk,
or a private Drive folder. This copy is never uploaded automatically.

To recover on a new laptop, install the same or newer Keeper desktop app, open
**Updates & backups → Restore from saved folder**, and select the backup folder.
Keeper validates the workspace before importing. If the current laptop already
has campaign data, it first saves a safety snapshot of the existing workspace.

Normal Windows app updates preserve the Electron app identity and local
workspace. For offline updates, transfer the next Windows installer and run
it over the same installation; do **not** choose an uninstaller option that
removes user data. This is a precaution, not a replacement for regular
portable backups.

## Current offline scope

The local Keeper transport supports the main character/campaign workspace, including campaigns, characters, player views, notes, handouts, quests, story arcs, NPCs, locations, maps, calendar events, encounters, factions, roll tables, loot tables, treasury data, session recaps, rests and character progression.

Account management, admin tools, cloud uploads, feedback submission and Rook AI remain cloud-only and are hidden in Desktop.

## Build

The GitHub Actions workflow `desktop-windows.yml` builds the React frontend, runs the offline-mode and campaign-pack tests, copies the build into `desktop/renderer`, packages Electron and uploads the Windows installer as an Actions artifact.

No backend service is started by Desktop.


## Desktop v0.3 updates and local backups

The **Updates & backups** control in Desktop's top bar provides:
- An optional startup update check, plus a manual **Check for updates** action.
- Explicit **Download update** and **Back up, install & restart** actions.
- A refusal to install if a nonempty local workspace cannot be backed up.
- **Back up now**, local snapshot listings, and **Restore** with an automatic before-restore safety snapshot.
- A before-import snapshot before incoming campaign attachments may replace existing ones.

Snapshots live only under Electron's `app.getPath('userData')/workspace-backups` and include both `rqk.desktopWorkspace.v1` JSON and `campaign-packs/` (imported PDFs/maps). These snapshots are **not cloud backups**, are not encrypted by Keeper, and can grow in disk usage. Copy important backups to a separate physical drive for disaster recovery. Restoring a snapshot replaces the active workspace, only after confirmation, and preserves a backup of the previous active workspace first.

The existing application identity, `com.rookiequest.keeper.desktop`, and desktop workspace key stay unchanged so regular updates leave local data in place. Electron NSIS updates are consent-based; `autoDownload` and `autoInstallOnAppQuit` are off. An unavailable network/release never stops offline use.

### Publishing an update

1. Land the update through a reviewed PR after CI checks pass.
2. Confirm that `desktop/package.json` has an incremented semantic version, e.g. `0.3.0`.
3. Create a Git tag on **main** named `desktop-v0.3.0`. The `desktop-release.yml` workflow verifies that the tag version matches the package and that the tagged commit is on main.
4. The Windows release workflow runs frontend tests/build and backup tests, then uploads the NSIS installer and `latest.yml` to a **DRAFT** GitHub Release. Review the artifacts and smoke-test on a Windows machine.
5. **Publish the draft GitHub Release** in GitHub when approved. Only published non-prerelease updates are offered by Keeper's GitHub update feed.

A pull-request build artifact is for testing only and **does not count as a published update**. Updaters on v0.3 or later can check for newer published releases; v0.1 and v0.2 do not have an updater and require installing a new version manually once.

### Security and remaining work

GitHub HTTPS and `electron-updater`'s SHA-512 installer checks protect downloads from accidental corruption. Windows installers are presently **not Authenticode-signed**, and electron-builder v26 does not provide the stronger signed-manifest trust chain available in v27. Before a public production launch, obtain a Windows code-signing certificate, adopt/verify signed update manifests and test upgrades on Windows (including NSIS per-user vs per-machine installs). Avoid publishing untested desktop releases. Never commit campaign packs or DM-only backup data to this public repository.
