# Publishing Keeper updates from a laptop to OneDrive

This is the **release handoff** for the existing signed offline updater. It does
not change the already installed Keeper app, the bootstrap EXE, or any campaign
data. The publisher runs **only on the release owner's Windows laptop** under
the same Windows account that owns the protected signing key.

## From a ChatGPT change request to an installable update

1. Prepare and review the changes on the correct GitHub branch. The working
   0.4.3 line comes from PR #575; proposed 0.4.4 follows PR #576, which is
   stacked on #575, which is stacked on #573 (the updater). **Do not build a
   release from old `main` while that chain is unmerged.**
2. Confirm Windows CI and its offline startup smoke test pass at the **exact
   reviewed commit**. This is necessary, but not a substitute for a real
   laptop test and a complete backup.
3. Download the **Keeper-Application-For-Signing** artifact from that GitHub
   Actions run. Extract it to a local folder on the laptop (not a shared
   OneDrive campaign folder). The extracted `desktop` folder contains
   `PUBLISH-KEEPER-UPDATE.cmd`, `tools/publish-signed-program.js`,
   the renderer and the pinned public trust file.
4. Make sure Node.js is installed. On the release-owner's Windows laptop,
   double-click `PUBLISH-KEEPER-UPDATE.cmd`. Enter the new version
   (e.g. `0.4.4`), the location of the **existing** DPAPI-protected
   signing key, and the existing OneDrive
   `Documents/DND/02 Rookie Quest/Rookie Quest Keeper/Updates/Program Updates`
   folder (use the actual synced Windows filesystem path).
5. The tool checks that the local protected key matches the app's pinned
   public key, builds a signed `.rqkprogram` and `.rqkpart`, verifies
   their complete contents, copies the parts first and descriptor last to
   a **new version folder** in OneDrive, then verifies the copied package.
   An existing version folder is never overwritten.
6. Wait until OneDrive shows every file fully synced and available locally.
   Before installation, back up the Keeper data folder separately. In the
   current **Windows laptop** Keeper, choose
   **Updates & Backups > Program Updates > Select program update file**,
   select `Keeper-X.Y.Z.rqkprogram`, and install.
7. Restart and verify the correct version, campaigns, photos/music,
   offline operation and live-play features. Keep the previous working
   release and verified backups for recovery. Share test results before
   calling the release final.

### Security boundaries

- **Never** upload, export, paste into chat, or commit the private key or its
  DPAPI-protected file. It stays off GitHub and out of OneDrive.
- The GitHub artifact contains code **for local signing**, not a signed
  update. No GitHub PR build automatically signs or publishes software.
- The publisher touches only a newly named folder in OneDrive's
  `Updates/Program Updates` directory. It does not edit the running
  `.exe`, `RookieQuestKeeperData`, user campaigns or backups.
- Always use the artifact for the intended reviewed commit. Signing
  approves the code in the folder you selected; the signing key cannot
  distinguish a reviewed build from an unrelated downloaded folder.
- Publishing does **not** install an update. Keeper's existing signature,
  version, Electron and backup checks still apply when installing.
- If publishing fails, fix the cause and retry. No old update folder is
  replaced. Do not delete backups or the working launcher.
- Campaign `.rqkupdate` imports remain a separate process.

### For technical release maintenance

Manual command, from the extracted `desktop` directory:

```powershell
node tools/publish-signed-program.js 0.4.4 "C:\path\to\your\protected-key-file" "C:\path\to\Rookie Quest Keeper\Updates\Program Updates"
```

The path to the signing key must be the user's pre-existing local key path,
**not** a new generated key. The default source directory is the parent of
the publisher script. Node and Windows PowerShell are needed for local DPAPI
decryption. The app build currently pins bootstrap version 0.4.0 and
Electron 44.6.0; runtime upgrades require a separately planned bootstrap
path. Tests use synthetic keys only and never touch the real release key.

The developer can prepare, review, test and organize the release from
ChatGPT/connected GitHub. Final release signing still needs execution
under the owner's Windows account until a separately trusted local agent
workflow exists.
