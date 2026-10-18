# Historical draft: Windows portable program updates

**Superseded by bootstrap 0.4.0. Do not follow the instructions below.**
The current updater accepts signed `.rqkprogram` descriptors and verified
`.rqkpart` files. See [Signed Program Updates](SIGNED_PROGRAM_UPDATES.md).
The historical draft below is retained only to explain the original PR design.

Rookie Quest Keeper v0.3.10 introduces a **full Windows program update** picker in **Updates & Backups**. This changes application code, unlike the separate `.rqkupdate` campaign content import.

## First-time setup (from portable v0.3.8 or v0.3.9)

1. Save a campaign backup via **Updates & Backups → Export backup to USB / folder**.
2. Copy `RookieQuestKeeperData` outside OneDrive as an independent backup.
3. Download the updater-enabled portable Windows `.exe`. Do not run it from Downloads, which would create an empty separate data folder.
4. Close the old version. Place the **new portable .exe beside** the current portable .exe and the existing `RookieQuestKeeperData` folder. Do not replace or remove the data folder.
5. Launch the new file. Confirm the version in **Updates & Backups** and check that existing campaigns are present.
6. Keep the old exe until the new version has been tested.

This is a **one-time manual bootstrap**. The old v0.3.8 program cannot update its own code.

## Updating from v0.3.10 onward

1. Obtain a newer official **Rookie Quest Keeper Portable x.y.z.exe** from a trusted source, along with its **SHA-256 checksum supplied independently** from the file.
2. In Keeper, open **Updates & Backups → Select program update file (.exe)** and choose that download.
3. Paste the 64-character checksum supplied alongside the download. Do not copy the checksum displayed by Keeper and treat it as independent verification.
4. Click **Verify, back up, install & restart**. Keeper stages the verified complete EXE, creates a campaign snapshot, closes, and starts a separate Windows helper to replace its own executable.
5. Let Windows and OneDrive finish handling the file before trying to open it again. Keep an external copy of your data folder.

The update replaces the **entire executable in place**. The file name in Explorer may still include the old version number; check **Installed version** in the app to find the actual version. This updater does not use small delta patches.

### Safety and recovery

- The application never selects a target EXE from user-supplied update metadata. The running exe location is supplied by electron-builder's `PORTABLE_EXECUTABLE_FILE`.
- The staged update and copied destination must match the independent SHA-256 code. Version must increase. Unsupported and invalid PE files are rejected.
- Existing campaigns and imported files remain under `RookieQuestKeeperData`. The previous executable is retained under `RookieQuestKeeperData/program-updates/previous-programs`. The last update result is logged in `program-updates/last-install.json`.
- If the helper cannot replace the program (for example, OneDrive locks it), it restores the previous executable when necessary and attempts to reopen it. Do not delete the backups.
- If Windows security policy prevents the detached helper from running, the old executable remains available. Use your external folder backup to recover if any update behaves unexpectedly.
- The checksum is **not a code signature**. It only authenticates the selected file if the expected checksum really came from a separate source you trust. This feature does not yet implement a signed update manifest or automatic remote updates for portable builds.
- **Do not** use `.rqkupdate` campaign content packages as program updates.

## Verification

`npm test` from `desktop/` includes validation/rollback logic tests and a PowerShell syntax parser check on Windows. GitHub Actions builds NSIS and portable Windows targets. Automated build success **does not replace** a hands-on test of the post-exit swap on an actual Windows laptop, especially in an active OneDrive sync folder.
