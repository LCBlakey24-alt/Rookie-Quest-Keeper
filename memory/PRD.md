# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build a TTRPG application called "Rookie Quest Keeper" (ROOK) with a "Fantasy Sunset" theme. The application serves both Players (character management) and Game Masters (campaign management, GM tools).

## User Personas
1. **Players** - Create and manage D&D characters, view character sheets, join campaigns
2. **Game Masters** - Create campaigns, manage world-building, run combat encounters, generate NPCs

## Core Requirements
- Full-stack React/FastAPI/MongoDB application
- "Fantasy Sunset" visual theme (dark purples, pinks, gold, glassmorphism)
- Unified dashboard with Characters (left) and Campaigns (right) side-by-side
- Compact, single-frame character sheets with scrollable inner containers
- GM Screen with comprehensive tools (combat, dice, monsters, NPCs, etc.)
- Stripe integration for subscription tiers

## Implemented Features (as of March 2026)

### Authentication & Dashboard
- [x] User authentication (JWT-based)
- [x] Admin panel
- [x] Unified dashboard with side-by-side Player/GM sections
- [x] Inline campaign creation modal (no navigation away)
- [x] Character creation via CharacterBuilder

### Character System
- [x] Full character sheet with compact layout
- [x] Ability scores with saving throw rolls
- [x] Skills list with proficiency indicators
- [x] Combat stats (HP, AC, Initiative, Speed)
- [x] 3-column Combat tab (Actions, Bonus Actions, Reactions)
- [x] Clickable dice rolls with toast notifications
- [x] Spells, Inventory, Notes tabs
- [x] Improved text readability (larger font sizes)
- [x] **NEW: Level Up Wizard** - Multi-step guided level up with:
  - HP method selection (average vs roll)
  - Interactive dice rolling
  - ASI/Feat selection at appropriate levels
  - Full 5e feat list with descriptions

### Campaign Management
- [x] Campaign CRUD operations
- [x] World-building tools (Setting, Maps, Gods, Locations, NPCs)
- [x] Chronicle for session tracking
- [x] Combat encounters and battle maps

### GM Screen
- [x] "Fantasy Sunset" theme applied
- [x] Combat control with encounter selection
- [x] NPC Name Generator
- [x] Dice Roller
- [x] Monster Lookup
- [x] Custom Creatures Manager
- [x] Random Tables
- [x] Loot Generator
- [x] Party Overview
- [x] Session Notes

### Integrations
- [x] Stripe (subscription tiers on landing page)
- [x] Resend (email)
- [x] Emergent LLM Key (ROOK AI features)
- [x] PyMuPDF (PDF extraction)

## Removed/Deprecated Components
- PlayerDashboard.js (functionality moved to UnifiedDashboard)
- CampaignList.js (functionality moved to UnifiedDashboard)
- CharacterSheet.js (replaced by CharacterSheetFull)
- FloatingDiceRoller.js (removed per user request)
- LevelUpModal.js (replaced by LevelUpWizard)

## Known Issues
- **Production Deployment Risk** - Previous "blank screen" issue after deployment; root cause unknown
- **Password Reset URL** - Fix pending user verification on production
- **Admin Account on Production** - May not work due to database differences

## Upcoming Tasks (P1)
1. Test Stripe checkout flow
2. Combat Tracker Enhancements - Initiative roller, HP tracking, turn order display

## Future Tasks (P2+)
- Real-time Campaign Sync (WebSockets)
- Backend refactoring (split server.py into modular routers)
- Quick Start Tutorial for GMs
- AI-powered travel time estimation
- Session Notes/Journal feature
- "Fog of war" map view for players
- Shareable World Codex

## Technical Architecture
```
/app
├── backend/
│   └── server.py (monolithic - needs refactoring)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AuthPage.js
    │   │   ├── CharacterBuilder.js
    │   │   ├── CharacterSheetFull.js
    │   │   ├── GMScreen.js
    │   │   ├── LandingPage.js
    │   │   ├── LevelUpWizard.js  # NEW
    │   │   └── UnifiedDashboard.js
    │   └── index.css (global styles)
```

## Test Credentials (Preview Environment Only)
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!
