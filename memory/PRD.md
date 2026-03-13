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
- **Support for both D&D 5e 2014 and 2024 rules**
- **Custom logos integrated throughout app**
- **SRD/OGL compliant content only**

## Implemented Features (as of March 2026)

### Authentication & Dashboard
- [x] User authentication (JWT-based)
- [x] Admin panel
- [x] Unified dashboard with side-by-side Player/GM sections
- [x] Inline campaign creation modal
- [x] **Subscription tier badge showing campaign limits**
- [x] **Proactive campaign limit check before creation**
- [x] **Custom mini logo in dashboard header**

### Character System
- [x] Full character sheet with compact layout
- [x] **Edition selector (2014 vs 2024 rules)**
- [x] **Subrace selection** (High Elf, Wood Elf, Hill Dwarf, etc.)
- [x] **Subclass selection** with level-appropriate timing
- [x] **ASI bonuses** displayed inline (base + racial bonus = final)
- [x] 3-column Combat tab (Actions, Bonus Actions, Reactions)
- [x] **3D Dramatic Dice Roller** - animated bouncing dice with glow effects
- [x] **All clickable rolls** - Saving throws, skill checks, attack rolls all trigger 3D dice
- [x] **Level Up Wizard with MULTICLASSING** - choose to continue class or multiclass
- [x] **Dynamic spellcasting tab** - shows correct ability (INT/WIS/CHA) based on class
- [x] **Spell slots display** based on character level and class type
- [x] Cantrips and prepared spells tracking
- [x] Spells, Inventory, Notes tabs

### Branding & UI
- [x] **Custom Rookie Quest Keeper logos** (main + mini)
- [x] **Grand animated KEEPER title** - large, glowing, shimmer effect
- [x] **Floating logo animation** on landing page
- [x] **Fixed background** that scrolls with page
- [x] Mini dragon compass logo in nav/header
- [x] Logo on auth pages

### Pricing & Subscriptions
- [x] **Monthly/Yearly billing toggle**
- [x] **Yearly savings display** (e.g., "Save £7.89/year (~16% off)")
- [x] Per-month equivalent shown for yearly plans
- [x] Promo code support

### Combat System
- [x] **Combat Page with Fantasy Sunset theme**
- [x] Initiative tracker with turn order
- [x] HP tracking with +/- buttons
- [x] Death saves, conditions management

### GM-Player Sync (NEW)
- [x] **Campaign Timeline** - Events visible to GM and players
- [x] **GM Note Sync** - Push notes from GM to player character notes
- [x] **Session Recaps** - Auto-synced to players
- [x] **Player Timeline API** - View all events across joined campaigns

### Integrations
- [x] Stripe (subscription tiers)
- [x] Resend (email)
- [x] Emergent LLM Key (ROOK AI)

## Known Issues
1. **Production Login/Password Reset** - User reports inability to login on production site. Preview works correctly. May be database or Resend email config issue on production deployment.

## Upcoming Tasks (P1)
1. Build frontend UI for player timeline display
2. Add GM note sync UI on GM Screen
3. Test spell dice clicking functionality
4. Test all class actions (Barbarian rage, etc.)

## Future Tasks (P2+)
- Real-time Campaign Sync (WebSockets)
- Backend refactoring (split server.py)
- Custom rules JSON upload system
- Quick Start Tutorial for GMs

## Technical Architecture
```
/app
├── backend/
│   └── server.py
└── frontend/
    ├── public/
    │   └── images/
    │       ├── logo-main.png   (full "Rookie Quest" logo)
    │       └── logo-mini.png   (dragon compass logo)
    └── src/
        ├── components/
        │   ├── ui/
        │   │   └── DiceRoller3D.js  (NEW - 3D animated dice)
        │   ├── AuthPage.js         (mini logo added)
        │   ├── CharacterBuilder.js (2014/2024 editions)
        │   ├── CharacterSheetFull.js (3D dice, dynamic spells)
        │   ├── CombatPage.js
        │   ├── GMScreen.js
        │   ├── LandingPage.js      (grand animated KEEPER)
        │   ├── LevelUpWizard.js    (MULTICLASSING support)
        │   ├── PricingPage.js      (yearly savings display)
        │   └── UnifiedDashboard.js (tier badge, mini logo)
        └── data/
            ├── characterRules5e.js (multiclass requirements)
            └── spellDatabase.js
```

## New API Endpoints
- `GET /api/campaigns/{id}/timeline` - Get campaign timeline events
- `POST /api/campaigns/{id}/timeline` - Create timeline event
- `POST /api/campaigns/{id}/sync-note` - Sync GM note to players
- `GET /api/player/timeline` - Get all timeline events for player

## Test Credentials (Preview Only)
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!
