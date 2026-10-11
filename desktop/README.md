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
