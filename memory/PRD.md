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

## GM Screen Features (Updated March 31, 2026)

### 12 Tabs in GM Screen
1. **Combat** - Combat control, encounters, quick combat
2. **Location** - Party location tracker
3. **NPCs** - Name generator + saved NPCs
4. **Monsters** - Creature lookup + custom creatures
5. **Tables** - Random encounter tables
6. **Loot** - Treasure generator
7. **Dice** - Dice roller
8. **Party** - Party inventory, loot distribution
9. **Notes** - Session notes
10. **Story Arcs** (NEW) - Quest/plot tracking with milestones
11. **Soundboard** (NEW) - Ambient audio with built-in + custom sounds
12. **Uploads** (NEW) - Consolidated file uploads for all campaign assets

### New GM Screen Features

#### 3D Animated Dice Roller
- Full-screen animated dice overlay (matching player page style)
- Purple gradient background for GM theme
- Critical hit/miss visual feedback
- Triggered from Quick Dice panel on right side

#### Soundboard
- **Built-in sounds**: Tavern, Forest, Campfire, Ocean, Battle, Wind, Rain, Storm, Night, Dungeon, Temple, Tension
- **Category filters**: All, Nature, Locations, Weather, Action, Mood, Custom
- **Custom uploads**: Upload your own audio files
- **Master volume control** with mute toggle
- **Individual volume sliders** per sound
- **Stop All** button for quick silence

#### Story Arc Tracker
- Create and manage story arcs/quests
- **Priority levels**: Main Quest, Side Quest, Character Arc, Background
- **Status tracking**: Planning, Active, Paused, Completed, Abandoned
- **Plot points**: Add milestones with completion checkboxes
- **Progress tracking**: Visual progress indicator

#### Uploads Tab
- **5 upload categories**:
  - Campaign Maps (cyan) - world maps, dungeon maps
  - Character Portraits (green) - NPC/PC art
  - Documents & PDFs (gold) - rulebooks, handouts
  - Audio & Music (pink) - sound effects, music
  - Other Files (purple) - misc assets
- **Progress tracking** during uploads
- **Recent uploads** history

#### Live Session Mode
- Floating button (lightning bolt) in bottom right
- Slide-out panel with quick access tools
- **Quick Actions**: d20, 2d6 damage, Combat, Generate NPC
- **Party quick view**: HP status at a glance
- **Quick note** input
- **Quick navigation** to key tabs

### Persistent Quick Dice Panel
- Always visible on right side of GM Screen
- **Quick Roll buttons**: d4, d6, d8, d10, d12, d20
- **Common Rolls**: Attack (d20), Advantage (2d20), Damage (2d6), Fireball (8d6)
- **Percentile**: Roll d100
- All rolls now trigger 3D animated dice overlay

## Current Access Model
- **Player Features**: LOCKED - "Coming Soon" overlay on home page
- **GM Features**: FULLY ACCESSIBLE - Create campaigns, GM tools, AI, etc.

## Subscription Tiers
| Tier | Price | Status | Features |
|------|-------|--------|----------|
| Free | £0 | Active | View campaigns (read-only), Basic dice roller |
| Player | TBD | Coming Soon | Create characters, Join campaigns, Full character sheets |
| Game Master | £3.99/mo | Active | Create campaigns, GM tools & AI, Combat tracker |
| Legendary | £5.99/mo | Active | Full GM access, Player tier included*, Priority AI |

## Implementation Files

### Theme System
- `/app/frontend/src/index.css` - CSS variables and dual-theme definitions
- `/app/frontend/src/contexts/ThemeContext.js` - Theme switching context

### GM Screen Components
- `/app/frontend/src/components/GMScreen.js` - Main GM Screen with 12 tabs
- `/app/frontend/src/components/gm/Soundboard.js` - Ambient audio system
- `/app/frontend/src/components/gm/StoryArcTracker.js` - Quest/arc tracking
- `/app/frontend/src/components/gm/UploadTab.js` - Consolidated uploads
- `/app/frontend/src/components/gm/LiveSessionMode.js` - Quick access panel
- `/app/frontend/src/components/gm/SmartSessionLog.js` - Enhanced notes (ready for integration)
- `/app/frontend/src/components/ui/DiceRoller3D.js` - 3D animated dice

### Data Files (Copyright Clean)
- `/app/frontend/src/data/itemsDatabase.js` - SRD-only items (92 items)
- `/app/frontend/src/data/monsterDatabase.js` - SRD monsters only
- `/app/frontend/src/data/spellDatabase.js` - SRD spells (OGL)

## Recent Updates (March 31, 2026)

### GM Screen Major Enhancements
- Added 3 new tabs: Story Arcs, Soundboard, Uploads
- Implemented 3D animated dice roller (purple theme)
- Created Soundboard with 12 built-in sounds + custom upload
- Created Story Arc Tracker with priorities and milestones
- Created Uploads tab with 5 categorized upload zones
- Added Live Session Mode floating panel
- Updated Quick Dice panel to use 3D animations

### Complete UI Redesign
- Replaced "Fantasy Sunset" theme with dual-theme system
- GM pages: Midnight Neon (purple/violet)
- Player pages: Electric Tundra (blue/cyan)
- New fonts: Outfit/Manrope (Cinzel for logo only)

### Copyright Cleanup
- Removed all copyrighted D&D items
- Replaced with SRD-only content (Creative Commons)

## Upcoming Tasks (Priority Order)

### P0 - Critical
1. **Finalize Equipment & Inventory System** - Equip/unequip with stat modifications

### P1 - High Priority
2. **Character Sheet UI/UX Overhaul** - Condense to single screen
3. **Real-time GM Loot System** - Drag-and-drop with WebSockets
4. **Map Creator Enhancements** - Pins, routes, fog of war
5. **NPC Relationship Mapping** - Visual connections between NPCs
6. **Context-Aware AI Co-GM** - AI suggestions based on current tab

### P2 - Medium Priority
7. **Combat Flow Improvements** - Status effect library, AI tactical suggestions
8. **Economy System** - City wealth, trade routes
9. **Event System** - Festivals, tournaments, markets
10. **Mini-Game Engine** - Horse racing, gambling, card games
11. **Session Replay Generator** - Narrative recaps

### Future Tasks
- Player sync for shared views
- PDF export/print for character sheets
- Live audio transcription ("ROOK listener")
- Virtual Tabletop (VTT) functionality
- AI-powered travel encounter generator

## Known Issues
- **Production Login/Password Reset Broken** - External environment configuration issue

## Test Credentials
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!

## Test Results
- **Latest test run**: 29/29 tests passed (100%)
- **Test file**: `/app/test_reports/iteration_57.json`

---
*Last Updated: March 31, 2026*
