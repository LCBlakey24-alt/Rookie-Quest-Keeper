# Rookie Quest Keeper Desktop

Windows-first, laptop-only edition of Rookie Quest Keeper.

## Quick start for a table session

1. Open the **Desktop Windows Build** workflow on the [GitHub Actions page](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/actions/workflows/desktop-windows.yml).
2. Open the successful run for your preferred tested commit, scroll to **Artifacts**, and download **Rookie-Quest-Keeper-Desktop-Windows**. Unzip it and run the Windows `.exe` installer. The installer is currently unsigned: Windows SmartScreen may ask you to review it.
3. Launch **Rookie Quest Keeper** using the Windows Start menu or desktop shortcut. This desktop workspace needs no login, Atlas, Render, or Vercel.
4. Open **Campaigns** to create/open a local campaign. To bring your existing campaign data, import a compatible private `.rqkpack` in Campaigns. Nothing is automatically copied from your online account.
5. In **Live Play**, use **Extended Display Command Centre**. Choose **Open Table** for a flat battle map or **Open TV** for a normal upright TV. Drag the separate player window to your extended HDMI monitor and use **F** for fullscreen.
6. **For a TV, tablet or another device on the same Wi-Fi instead of HDMI:** click **Copy Wi-Fi Link**. Paste that link into the other device's browser. Accept a Windows firewall permission prompt only for your trusted **Private** network. The laptop must stay awake and Keeper must remain running.
7. Choose a saved map or **Choose a local battle or world map** to send a picture. Tick NPCs, then press **Show Selected** to reveal them together. The player screen hides GM-only notes and enemy mechanics.

### Live fog of war (desktop and trusted Wi-Fi)

- In **Live Play → Extended Display Command Centre**, choose a saved or local map first.
- In **Fog of War**, click **Cover map**. The GM keeps a faint map preview while the player screen starts completely covered.
- Click areas of the map in the GM preview to reveal them. Use the **Small / Medium / Large** reveal size. **Undo reveal** reverses the most recent edit; **Reset to covered** re-hides the whole map.
- Edits automatically save locally **per map and campaign** on this laptop, and immediately update the currently displayed map or combat HUD.
- The player window and Wi-Fi spectator viewer show the same revealed areas. The LAN viewer filters covered combatant tokens out of its public JSON response. This is a manual reveal tool, **not yet line-of-sight automation**.
- Fog records currently live in the local display's browser storage, separate from the desktop campaign pack. Keep the original app data intact during upgrades; an ordinary exported `.rqkpack` does not yet guarantee fog transfer to a different laptop.
- **Another laptop may drive the projector/TV:** while Keeper runs on the GM laptop, choose **Copy Wi-Fi Link**. The second laptop opens that link in a browser on the **same private LAN/Wi-Fi**, then connects HDMI to the screen. Keep Keeper open and permit Private-network firewall access if prompted. Public internet access, cloud sync and guest networks with client isolation are not supported by this local link.

### Saved encounters and draggable monster tokens (v0.4.0)

- Use **Live Play → Extended Display Command Centre → Saved Battle Scenes** to save a prepared battle with its map reference, selected encounter, creature visibility choices, relative token positions, fog, grid, ruler, active combatant and round.
- Saved battle scenes live in **local browser data for this campaign on the GM laptop**. They are *not* currently part of the imported/exported `.rqkpack` data model, so do not rely on an ordinary campaign export alone to preserve them when switching laptops.
- To place creatures, choose a **Combat scenario** in advanced controls **or use Creature Tokens → Add Creature Token** to create a manually placed monster. New manual monsters begin **hidden** from players. Their GM-only tokens appear over the fitted map. **Drag** a token with the mouse/pointer or use arrow keys. Enable **Snap tokens to grid** if desired; squares use the configured **Squares across** figure and the source image's aspect ratio.
- Double-click a creature's GM token to toggle whether it is eligible for player reveal. Creatures behind active fog stay omitted from the player-facing token data.
- A scene load is **GM preview only**, not an automatic projection to the table. Click **Start / Update Combat HUD** when ready to reveal the current battle. During live combat, dragging a visible, fog-revealed token updates the Wi-Fi browser and HDMI window via the player-safe display bus.
- The player screen remains a **read-only spectator**. Player dragging, permission controls, network-wide scene editing and automatic door/wall line of sight are separate future features.
- Source images referenced through the portable app's `rqk-attachment://` local URLs are stored in the backed-up Windows app data. Maps added as large browser-only `data:` images may not be eligible for small local encounter snapshots.

### Grid and range ruler (desktop and trusted Wi-Fi)

- In **Live Play → Extended Display Command Centre**, select/upload a map. Under **Battle Map: Fog, Grid & Ruler**, choose **Show grid** and calibrate **Squares across** (assumes square cells of 5 feet).
- Click **Distance ruler**, then click a start point and an end point in the GM map preview. The displayed distance is approximate and uses the map image's actual width/height.
- Measurements are private until you click **Show ruler to players**. Hidden ruler endpoints are omitted from Wi-Fi player state, not merely made invisible.
- The browser/HDMI TV and Wi-Fi spectator player screens both show the grid and any explicitly shared ruler, fitted to the map image instead of the surrounding letterbox.
- Settings are saved per map to the GM laptop's local storage. These settings currently are not guaranteed to migrate with campaign packs. No network is required for a directly connected TV; a second laptop must be on the same private LAN.
- Review the gaps and next ideas from the user-supplied Battle Table project in `docs/BATTLE_TABLE_REFERENCE_REVIEW.md`.

### Upright portrait TV and compact VTT display

- Windows should be set to **Portrait** if the physical TV is rotated upright. Keeper reads the display's actual width and height; it does not force a TV rotation itself.
- The player window and the private Wi-Fi browser both adapt to landscape and upright portrait screens. At 1080 × 1920, NPC portraits wrap into tall grids, the standing-TV combat roster moves underneath the map and the party details become a compact strip.
- Maps remain letterboxed rather than stretched. In combat, tokens are positioned relative to the displayed **map image**, not the unused margins, and follow the image when the TV resolution changes.
- Press **F** on the player screen to enter fullscreen. Press **H** to hide or show the header/footer framing for a map-first cinematic view. Press **Esc** to leave browser/Windows fullscreen.
- At low 720p resolutions, the player-screen chrome is reduced so the map remains the focus. The outer player view must not create a page scrollbar.
- Many NPCs/combatants are fitted inside the fixed-size TV canvas. If roster entries exceed usable space, use the GM's **Show Selected** function to reveal a readable group rather than showing 30+ portraits at once.
- Confirm the actual TV's Windows scaling and overscan settings. Set Windows display scaling to 100% first if the TV crops edges, and adjust the TV's aspect/overscan to **Just Scan / Screen Fit**.


**Two different second-screen choices:** an HDMI/Windows extended monitor needs no Wi-Fi server. A separate browser device needs both devices on the same private network and the **Copy Wi-Fi Link** link. A TV without a web browser may need HDMI or another browser-capable device.

**Save and backup:** maps selected inside the desktop version are saved under Keeper's local application-data directory (`campaign-packs/local-media`), and **Back up now** includes those files. Export/backup your campaign before reinstalling Windows or changing computers. All offline campaigns stay on this laptop, not automatically in the cloud.

**Testing note:** Installer artifacts built by pull requests are test builds. Only use a successful Actions artifact; the public auto-updater will not offer an unpublished draft.

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
