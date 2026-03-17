# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build a TTRPG application called "Rookie Quest Keeper" (ROOK) with a "Fantasy Sunset" theme. The application serves both Players (character management) and Game Masters (campaign management, GM tools).

## Visual Theme: Fantasy Sunset
All pages share a consistent visual theme:
- **Background**: Dark purple gradient over scenic mountain/sunset image
- **Glass Panels**: Frosted glass effect with backdrop blur (darker for better text visibility)
- **Accent Colors**: Purple (#390292), Pink (#ee006b), Orange (#ff3600)
- **Typography**: Cinzel for headers, Montserrat for body
- **Animations**: Tab hover glow, card hover scale, floating logo

## Current Access Model (March 2026)
- **Player Features**: LOCKED - "Coming Soon" overlay on home page
- **GM Features**: FULLY ACCESSIBLE - Create campaigns, GM tools, AI, etc.

## Subscription Tiers
| Tier | Price | Status | Features |
|------|-------|--------|----------|
| Free | £0 | Active | View campaigns (read-only), Basic dice roller, Limited access |
| Player | TBD | Coming Soon | Create characters, Join campaigns, Full character sheets, Inventory management |
| Game Master | £3.99/mo | Active | Create campaigns, GM tools & AI, Combat tracker, World building |
| Legendary | £5.99/mo | Active | Full GM access, Player tier included*, Priority AI, Early access |

*Player benefits included when Player tier launches

## Bug Fixes Completed (March 2026)

### P0/P1 Bugs (FIXED)
- [x] **Level Up Flow Fixed** - API URL corrected in LevelUpWizard.js
- [x] **Edit Character Fixed** - Added missing route, CharacterBuilder supports editMode
- [x] **HP Display Fixed** - Frontend clamps HP to maxHp when loading

### P2 Bugs (FIXED)
- [x] **Combat tracker enemy list** - Shows all 303 monsters (no limit)
- [x] **Monster Lookup** - Uses local MONSTER_DATABASE
- [x] **Landing page text visibility** - Darker glass panels with white text

## Implemented Features

### Landing Page
- [x] Centered logo with "KEEPER" in large white text with glow
- [x] Foggy glass panels for readability
- [x] 4-tier pricing: Free, Player (Coming Soon), GM (£3.99), Legendary (£5.99)
- [x] Legendary tier shows "Player tier included*" with explanatory note

### Home Dashboard
- [x] **Player Section**: LOCKED with "Coming Soon" overlay
  - Explains "Character creation, inventory management, and player tools are currently under development"
  - Suggests "Subscribe to Legendary tier to get early access when available!"
- [x] **GM Section**: Fully functional
  - Create/manage campaigns
  - Campaign navigation
  - All GM tools accessible

### Character System (Locked but Implemented)
- [x] Character sheet with Fantasy Sunset theme
- [x] **Character Edit Mode** - Edit via CharacterBuilder
- [x] **3D Dramatic Dice Roller** - Animated bouncing dice
- [x] **Clickable rolls** - Saves, skills, attacks, spells
- [x] **Level Up Wizard with MULTICLASSING**
- [x] **Equipment & Inventory System** - 3,059 items database
- [x] **Temporary HP** - Blue field with +/- controls, absorbs damage first
- [x] **Proficient Skills** - Purple glow highlighting

### GM Features
- [x] Campaign Dashboard with Fantasy Sunset theme
- [x] GM Screen with combat tools
- [x] Monster Lookup (303 SRD monsters)
- [x] Combat tracker
- [x] AI tools integration

### Integrations
- [x] Stripe (subscription tiers)
- [x] Resend (email)
- [x] Emergent LLM Key (ROOK AI)

## Remaining Tasks

### When Player Tier Launches
1. Remove "Coming Soon" overlay from Player section
2. Enable character creation for Player/Legendary subscribers
3. Connect inventory system to character sheet
4. Enable real-time GM loot drops

### Upcoming Features
1. **Real-time GM Loot System** - Drag-drop loot via WebSockets
2. **Map Creator Enhancements** - Textured tools, pan/zoom
3. **Player Timeline UI** - Display campaign events

### Future/Backlog
1. Soundboard with ambient noises
2. PDF export for character sheets
3. Live audio transcription
4. VTT with video/audio chat
5. Backend refactoring (split server.py - 8000+ lines)

## Technical Architecture
```
/app/frontend/src/
├── components/
│   ├── LandingPage.js        - 4-tier pricing, centered logo
│   ├── UnifiedDashboard.js   - Player section locked, GM functional
│   ├── CharacterBuilder.js   - Edit mode support
│   ├── CharacterSheetFull.js - Temp HP, inventory, proficient skills
│   ├── CharacterInventory.js - Equipment slots, 3000+ items
│   ├── LevelUpWizard.js      - Multiclassing support
│   └── MonsterLookup.js      - Local 303-monster database
└── data/
    ├── itemsDatabase.js      - 3,059 SRD items
    └── monsterDatabase.js    - 303 SRD monsters
```

## Test Credentials (Preview Only)
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!
