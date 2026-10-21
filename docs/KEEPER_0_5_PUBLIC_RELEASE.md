# Rookie Quest Keeper 0.5.0 — public, offline-first release

Status: development proposal, **not yet published**. Based on the existing
0.4.6 offline application and the existing online web app.

## What players can choose

- **Web**: open the Keeper website in a browser; account required to save and
  retrieve private cloud campaigns. The website deploys separately.
- **Windows desktop**: install Keeper, create/import campaigns and use the GM
  tools **without creating an account**. Campaigns and imported media remain on
  this computer, including when there is no internet.
- **Cloud link (later release phase)**: optionally sign in, explicitly choose
  campaigns to sync, make offline edits, and reconcile conflicts. This feature
  must **not** be marketed as available until implemented and tested. Signing
  out must not erase local data.

Public distributions must contain **no personal campaigns, private images,
music, player records, media, or user credentials**.

## Windows update experience

1. When the user starts the installed Windows app, it may **check** the official
   GitHub release feed. Every six hours while open it may check again.
   Failure/offline status cannot prevent local play.
2. A published non-prerelease update shows an unobtrusive **Review update**
   notification with **Later**. No surprise dialog and no forced download.
3. Review shows release version and plain-text notes alongside **Install
   update** and **Later**. One explicit confirmation authorises downloading
   (if required), backing up and installing this particular published update.
4. The backend downloads only after confirmation, shows download progress and
   requires the updater's verified **downloaded** event. It then creates a
   verified campaign/media snapshot before scheduling installation and restart.
   An incomplete download or failed snapshot keeps the existing app running.
5. Before invoking the installer, the existing workspace and imported
   campaign media must be snapshotted and checked. A missing, invalid or
   unverified snapshot **blocks the restart and install**.
6. After that approval, the update installer runs unattended and requests an
   automatic restart. The initial installation still uses the normal wizard.
   Installer runs with the existing app identity, leaving the data folder
   intact. Verify startup, data integrity and a recovery route on a test PC
   before publishing.
7. Program releases are separate from `.rqkupdate` and `.rqkpack` campaign
   content imports. An imported content pack can never execute a program
   update.

The portable 0.4.0–0.4.5 bootstrap update mechanism uses its own pinned
Ed25519 key and **does not automatically trust a new 0.5.0 publisher**. Do not
change or bypass that trust. Existing portable users must install the new
trusted app separately and import a tested backup. Never delete their
`RookieQuestKeeperData` folder as part of a migration.

## One-time migration from existing 0.4.x Windows Keeper

The release follow-up now supports a more complete migration backup from a
closed copy of `RookieQuestKeeperData`, including supported browser-only records.
Use **Prepare backup from copied old data folder** in the new installed edition
and follow [the copied-profile procedure](KEEPER_0_5_MIGRATION.md). Ordinary old
exports still omit that supplemental data; the preview reports this explicitly.
New exports and automatic before-update snapshots include supported browser
records alongside the saved workspace and imported pack media.

The user's existing working 0.4.x portable bootstrap is **not** replaced or
automatically trusted by the new 0.5.0 Windows installer. A newly installed
copy has a different Electron user-data location. Showing an empty campaign
library in the new edition does not mean the old campaigns were deleted.

1. **Leave the existing working Keeper and `RookieQuestKeeperData` unchanged.**
   Make a closed, disposable copy of the old launcher and its whole data folder
   outside OneDrive, as described in [the validation procedure](KEEPER_0_5_MIGRATION.md).
   From that copy's **Updates & backups**, select **Export backup to
   USB / folder** and choose a separate local or synced OneDrive folder. The
   label is historical; a USB device is *not* required. Wait for OneDrive to
   finish and make the backup folder available offline.
2. Install the separately reviewed, signed 0.5.0 edition on the Windows laptop.
   Do not uninstall the existing Keeper, delete its data folder, or point an
   installer at the original working data folder.
3. In installed Keeper choose **Updates & backups → Move from earlier Keeper →
   Choose and inspect earlier backup** and select the *dated exported backup
   folder* containing `manifest.json`, `workspace.json` and optional
   `campaign-packs/` media—not the entire old `RookieQuestKeeperData` folder.
4. The preview validates the workspace and checksum-protected media, and shows
   counts for campaigns, characters, notes and imported files. A legacy
   unchecked backup is refused; export a fresh backup from the earlier app.
   Preview has no side effects.
5. Press **Import into this Keeper** and accept the explicit warning only after
   inspecting counts. The new app snapshots its current workspace before
   import, validates the chosen backup again, copies imported media into the
   new installation and restores the workspace. The old installation and
   exported backup are not changed.
6. Restarted app: compare campaign IDs, characters, NPCs, quest progress, maps,
   music, encounters, homebrew, current resources, and imported attachments.
   Verify specific records (not just the headline counts). Test offline
   startup and recovery before switching to the new shortcut.

Scope caveat: old exports migrate **Keeper workspace data and imported media**;
new complete exports also include explicitly supported browser-storage records.
Whole Chromium profiles, window placement, unknown browser keys, external
Google/OneDrive-linked files and unrelated settings are excluded and require
separate validation.
No auto migration, account creation, cloud upload or live-data overwrite is
performed in CI. Synthetic fixture tests do not replace a real laptop trial.

## Release security: setup required

Do not publish a public version until a legitimate Windows code-signing
certificate and protected GitHub Actions release settings are configured:

- Create a GitHub **Environment** named `windows-release` under repository
  **Settings → Environments**. Add the owner or another trusted person as a
  **Required reviewer**. The release workflow checks this protection before
  it starts the signing job and fails if the environment/reviewer is missing.
  Consider a second reviewer and **Prevent self-review** when a second trusted
  maintainer is available. Restrict deployment branches/tags to reviewed main
  and the `desktop-v*` release tags. Do not create an unprotected environment.
- Put these secrets in the protected `windows-release` environment:
  `RQK_WINDOWS_CERT_PFX` (electron-builder-compatible
  certificate reference, commonly a protected base64-encoded PFX),
  `RQK_WINDOWS_CERT_PASSWORD`.
- Put this variable in the same environment: `RQK_WINDOWS_PUBLISHER` (the exact common name
  of the approved signing certificate).

Use a legitimate Windows code-signing service/certificate that supports the
selected signing method. Do not export hardware-protected signing keys merely
to fit this PFX workflow: a hardware/cloud signer needs a reviewed integration
first. Never paste a certificate password or private key into ChatGPT or a PR.
The older portable Ed25519 signing key is unrelated and must remain unchanged.

`.github/workflows/desktop-release.yml` fails closed if the signing
configuration is absent. PR builds have no access to production signing
secrets. On an approved version tag that exists on main, the workflow
builds the installed Windows NSIS edition, validates **Valid** Authenticode
signatures for both setup and the packaged app against the configured publisher,
and checks that `latest.yml` hashes/sizes match the setup, the blockmap exists,
and the packaged updater pins the exact publisher and official repository.
Only those verified assets and a hash report reach a **draft** GitHub release.
A human must review and approve the release before publication.
Signatures alone are not substitutes for release review, revocation
procedures, or full Windows install/migration tests. The signing workflow also
runs the full frontend and desktop suites, development Electron startup, and a
packaged installed-edition offline startup/restart check with a synthetic campaign
and disposable profile. This is not a Windows wizard, upgrade, recovery or actual
laptop validation result.

Pull-request artifacts named `Rookie-Quest-Keeper-Desktop-Windows` are **unsigned
QA builds**, with no production signing credentials. The portable QA binary is
retained for legacy tests only. Do not install these over a working Keeper copy
or present them as approved releases. Lockfiles are enforced in both Windows
pipelines; an automatic public-publishing npm script is deliberately absent.

Investigate upgrading electron-builder and adopting **cryptographically
signed update metadata**, in addition to Authenticode and hash
verification, before broad public rollout. Lock down GitHub tag
permissions and protected signing environments. Review and pin GitHub
Action versions and dependency integrity before treating release CI
as a production security boundary.

## Acceptance gates

### Desktop foundation
- No-account launch on a clean Windows 10/11 x64 machine.
- No-backend campaign create/edit, battles, maps and character data.
- Offline launch after reboot, no unexpected login or online dependency.
- Detect update online but remain usable when DNS/internet is unavailable.
- Review/Later shows only for a newer published, compatible version.
- One Install update confirmation downloads (if needed), verifies readiness,
  backs up local campaign/media and installs; no double-clicking update packages.
- Interrupted downloads or failed backups never call the installer or restart.
- Download/install only following the user's explicit actions.
- Invalid backup, missing media, invalid signature, hash error, locked file,
  or interrupted installation cannot destroy a working campaign.
- Test install and rollback with a **synthetic** campaign copied to a
  disposable computer/profile. Test migration from portable 0.4.5 backups.
- No private campaign data in public packages or GitHub Actions logs.

### Website and optional cloud
- Separate web deployment; private routes require authentication.
- Public landing page with **Use online** and **Download for Windows**.
- Explicit, revocable opt-in to synchronise each private local campaign.
- Offline edits queue locally, support eventual sync, and detect
  conflicting edits without silently overwriting either side.
- Media has permission controls, quotas and selective syncing.
- Full account deletion and export pathways; no campaign upload on
  desktop start-up unless the user opts in.

## Release sequence

1. 0.5.0 **desktop foundation:** versioned installer, consent-only update
   UI, verified backup guard, signer-verified draft release workflow.
2. Configure signing certificate, GitHub settings and CI protection.
3. Test clean installs, old-data migration, offline play, update failures
   and rollback using synthetic data. Publish only after those pass.
4. Finish public website landing/download experience and the online
   private campaign experience.
5. Add optional authenticated cloud sync as a separately reviewed
   feature. No claim of sync before conflict-resolution testing.

This document is a checklist, **not a statement that the above release
gates have already passed**.
