# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build an immersive, context-aware TTRPG application with strict SRD 5.1 compliance. Dual-theme design (Midnight Neon for GM, Electric Tundra for Players), advanced GM tools, and a combat-ready player dashboard surpassing D&D Beyond.

## Architecture
```
/app
├── backend/
│   ├── server.py              # Thin orchestrator
│   ├── models/                # Pydantic models
│   ├── routes/                # 19 modular route files
│   │   ├── events.py          # Event System + Location Economy
│   │   └── ...
│   ├── tests/                 # Test scripts
│   └── utils/
└── frontend/src/
    ├── components/
    │   ├── ui/DiceRoller3D.js
    │   ├── CharacterSheetFull.js       # Player page
    │   ├── CharacterCombatTab.js       # Combat dashboard
    │   ├── RestPanel.js                # Short/Long Rest automation
    │   ├── LevelUpWizard.js            # Full class progression (12 classes, 24 subclasses)
    │   ├── GMScreen.js                 # Live Play Mode (16 tabs)
    │   ├── CampaignDashboard.js        # GM Page (prep & creation)
    │   └── gm/
    │       ├── EventSystem.js          # City/Area Event Economy System
    │       ├── AISessionPlanner.js
    │       ├── InitiativeTracker.js
    │       ├── SessionTimer.js
    │       ├── QuickNpcGenerator.js
    │       ├── MapMaker.js
    │       ├── SendItemPanel.js
    │       └── MiniGameEngine.js       # Legacy (functionality folded into EventSystem)
    └── data/
        ├── classFeatures.js            # 12 classes, 24 subclasses
        └── ...
```

## Implemented Features

### Phases 1-9: Core through Condition Auto-Effects (Complete)
Full auth, character CRUD, 18-route backend, GM tools, world map, AI, 3D dice, soundboard, NPC network, Smart Spellbook, Quick-Action Inventory, Player Progression Dashboard, AI Session Planner, Dice Roll History, Combat UX Overhaul, 16 D&D 5e conditions with auto-effects.

### Phase 10: UI Compaction & Trackers (Complete - March 31, 2026)
Compact 3-column layout, Exhaustion Tracker (1-6), Concentration Tracker, 2024 class features.

### Phase 11: Session Prep Checklist (Complete - March 31, 2026)
AI-generated prep checklists (8 categories, 3 priorities, progress tracking).

### Phase 12: Full Class Progression (Complete - March 31, 2026)
24 subclasses, fighting styles, spellcasting progression, ASI/Feat, multiclass support.

### Phase 13: Player & GM Experience Enhancements (Complete - March 31, 2026)
Rest Panel, Backstory Tab, Initiative Tracker, Session Timer, Quick NPC Generator.

### Phase 14: Event System & Live Play Mode (Complete - April 25, 2026)
**Rename**: GM Screen → Live Play Mode (throughout UI)
**Event System** - Full city/area economic event management:
- **Location Economy**: Create cities/areas with population, gold treasury, reputation tracking
- **Major Events**: Horse Racing, Boxing Match, Grand Tournament, Harvest Festival, Market Fair
- **Minor Events**: Arm Wrestling, Drinking Contest, Card Game, Knife Throwing, Riddle Challenge
- **Custom Events**: GM defines event name, type, costs, prizes, quality level
- **Financial Engine**: Realistic economic model where changing costs ripples through attendance, revenue, satisfaction, reputation, and population changes
- **Live Financial Preview**: Real-time calculation as sliders are adjusted
- **Day-by-Day History**: Track location economy over time (gold, population, reputation per day)
- **Preview & Run**: Preview projected impact before committing; run applies changes to location
- **Cascading Effects**: Events affect city treasury, population growth/decline, reputation score

**Backend Endpoints**:
- `GET/POST/PATCH/DELETE /api/campaigns/{id}/event-locations` - Location CRUD
- `GET/POST/PATCH/DELETE /api/campaigns/{id}/events` - Event CRUD
- `POST /api/campaigns/{id}/events/{id}/preview` - Preview financial impact
- `POST /api/campaigns/{id}/events/{id}/run` - Execute event, update economy
- `POST /api/campaigns/{id}/events/{id}/preview-config` - Preview with modified config

## Prioritized Backlog

### P1 - Upcoming
- Polish Map Maker functionality
- Review/organize Live Play Mode tabs (16 tabs - consider grouping)

### P2 - Future
- Party View Panel (see allies' HP/AC/conditions at a glance)
- Spell Slot visual overhaul (animated orbs)
- Combat Log per character
- Player Handout System
- Session Recap Sharing
- GMScreen.js refactoring (~1500 lines)
- LevelUpWizard.js refactoring (~1500 lines)

### Known Issues (External)
- Production Login/Password Reset: BLOCKED (external hosting config)
- Production Deployment Risk: BLOCKED (external hosting config)

## Test Iterations
62-65: Core | 67-68: P1 | 69: AI Planner | 70: Fighter | 71: Combat UX | 72: Conditions | 73: UI Compaction | 74: Checklist | 75: All Classes | 76: Player/GM Enhancements | 77: Maps/Items | 78: Event System (14 backend + 4 frontend, 100%)

---
*Last Updated: April 25, 2026*
