# Updating the existing offline Windows Keeper from ChatGPT work

## What this does (and does not do)

The existing **0.4.0 Windows portable bootstrap** can install small, signed 0.4.x app updates without re-installing the EXE or replacing campaign data. Software changes are developed and tested against the correct GitHub branch. A Windows CI job uploads `Keeper-Application-For-Signing` with the built app. The owner then explicitly signs the approved files **on the same Windows account holding the original DPAPI-protected Ed25519 key**. The resulting `.rqkprogram` and `.rqkpart` files go into the local OneDrive `Updates/Program Updates` folder and Keeper installs them offline with a verified campaign/media backup.

This is **not** a no-confirmation remote install, not automatic signing on GitHub, and not the separate 0.5.0 public NSIS installer or website deployment. Never upload the private signing key to GitHub, OneDrive, a chat or a build artifact. Code review, CI checks and a real laptop functional test remain mandatory.

## One-time preparation on the trusted Windows laptop

1. Have the current Keeper repository available locally (on a reviewed branch containing the updater) and install Node.js. The signing assistant needs the repo's `desktop/tools/sign-local-program.js`, `desktop/programTrust.json`, and signed package validator.
2. Locate the **existing** Windows-DPAPI-protected release signing-key file from the earlier 0.4.4 / 0.4.5 signing work. **Do not generate a replacement key**: the existing 0.4.0 bootstrap only trusts key ID `fd256e001f6c9086`.
3. Know your local OneDrive folder: `Documents/DND/02 Rookie Quest/Rookie Quest Keeper/Updates/Program Updates` under your OneDrive sync root. Make it available on-device.
4. Double-click `desktop/tools/SIGN-KEEPER-UPDATE.cmd` on that computer. The first use asks for the protected key FILE PATH and output folder; future uses remember *only those paths* in `%LOCALAPPDATA%/RookieQuestKeeper/guided-signing-paths.json`. It never stores, prints, decrypts to disk, uploads or exports the key contents.

## Each new 0.4.x software update

1. Develop from the **currently installed, tested branch lineage**, rather than assuming `main` contains the latest updater. Check the PR state and green CI on the **exact** source commit.
2. From the successful GitHub Actions **Desktop Windows Build** for that commit, download `Keeper-Application-For-Signing` and extract it to a normal local folder. Do not use an unreviewed fork, a random ZIP, or someone else's artifact. It must contain `main.js`, `preload.js`, `package.json` and `renderer/index.html`.
3. Run `SIGN-KEEPER-UPDATE.cmd` in the trusted local repository, supply the extracted folder and next 0.4.x version (such as `0.4.6`). Review the displayed paths and type `SIGN 0.4.6` as the explicit authorisation. This tool refuses an incorrect Electron runtime or 0.5.0 releases.
4. The helper checks the original encrypted key against the pinned public key, produces a fresh version-specific OneDrive folder, verifies its signed descriptor, every part SHA-256 and the expanded app structure, and writes `VERIFICATION.json` plus `READ-ME-FIRST.txt`. It **never overwrites** an existing version folder.
5. Let OneDrive finish syncing and mark the folder **Always keep on this device**. In Keeper open **Updates & Backups > Program Updates**, select `Keeper-X.Y.Z.rqkprogram`, and install. Do not use Campaign Content Updates for program releases.
6. Check startup, pages, campaigns, media, NPCs, encounters and player display on the laptop. Keep backups and the prior working release; if a feature fails, do not treat the renderer's `healthy` status as a complete functional test.

## Troubleshooting and limits

- No signing key available on the original Windows account: **stop**. Do not substitute a new key or move private key into OneDrive. Recover the key through the original trusted local process; a new key needs a new explicitly trusted bootstrap.
- Update part missing, file locked, update verification failed, incompatible Electron: **stop** and resolve the mismatch; do not bypass the checks.
- GitHub builds the code and tests with synthetic keys but **cannot create the publisher-trusted program update** without the private key, which must remain local.
- OneDrive remote connectors cannot launch an EXE, sign with the Windows DPAPI key or click Install in the user's running Keeper program.
- Campaign imports `.rqkupdate` / `.rqkpack` are always a separate data-only path.
- A future **0.5.0 installed public edition** follows its own, separately verified Authenticode/certificate release process. This tool deliberately refuses it.