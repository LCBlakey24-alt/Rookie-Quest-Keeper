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
6. Installer runs with the existing app identity, leaving the data folder
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

## Release security: setup required

Do not publish a public version until a legitimate Windows code-signing
certificate and protected GitHub Actions release settings are configured:

- GitHub secrets: `RQK_WINDOWS_CERT_PFX` (electron-builder-compatible
  certificate reference, commonly a protected base64-encoded PFX),
  `RQK_WINDOWS_CERT_PASSWORD`.
- GitHub Actions variable: `RQK_WINDOWS_PUBLISHER` (the exact common name
  of the approved signing certificate).

`.github/workflows/desktop-release.yml` fails closed if the signing
configuration is absent. PR builds have no access to production signing
secrets. On an approved version tag that exists on main, the workflow
builds Windows NSIS and portable executables, validates **Valid**
Authenticode signatures for the configured publisher, and only then
uploads installer and update manifest to a **draft** GitHub release.
A human must review and approve the release before publication.
Signatures alone are not substitutes for release review, revocation
procedures, or full Windows install/migration tests.

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
