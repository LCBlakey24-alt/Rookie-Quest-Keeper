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
