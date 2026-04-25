# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build an immersive, context-aware TTRPG application with strict SRD 5.1 compliance. Dual-theme design (Midnight Neon for GM, Electric Tundra for Players), advanced GM tools, and a combat-ready player dashboard surpassing D&D Beyond.

## Architecture
```
/app
├── backend/
│   ├── server.py              # Thin orchestrator
│   ├── models/                # Pydantic models
│   ├── routes/                # 20 modular route files
│   │   ├── events.py          # Event System + Location Economy
│   │   └── ...
│   ├── tests/                 # Test scripts
│   └── utils/
└── frontend/src/
    ├── components/
    │   ├── GMScreen.js                 # Live Play Mode (~905 lines, grouped tabs)
    │   ├── CampaignDashboard.js        # GM Page (prep & creation)
    │   ├── CharacterSheetFull.js       # Player page
    │   ├── LevelUpWizard.js            # Full class progression (~1491 lines)
    │   └── gm/
    │       ├── CombatTab.js            # Extracted Combat content
    │       ├── NpcsTab.js              # Extracted NPCs content
    │       ├── PartyTab.js             # Extracted Party content
    │       ├── NotesTab.js             # Extracted Notes content
    │       ├── MonstersTab.js          # Extracted Monsters content
    │       ├── MapMaker.js             # Polished: Fill, Undo, Templates, Import/Export
    │       ├── EventSystem.js          # City/Area Event Economy System
    │       ├── AISessionPlanner.js
    │       ├── InitiativeTracker.js
    │       ├── SessionTimer.js
    │       ├── QuickNpcGenerator.js
    │       └── SendItemPanel.js
    └── data/
        ├── classFeatures.js            # 12 classes, 24 subclasses
        ├── levelUpData.js              # Extracted: FEATS, HIT_DICE, ASI_LEVELS
        └── ...
```

## Implemented Features

### Phases 1-13 (Complete)
Full auth, character CRUD, 18-route backend, GM tools, world map, AI, 3D dice, soundboard, NPC network, Smart Spellbook, Quick-Action Inventory, Player Progression Dashboard, AI Session Planner, Dice Roll History, Combat UX, 16 conditions, UI Compaction, Checklist, All 12 Classes, Rest Panel, Backstory, Initiative Tracker, Session Timer, Quick NPC Generator.

### Phase 14: Event System & Live Play Mode (Complete - April 25, 2026)
- GM Screen renamed to Live Play Mode
- Event System: Major events (Horse Racing, Boxing, Tournament, Festival, Market), Minor events (Arm Wrestling, Drinking, Cards, etc.)
- Location Economy: City tracking with gold treasury, population, reputation
- Financial Engine: Realistic cost-ripple model, Live Financial Preview, Day-by-day history

### Phase 15: Tab Organization & Refactoring (Complete - April 25, 2026)
**Grouped Sidebar Tabs**: 16 tabs organized into 5 collapsible categories:
- COMBAT (red): Combat, Battle Map
- WORLD (blue): World Map, Location, Events
- CHARACTERS (purple): NPCs, NPC Network, Party, Monsters
- REFERENCE (gold): Tables, Loot, Dice
- SESSION (green): Notes, Story Arcs, AI Planner, Soundboard

**GMScreen.js Refactoring**: 1441 → 905 lines (37% reduction)
- Extracted: CombatTab, NpcsTab, PartyTab, NotesTab, MonstersTab

**LevelUpWizard.js Refactoring**: 1554 → 1491 lines
- Extracted: FEATS, HIT_DICE, ASI_LEVELS, ABILITIES to `/data/levelUpData.js`

**MapMaker Polish**:
- Fill tool (bucket fill algorithm)
- Undo (20-step stack)
- Map Templates: Tavern Interior, Dungeon Corridor, Forest Clearing, Coastline
- Import/Export (.json)
- Simple/Advanced toggle (tokens, map resize in Advanced)
- 12 terrain types (Grass, Forest, Water, Mountain, Stone, Sand, Lava, Building, Wall, Door, Snow, Swamp)

## Prioritized Backlog

### P1 - Upcoming
- Party View Panel (see allies' HP/AC/conditions at a glance)
- Spell Slot visual overhaul

### P2 - Future
- Combat Log per character
- Player Handout System
- Session Recap Sharing
- Additional MapMaker features (custom brushes, layers)

### Known Issues (External)
- Production Login/Password Reset: BLOCKED (external hosting config)
- Production Deployment Risk: BLOCKED (external hosting config)

## Test Iterations
62-65: Core | 67-68: P1 | 69: AI Planner | 70: Fighter | 71: Combat UX | 72: Conditions | 73: UI | 74: Checklist | 75: Classes | 76: Enhancements | 77: Maps/Items | 78: Event System (100%) | 79: Tab Grouping + Refactoring + MapMaker (35/35, 100%)

---
*Last Updated: April 25, 2026*
