# Battle Table reference review — 16 October 2026

**Source reviewed:** User-uploaded `battle-table-1.zip`. Read its `README.txt`, `tabletop.html`, `server.py`, `addons.py`, and archive contents. No code, imagery or monster cards copied into Rookie Quest Keeper. Friend-authored assets are not assumed to have reuse permission or reusable licences.

The reference is a self-hosted, Python-based tabletop with 14 included map images and about 246 different monster-image sets (491 monster WEBP images including matching card portraits).

## Gaps worth filling, in priority order

| Feature in friend's Battle Table | Existing Keeper capability | Action / status |
| --- | --- | --- |
| Map ruler (5-foot squares), fit / zoom and grid calibration | Player display has map-fitting, map builder supports grid, but player-facing GM map lacked a ruler | **Implemented on development branch**: GM two-click ruler; optional display on TV/Wi-Fi, per-map grid spacing |
| Cell fog of war, auto reveal from token vision and line-of-sight blocking | Keeper map builder has basic fog, first live GM reveal tool built in 0.3.8 | **Partially implemented**: manual fog reveals on both screens. Next: polygon reveal, walls, doors, visibility/raycasting |
| Multi-device maps and realtime player-token movement | Keeper has read-only local Wi-Fi player display, desktop HDMI view, and an editable map builder | **Next priority**: player-safe draggable tokens with GM permissions, optional snap-to-grid and read-only screen projection |
| Token condition badges, concentration and moving spell auras | Existing character/combat conditions elsewhere | **Next priority**: simple condition icons, public/GM-only auras attached to moving tokens |
| Scene/encounter snapshots incl. fog/traps | Keeper has campaigns, map library and scenario records | **High priority**: save full VTT scene with map, camera, tokens, fog, ruler/grid and safely load behind a GM-only preview |
| Weather visual effects (rain, storm, snow, fog, ash, heat shimmer) | Keeper has an environment controller, but LAN player screen has limited effects | **Medium priority**: lightweight optional weather over player map, performance-conscious on weaker TV browsers |
| Hidden traps with passive-perception and per-player reveal | Keeper has monsters/encounter planning, not linked trap sensing | **Advanced**: GM-only triggers and trap detection; privacy testing must come first |
| Individual phone accounts, PINs and player journal/inventory | Keeper currently prioritizes a no-login offline GM app and read-only shared player screen | **Optional, not default**: do not force player logins or cloud services; player phones could be opt-in later |
| D&D Beyond import/sync | Keeper has its own offline character sheets | **Optional online add-on only**: no dependency on external internet to run a session |
| Built-in monster art, portraits and external maps | Keeper has bestiary, campaign images and map upload support | **No copying** from friend ZIP without permission and asset licences |

## New live VTT controls

Under **Live Play → Extended Display Command Centre → Battle Map: Fog, Grid & Ruler**:

1. Choose a map from the Keeper campaign library or upload a local battle map.
2. Click **Show grid** and set **Squares across** to match the artwork's existing grid (5 feet per square). When the map already has grid lines, leave the optional overlay hidden.
3. Choose **Distance ruler**, click a start point, then click an end point. The approximate straight-line distance in feet is calculated from the image's actual proportions, including portrait screens.
4. The ruler remains GM-only by default. Choose **Show ruler to players** to publish that line; switch it off to remove the line and its coordinates from remote state.
5. Grid and ruler preferences save locally **per campaign and map**; the second laptop's Wi-Fi player screen shows the grid and only shared ruler geometry.
6. The **Reveal fog** tool remains available, including per-map coverage, undo and reset.

**Limitations to test on real hardware:** Dragging tokens is not yet implemented in the live spectator workflow. The grid assumes square 5-foot cells; it isn't a full grid alignment / rotation tool. No automatic wall-dependent line of sight yet. Fog/image resources can be inspected by a technically determined viewer, so never use a player browser as a store for campaign secrets.

**Testing:** Run the frontend Jest suite and build; desktop LAN/backup tests and Windows build; manually check 1080p landscape + 1080×1920 portrait, video performance and off-device Wi-Fi on the actual GM and TV laptops.
