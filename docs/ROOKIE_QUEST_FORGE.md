# Rookie Quest Forge

## Product purpose

Rookie Quest Forge is the physical-table branch of Rookie Quest: a modular 3D-printable terrain system designed to be reused, expanded and stored instead of printed once for a single encounter.

The commercial goal is downloadable files first. Physical printed products can be considered later, but the system must work well for people printing at home.

## Prototype standard — v0.1

The following rules are considered the current product standard. Exact tolerances and millimetre dimensions are still prototype values until calibration prints are signed off.

### Grid

- Standard tabletop footprint: 1 inch per square.
- Frames carry the structural grid; visible surfaces can be swapped independently.
- Initial frame family: 1×1, 2×2 and 3×3.
- Larger battle areas are made by joining smaller frames rather than relying on one huge print.

### Base connector

The connector sits at the base of the frame rather than through the centre of the frame.

Working concept:
- Shallow raised ridge on one mating side — like a small speed bump.
- Matching receiving channel on the adjoining frame.
- The connection stops lateral movement when multiple frames are assembled.
- Two connection points are provided per grid square along a joining edge.
- Example: a 3-square edge therefore exposes six connection points.
- The interface must remain compatible between single-square frames and larger frames wherever their grid edges line up.

Why this direction:
- No central slot is needed.
- The playable top remains visually cleaner.
- Multiple connected boards support one another instead of relying on a single clip.
- The connector can remain low enough not to interfere with terrain placed on top.

### Storage

Frames should be stackable/nestable. The underside can include a shallow recess or locating geometry so repeated frames sit neatly on one another for storage.

### Elevation

Vertical play is part of the core system rather than an optional scenery trick.

Planned elevation units:
- 5 ft extender
- 10 ft extender
- 15 ft extender

Extenders must:
- stack reliably;
- present a Forge-compatible frame/top interface;
- accept regular terrain tiles on the raised level;
- support themed side textures later;
- work with railings, ledges, stairs and pillars.

## Product 001 — Forge Starter Set

The Starter Set should be the smallest genuinely useful pack that proves the system works at the table.

Current planned files:
- 1×1 frame
- 2×2 frame
- 3×3 frame
- connector calibration strip
- stone floor tile
- cobblestone floor tile
- straight wall
- wall corner
- doorway / door frame
- pull-tab door
- short stair piece with miniature-base landing lip
- 5 ft elevation extender
- 10 ft elevation extender
- 15 ft elevation extender
- simple pillar
- simple railing / ledge piece

The Starter Set is a prototype product until the connector tolerance, stacking behaviour and real print tests are approved.

## Early pack roadmap

### Stone Streets

Texture expansion for cobblestone, flagstone, damaged street sections, drains and edge details.

### Dungeon Structure

Walls, corners, doors, pillars and stairs designed around the core frames.

### Elevation Kit

Expanded multi-level play: ledges, railings, support pillars and additional height pieces.

### Ancient Ruins Encounter Pack

A themed encounter bundle combining reusable Forge structure with broken stone floors, ruined walls, collapsed doorway pieces and scatter.

## Printer compatibility system

Forge should never assume every customer owns the same printer.

Each downloadable pack will eventually carry machine-relevant metadata including:
- largest supplied part X dimension;
- largest supplied part Y dimension;
- recommended nozzle size;
- material notes;
- whether split-file variants exist;
- support requirements;
- tested printer profiles.

The website can then filter products before purchase/download by printer profile.

Initial profiles on the public prototype page:
- Elegoo Neptune 3 Pro — 225×225 mm
- generic 220×220 mm class
- generic 180×180 mm compact class

The catalogue compatibility test is based on the largest supplied part fitting the selected build plate in either orientation. This is intentionally conservative; later versions can account for margins, brim requirements and printer-specific safe printable areas.

## File library direction

Purchased Forge files should eventually live in a user library rather than arriving as an unstructured ZIP dump.

Desired library capabilities:
- filter by owned pack;
- filter by printer;
- show only files that fit the selected machine;
- expose version/update notes;
- separate frames, surfaces, walls, elevation and scatter;
- provide print notes per file;
- allow a pack to add newly released compatible files without making the user repurchase it;
- connect relevant Forge packs to Rookie Quest Worlds encounters and Keeper campaign material.

## Commercial principles

- Do not sell an STL as compatible until the supplied geometry has been test printed or clearly labelled as beta/prototype.
- Do not force customers to buy a new base system for every theme.
- Core frames and connectors should remain stable across theme packs.
- Themed packs should primarily add surfaces, structures and encounter dressing.
- Printer compatibility information should be visible before purchase.
- Personal-use licensing and version/update policy must be defined before paid downloads launch.
