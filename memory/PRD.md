# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build a TTRPG application called "Rookie Quest Keeper" (ROOK) for Players (character management) and Game Masters (campaign management, GM tools).

## Visual Theme: Cyber-Fantasy Dual Theme (Updated March 2026)

### Theme System
The app uses a **dual-theme system** with three distinct color schemes:

#### Landing Page (Neutral Bridging Theme)
- **Background**: Dark (#080A1A) with purple and cyan gradient overlays
- **Glass Panels**: Frosted glass with blue-tinted backdrop blur
- **Accent Colors**: Purple (#8A2BE2) and Cyan (#4DD0E1) gradient

#### GM Mode - "Midnight Neon" (Purple/Violet)
- **Background**: Pure black (#0B0B0D)
- **Surface**: Dark gray (#131317)
- **Primary Accent**: Blue Violet (#8A2BE2)
- **Secondary Accent**: Indigo (#4B0082)
- **Usage**: Campaign Dashboard, GM Screen, Combat Page

#### Player Mode - "Electric Tundra" (Blue/Cyan)
- **Background**: Deep blue (#050A30)
- **Surface**: Dark blue (#0A1140)
- **Primary Accent**: Cyan (#4DD0E1)
- **Secondary Accent**: Blue (#0066FF)
- **Usage**: Character Builder, Character Sheet

### Typography
- **Headings**: Outfit (sans-serif)
- **Body Text**: Manrope (sans-serif)
- **Logo Only**: Cinzel (serif) - ROOK branding only

## Current Access Model (March 2026)
- **Player Features**: LOCKED - "Coming Soon" overlay on home page
- **GM Features**: FULLY ACCESSIBLE - Create campaigns, GM tools, AI, etc.

## Subscription Tiers
| Tier | Price | Status | Features |
|------|-------|--------|----------|
| Free | £0 | Active | View campaigns (read-only), Basic dice roller, Limited access |
| Player | TBD | Coming Soon | Create characters, Join campaigns, Full character sheets |
| Game Master | £3.99/mo | Active | Create campaigns, GM tools & AI, Combat tracker, World building |
| Legendary | £5.99/mo | Active | Full GM access, Player tier included*, Priority AI, Early access |

## Recent Updates (March 2026)

### Complete UI Redesign (NEW - March 31, 2026)
- **Replaced** old "Fantasy Sunset" theme (pink/orange/purple Instagram-like gradients)
- **Implemented** dual-theme system: Midnight Neon (GM) and Electric Tundra (Player)
- **Created** ThemeContext.js for automatic theme switching based on routes
- **Updated** all major components: LandingPage, AuthPage, UnifiedDashboard, CampaignDashboard, GMScreen, CharacterSheetFull
- **Changed** fonts from Cinzel/Montserrat to Outfit/Manrope (Cinzel reserved for logo)

### Copyright Cleanup (March 17, 2026)
- **Removed** all copyrighted D&D items from itemsDatabase.js (3,059 items)
- **Replaced** with SRD-only items (92 items) under Creative Commons
- **Removed** copyrighted items_database.json from backend
- **Removed** "Death Tyrant" (Beholder-related) from monsterDatabase.js
- **Retained** SRD spells and classes (Open Gaming License)

### Persistent Quick Dice Panel
- Always visible on right side of GM Screen across all tabs
- Quick Roll buttons: d4, d6, d8, d10, d12, d20
- Common Rolls: Attack (d20), Advantage (2d20 high), Disadvantage (2d20 low), Damage (2d6), Fireball (8d6)
- Percentile: Roll d100
- Collapsible: Can minimize to icon-only mode

### GM Screen Tab Consolidation (9 Tabs)
1. Combat - Combat control, encounters, quick combat
2. Location - Party location tracker
3. NPCs - Name generator + saved NPCs (merged)
4. Monsters - Creature lookup + custom creatures (merged)
5. Tables - Random encounter tables
6. Loot - Treasure generator
7. Dice - Dice roller
8. Party - Party inventory, loot distribution
9. Notes - Session notes

## Implementation Files

### Theme System
- `/app/frontend/src/index.css` - CSS variables and dual-theme definitions
- `/app/frontend/src/contexts/ThemeContext.js` - Theme switching context
- `/app/frontend/src/App.js` - ThemeRouter component

### Key Components (Updated for new theme)
- `/app/frontend/src/components/LandingPage.js` - Neutral bridging theme
- `/app/frontend/src/components/AuthPage.js` - Neutral theme
- `/app/frontend/src/components/UnifiedDashboard.js` - GM/Player split view
- `/app/frontend/src/components/CampaignDashboard.js` - Midnight Neon theme
- `/app/frontend/src/components/GMScreen.js` - Midnight Neon theme
- `/app/frontend/src/components/CharacterSheetFull.js` - Electric Tundra theme

### Data Files (Copyright Clean)
- `/app/frontend/src/data/itemsDatabase.js` - SRD-only items (92 items)
- `/app/frontend/src/data/monsterDatabase.js` - SRD monsters only
- `/app/frontend/src/data/spellDatabase.js` - SRD spells (OGL)
- `/app/backend/data/srd/classes.json` - SRD classes (OGL)

## Upcoming Tasks (Priority Order)

### P0 - Critical
1. **Finalize Equipment & Inventory System** - Implement equip/unequip functionality that modifies character stats (AC, attack bonuses)

### P1 - High Priority
2. **Character Sheet UI/UX Overhaul** - Condense layout to fit all major sections on one screen without scrolling
3. **Real-time GM Loot System** - Enable drag-and-drop loot assignment with WebSocket push to players
4. **Map Creator Enhancements** - Textured drawing tools, wall/door tools, smooth pan/zoom

### P2 - Medium Priority
5. **Player Timeline & Note Sync UI** - Backend endpoints exist, build frontend components

### Future Tasks
- Soundboard with ambient noises
- Map sharing to second screen
- PDF export/print for character sheets
- Live audio transcription ("ROOK listener")
- Virtual Tabletop (VTT) functionality
- AI-powered travel encounter generator

## Known Issues
- **Production Login/Password Reset Broken** - External environment configuration issue (database credentials, Resend API key, domain verification). Cannot be fixed from preview environment.

## Test Credentials
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!

## Third-Party Integrations
- **Stripe**: Subscriptions (User API Key required)
- **Resend**: Email sending (User API Key required)
- **Emergent LLM Key**: AI features via emergentintegrations
- **PyMuPDF**: PDF text extraction

---
*Last Updated: March 31, 2026*
