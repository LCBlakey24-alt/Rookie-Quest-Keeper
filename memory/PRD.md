# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build an immersive, context-aware TTRPG application with strict SRD 5.1 compliance. Dual-theme design (Midnight Neon for GM, Electric Tundra for Players), advanced GM tools, and a combat-ready player dashboard surpassing D&D Beyond.

## Architecture
```
/app
├── backend/
│   ├── server.py              # Thin orchestrator (~150 lines)
│   ├── models/                # Pydantic models (~1900 lines)
│   ├── routes/                # 18 modular route files
│   └── utils/                 
└── frontend/src/components/
    ├── ui/DiceRoller3D.js          # BG3-style sequential dice animation
    ├── DiceRollHistory.js          # Dice roll history sidebar
    ├── CharacterSheetFull.js       # 6 tabs: overview, combat, spells, inventory, journal, notes
    ├── CharacterCombatTab.js       # Combat dashboard
    ├── CharacterSpellbook.js       # Smart Spellbook
    ├── CharacterInventory.js       # Quick-Action Inventory
    ├── PlayerProgressionDashboard.js # Character progression timeline
    ├── LevelUpWizard.js            # Spellcasting-aware Level Up
    ├── SessionJournal.js           # Auto-tagging session log
    ├── PartyInventory.js           # Loot/Economy with treasure gen
    ├── CampaignDashboard.js        # Fixed sidebar navigation
    ├── GMScreen.js                 # GM tools with 13 tabs
    └── gm/
        ├── AICoGM.js               # AI Co-GM assistant
        ├── AISessionPlanner.js     # AI Session Outline & Replay generator
        ├── SmartSessionLog.js      # Auto-tagging session log
        ├── StoryArcTracker.js      # Story arc tracking
        ├── NPCRelationshipMap.js   # NPC network visualization
        ├── Soundboard.js           # Ambient sound effects
        └── LiveSessionMode.js      # Live session tools
```

## Implemented Features

### Phase 1: Core Platform (Complete)
Full auth, character CRUD, GM tools, world map, AI, 3D dice, soundboard, NPC network

### Phase 2: Backend Refactoring (Complete)
9700-line monolith split into 18 route files

### Phase 3: Player Page (Complete)
- **Batch A**: Combat Tab (spell slots, death saves, conditions, inspiration, rest)
- **Batch B**: Quick-Action Inventory (multi-currency, quick equip, attunement)
- **Batch C**: Smart Spellbook (prepared toggle, upcasting, Cast button)
- **Level Up Wizard**: Spellcasting step (slot progression, spell/cantrip selection)

### Phase 4: P1 Features (Complete)
- **Smart Session Log**: Auto-tagging (combat, loot, quest, travel, magic keywords), tag filtering
- **Location Detail Cards**: Hover preview on World Map pins
- **NPC Encounter Builder**: Quick NPC Bar in Combat Creator
- **Loot & Economy**: SRD Treasure Generator, gem/magic item gen, auto-split gold
- **Campaign Sidebar Fix**: Group headers auto-navigate on click

### Phase 5: Dice & Progression (Complete - March 31, 2026)
- **3D Dice Roller (BG3-style)**: Sequential animation with blue flames (Player), purple flames (GM), red/green for nat 1/20
- **Player Progression Dashboard**: Visual timeline, achievement badges, stat cards

### Phase 6: AI Planner & History (Complete - March 31, 2026)
- **Dice Roll History Sidebar**: Session-persistent roll log with timestamps, crit/fumble highlights, stats footer (NAT 20s, NAT 1s, AVG, TOTAL), Share Roll button for epic rolls. Integrated into both Player (CharacterSheetFull) and GM (GMScreen) pages with dual-theme styling.
- **AI Session Outline Auto-generator**: GM tool that auto-generates structured session outlines from campaign context (notes, NPCs, locations, journal). Configurable focus (balanced, combat-heavy, roleplay-heavy, exploration, mystery, political) and tone (classic fantasy, dark & gritty, lighthearted, horror, epic). Uses GPT-5.2 via Emergent LLM Key.
- **AI Session Replay Generator**: Generates narrative-style recaps from session data. Supports 4 writing styles (Epic Narrative, Historical Chronicle, Comedic Retelling, Dark Fantasy). Stored and retrievable per campaign.

## Prioritized Backlog

### P2 - Future Tasks
- Event System: Custom activities with configurable costs/risks
- Mini-game Engine: Gambling/racing with dice outcomes

### Known Issues
- Production Login/Password Reset: BLOCKED (External host config)
- Production Deployment Risk: Root cause of blank site unknown (BLOCKED)

## Key API Endpoints
- `PATCH /api/characters/{id}` - Partial update (HP, conditions, spell slots, currency, etc.)
- `PUT /api/characters/{id}/resources` - Sync class resources
- `POST /api/characters/{id}/rest` - Short/Long rest
- `POST /api/characters/{id}/level-up` - Level up with spell selections
- `POST /api/ai/session-outline/{campaign_id}` - Generate AI session outline
- `GET /api/ai/session-outlines/{campaign_id}` - List generated outlines
- `POST /api/ai/session-replay/{campaign_id}` - Generate AI session replay
- `GET /api/ai/session-replays/{campaign_id}` - List generated replays

## Test Iterations
- 62: Backend refactor 100% | 63: Player features 100% | 64: Batch A 100% | 65: Batch B/C 100%
- 67: P1 features 100% | 68: Dice & Progression 100% | 69: Dice History & AI Planner 100%

---
*Last Updated: March 31, 2026*
