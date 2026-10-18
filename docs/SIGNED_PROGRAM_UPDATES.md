# Signed offline program updates — bootstrap 0.4.0

## User workflow

The one-time bootstrap is a new portable Windows EXE. Keep the previous working
EXE and export a campaign backup before testing. Put the bootstrap alongside the
existing `RookieQuestKeeperData` folder; never replace that data folder.

Future updates: sync/download the `.rqkprogram` descriptor and every `.rqkpart`
beside it, make them available offline, open **Updates & backups → Program
Updates → Select program update file → Install Program Update**. The descriptor
is not the executable payload. All part names, sizes and SHA-256 hashes are
covered by an Ed25519 signature checked against the public key inside the
bootstrap. A key supplied by the downloaded package is never trusted.

**Campaign Content Updates** (`.rqkpack` / `.rqkupdate`) are separate data imports.
They cannot install application code. Program updates do not invent or import
Eldritch Heralds/Tia-Karta campaign material.

## Two package types

- `app`: compressed JavaScript and renderer assets, reusing the exact Electron
  runtime in the bootstrap. Normally substantially smaller than a Windows EXE.
  Native modules/new dependencies and Electron upgrades require a runtime update.
  Releases are staged under `RookieQuestKeeperData/program-updates/releases`.
  An atomic selection file activates a fully verified release. The bootstrap
  verifies its signature and every installed file again before loading code.
  The original EXE is unchanged, avoiding running-EXE and OneDrive replacement
  locks for ordinary app changes.
- `portable`: signed complete portable EXE. The detached Windows helper waits
  for exit, verifies staged/copied bytes, retains the previous EXE, retries locks,
  swaps the program and waits for the new renderer's startup acknowledgement.
  If recovery cannot replace a locked new EXE, the previous EXE and campaign
  backup remain available for manual recovery. This path needs laptop testing.

Every part is at most **90 MiB (94,371,840 bytes)**, below 100 MB decimal. Keeper
assembles parts in signed order and verifies individual and combined hashes.
Missing/partial OneDrive files fail before activation. No network is needed once
all files are local. Keep sufficient free space for staging, unpacking, and a
complete copy of imported campaign media; large media backups may need much more
space than the update itself.

Versions must be strictly newer; platform, architecture, bootstrap minimum,
data-schema version and app-package Electron version must match. Release owners
must keep data schema 1 backward compatible. No arbitrary install hooks or shell
commands come from packages. Only the trusted packaged helper contains commands.

## Backup and rollback

Before activation, Keeper validates the active workspace and copies it and
`campaign-packs` media into a snapshot. Readback and SHA-256 comparison verify
the copy. New snapshots include file digests checked before restore. Existing
backups remain readable. Browser storage/settings remain in the original data
folder; program activation does not replace them. This is a verified workspace
and imported-media snapshot, **not a cold image of all Chromium profile files**.

An app release is marked `trying` at startup and `healthy` only when the React
maintenance component requests status after mounting. If the first startup never
acknowledges, the next launch selects the previous release (or bundled app).
No campaign restore occurs automatically: running compatible software must not
erase campaign progress. Recovery snapshots are available in Updates & backups.
This health signal proves renderer mounting, not every application feature.

## Release signing

The private key must never enter Git, an artifact, a package or OneDrive. The
bootstrap pins public key ID `fd256e001f6c9086`. Its private key was generated
locally and protected with Windows DPAPI for this Windows account, outside the
repository. Losing it requires a manually trusted new bootstrap. Do not generate
a new key for every build or silently replace the public key.

To build an update on the release owner's Windows account:

```powershell
node desktop/tools/sign-local-program.js PATH_TO_PROTECTED_DPAPI_KEY fd256e001f6c9086 app PATH_TO_STAGED_DESKTOP NEW_OUTPUT_FOLDER 0.4.1 0.4.0 44.6.0
```

The input folder must contain the built renderer and desktop JavaScript. GitHub
Actions produces `Keeper-Application-For-Signing` alongside the Windows build.
The signing tool decrypts only in process memory and prints sizes, never the key.
For CI signing, `build-program-package.js` accepts `RQK_PROGRAM_SIGNING_KEY` and
`RQK_PROGRAM_KEY_ID`; protect the private key using a release environment with
restricted access. PR workflows deliberately have no signing secret.

## Validation and remaining release gates

Run `node --test` in `desktop`, the frontend tests and production build, and the
Windows packager. Tests cover signature/part tampering, compatibility, path
traversal, file verification, activation/health/rollback and backup preservation.
Synthetic test keys are isolated from the production key.

Before declaring the bootstrap ready: inspect green CI for the exact commit;
test a clean portable launch and app update with a disposable full campaign copy;
test offline OneDrive selection, missing parts, locked selection files, interrupted
activation, renderer failure and rollback; test a runtime update with a locked
EXE and failed restart; compare all campaign/media/settings before and after.
Do not merge or deploy based only on unit tests. Do not touch the owner's working
EXE or real campaign data during these tests.
