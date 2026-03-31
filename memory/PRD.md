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
        │   ├── CharacterSpellbook.js     # Smart Spellbook (NEW)
        │   ├── CharacterInventory.js     # Quick-Action Inventory
        │   └── LevelUpWizard.js          # Spellcasting-aware Level Up
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
- 3D dice roller
- Soundboard
- Story Arc Tracker
- NPC Relationship Network

### Phase 2: Backend Monolith Refactoring (Complete - March 2026)
- Split 9700-line server.py into 18 modular route files
- Extracted all Pydantic models to /models/__init__.py
- 100% test pass rate (iteration_62)

### Phase 3: Player Page Improvements (Complete - March 31, 2026)

**Batch A - Combat Dashboard:**
- CharacterCombatTab.js: Spell slots, Death Saves, Hit Dice, Conditions, Concentration, Inspiration tracking
- PATCH endpoint for character partial updates (HP, conditions, death saves, spell slots, etc.)
- Short Rest / Long Rest endpoints with proper hit dice spending
- Level Up Wizard spellcasting step: spell slot progression display, cantrip selection, spell selection for known casters, Wizard spellbook additions
- 100% test pass rate (iteration_64)

**Batch B - Quick-Action Inventory:**
- Multi-currency system (CP/SP/EP/GP/PP) with total GP value display
- Currency converter with quick-convert buttons
- Quick equip/unequip toggle buttons on each item row
- EQUIPPED badge visual indicator
- Attunement tracking (max 3 magic items)
- Auto-save with AC calculation from equipped gear

**Batch C - Smart Spellbook:**
- Dedicated CharacterSpellbook.js component
- Spell DC / Spell ATK / Ability stat display
- Clickable spell slot tracking (use/recover/reset)
- Prepared vs Known spell toggle for prepared casters
- Spell search filter
- Cantrip damage rolls
- Cast button with upcast level selector and damage scaling
- Spell school color coding
- 100% test pass rate (iteration_65)

## Prioritized Backlog

### P1 - Upcoming Tasks
- Smart Session Log: Auto-tagging notes
- Location Detail Cards: Hover previews on World Map pins
- AI Session Outline Auto-generator: AI Co-GM session outlines
- NPC Encounter Builder: Drag NPCs from network into Combat tracker
- Loot and Economy System: Shared party loot, dynamic economy

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

## 3rd Party Integrations
- Stripe: Subscriptions (requires user API key)
- Resend: Emails (requires user API key)
- Emergent LLM Key: AI features via emergentintegrations

## Test Credentials
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!

---
*Last Updated: March 31, 2026*
