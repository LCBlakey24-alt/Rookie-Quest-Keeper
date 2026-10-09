# Rookie Quest Keeper Desktop

Windows-first, laptop-only edition of Rookie Quest Keeper.

## v1 goals

- Runs without Vercel, Render or MongoDB Atlas.
- Uses Keeper's isolated local workspace transport.
- Stores ordinary campaign/character workspace data locally on the laptop.
- No cloud sign-in is required.
- Cloud-only features are hidden rather than pretending to work offline.
- The existing web application remains unchanged.

## Current offline scope

The local Keeper transport already supports the main character/campaign workspace, including campaigns, characters, player views, notes, handouts, quests, story arcs, NPCs, locations, maps, calendar events, encounters, factions, roll tables, loot tables, treasury data, session recaps, rests and character progression.

The first Windows build intentionally omits or hides account management, admin tools, cloud uploads, feedback submission and Rook AI. Those need local desktop replacements rather than network fallbacks.

## Build

The GitHub Actions workflow `desktop-windows.yml` builds the React frontend, copies it into `desktop/renderer`, packages Electron and uploads the Windows installer as an Actions artifact.

No backend service is started by Desktop v1.
