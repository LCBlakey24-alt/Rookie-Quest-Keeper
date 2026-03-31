# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build an immersive, context-aware TTRPG (Tabletop RPG) application with strict SRD 5.1 compliance. Features include dual-theme design (Midnight Neon for GM, Electric Tundra for Players), advanced GM tools, and a combat-ready player dashboard that surpasses D&D Beyond.

## Core Requirements
1. **Strict Copyright Compliance**: No WotC copyrighted material; SRD 5.1/Public Domain only.
2. **Dual-Theme Design**: Midnight Neon (GM) + Electric Tundra (Player)
3. **Advanced GM Tools**: 3D dice roller, Soundboard, Story Arc Tracker, NPC Relationship Mapping
4. **Player Dashboard**: Smarter than D&D Beyond with automatic resource tracking, improved Level-Up Wizard, easy custom inventory management

## Architecture
```
/app
├── backend/
│   ├── server.py              # Thin orchestrator (~150 lines)
│   ├── config.py              
│   ├── models/                # Pydantic models (~1900 lines)
│   ├── routes/                # 18 modular route files
│   ├── utils/                 # auth.py, helpers.py, ws_manager.py
│   └── data/srd/              
└── frontend/
    └── src/
        ├── components/
        │   ├── CharacterSheetFull.js 
        │   ├── CharacterCombatTab.js     # Combat dashboard
        │   ├── CharacterSpellbook.js     # Smart Spellbook
        │   ├── CharacterInventory.js     # Quick-Action Inventory
        │   ├── LevelUpWizard.js          # Spellcasting-aware Level Up
        │   ├── SessionJournal.js         # Smart Session Log with auto-tagging
        │   ├── PartyInventory.js         # Loot/Economy with treasure generator
        │   ├── CampaignDashboard.js      # Fixed sidebar group navigation
        │   └── tabs/
        │       ├── WorldMapTab.js        # Pin hover preview cards
        │       └── CombatCreatorTab.js   # Quick NPC Bar
        └── data/
            ├── classFeatures.js
            ├── classResources.js
            └── spellDatabase.js
```

## What's Been Implemented

### Phase 1: Core TTRPG Platform (Complete)
- Full auth system (JWT + Stripe subscriptions)
- Character creation, editing, management
- GM tools: Campaign management, combat tracker, NPC generator
- World map with interactive pins
- AI integration (Co-GM, NPC generation)
- 3D dice roller, Soundboard, Story Arc Tracker
- NPC Relationship Network

### Phase 2: Backend Monolith Refactoring (Complete - March 2026)
- Split 9700-line server.py into 18 modular route files
- Extracted all Pydantic models to /models/__init__.py
- 100% test pass rate (iteration_62)

### Phase 3: Player Page Improvements (Complete - March 31, 2026)

**Batch A - Combat Dashboard:**
- CharacterCombatTab.js: Spell slots, Death Saves, Hit Dice, Conditions, Concentration, Inspiration
- PATCH endpoint for character partial updates
- Short Rest / Long Rest endpoints
- Level Up Wizard spellcasting step: spell slot progression, cantrip/spell selection, Wizard spellbook
- 100% test pass (iteration_64)

**Batch B - Quick-Action Inventory:**
- Multi-currency system (CP/SP/EP/GP/PP) with converter
- Quick equip/unequip toggle buttons
- Attunement tracking (max 3 magic items)
- Auto-save with AC calculation

**Batch C - Smart Spellbook:**
- Dedicated CharacterSpellbook.js component
- Spell DC / Spell ATK / Ability display
- Clickable spell slot tracking with reset
- Prepared vs Known spell toggle
- Spell search, Cast button with upcast level selector
- 100% test pass (iteration_65)

### Phase 4: P1 Features (Complete - March 31, 2026)

**Smart Session Log:**
- SessionJournal integrated into character sheet as 'journal' tab
- Auto-tagging: detects combat, loot, quest, travel, social, danger, magic, death, mystery keywords
- Tag chips display with color coding
- Tag-based filtering of entries
- Auto-detected tags shown during entry creation

**Location Detail Cards:**
- Hover preview cards on World Map pins
- Shows location name, type, description snippet
- Glassmorphism card with pin-colored border
- Linked location indicator

**NPC Encounter Builder:**
- Quick NPC Bar above encounter builder in Combat Creator
- One-click add campaign NPCs to combat with HP/AC display
- NPC count badge showing duplicates in encounter

**Loot and Economy System:**
- SRD Treasure Tables (Individual + Hoard by CR tier)
- Treasure Generator with CR selector and Hoard toggle
- Gem and magic item generation from SRD tables
- Auto-split gold among party members
- One-click "Add to Party Loot" for generated treasure

**Campaign Sidebar Fix:**
- Group headers now auto-navigate to first tab when clicked from outside the group

**All P1 features: 100% test pass (iterations 66-67)**

## Prioritized Backlog

### P2 - Future Tasks
- Event System: Custom activities with configurable costs/risks
- Mini-game Engine: Gambling/racing with dice outcomes
- Session Replay Generator: Narrative-style recaps

### Known Issues
- Production Login & Password Reset: BLOCKED (External host config)
- Production Deployment Risk: Root cause of blank site unknown (BLOCKED)

## Key API Endpoints
- `PATCH /api/characters/{id}` - Partial character update (HP, conditions, spell slots, currency, etc.)
- `PUT /api/characters/{id}/resources` - Sync class resources
- `POST /api/characters/{id}/rest` - Short/Long rest
- `POST /api/characters/{id}/level-up` - Level up with spell selections
- `GET /api/player/journal` - Player journal entries
- `POST /api/player/journal` - Create journal entry with auto-tags

## 3rd Party Integrations
- Stripe: Subscriptions (requires user API key)
- Resend: Emails (requires user API key)
- Emergent LLM Key: AI features via emergentintegrations

## Test Credentials
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!

---
*Last Updated: March 31, 2026*
