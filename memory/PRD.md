# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build a TTRPG application called "Rookie Quest Keeper" (ROOK) for Players (character management) and Game Masters (campaign management, GM tools).

## Visual Theme: Cyber-Fantasy Dual Theme (Updated March 2026)

### Theme System
The app uses a **dual-theme system** with distinct color schemes:

#### Landing Page (Neutral Bridging Theme)
- **Background**: Dark (#080A1A) with purple and cyan gradient overlays
- **Accent Colors**: Purple (#8A2BE2) and Cyan (#4DD0E1) gradient

#### GM Mode - "Midnight Neon" (Purple/Violet)
- **Background**: Black (#0B0B0D) at top, fading to purple glow at bottom
- **Primary Accent**: Blue Violet (#8A2BE2)
- **Secondary Accent**: Indigo (#4B0082)
- **Usage**: Campaign Dashboard, GM Screen, Combat Page

#### Player Mode - "Electric Tundra" (Blue/Cyan)
- **Background**: Dark blue (#050A30) at top, fading to cyan glow at bottom
- **Primary Accent**: Cyan (#4DD0E1)
- **Secondary Accent**: Blue (#0066FF)
- **Usage**: Character Builder, Character Sheet

### Typography
- **Headings**: Outfit (sans-serif)
- **Body Text**: Manrope (sans-serif)
- **Logo Only**: Cinzel (serif) - ROOK branding only

### 3D Dice Roller
- **Background**: Dark blurred overlay (85% black with 20px blur)
- **GM Mode**: Purple glow at bottom, purple die borders
- **Player Mode**: Cyan glow at bottom, cyan die borders
- **Animation**: Spinning dice with smooth deceleration

## Current Access Model (March 2026)
- **Player Features**: NOW OPEN - Character creation, sheets, inventory
- **GM Features**: FULLY ACCESSIBLE - Create campaigns, GM tools, AI, etc.

## GM Screen Features (13 Tabs)
1. **Combat** - Combat control, encounters, quick combat
2. **Location** - Party location tracker
3. **NPCs** - Name generator + saved NPCs
4. **NPC Network** - Visual relationship map with full stat blocks, AI generation, editable NPCs
5. **Monsters** - Creature lookup + custom creatures
6. **Tables** - Random encounter tables
7. **Loot** - Treasure generator
8. **Dice** - Dice roller
9. **Party** - Party inventory, loot distribution
10. **Notes** - Session notes
11. **Story Arcs** - Quest/plot tracking with milestones
12. **Soundboard** - Ambient audio with built-in + custom sounds
13. **Uploads** - Consolidated file uploads for all campaign assets

### NPC Network Features (NEW - March 31, 2026)
- **Visual Graph**: Draggable NPC nodes on a zoomable/pannable canvas
- **Full Stat Blocks**: 6 ability scores (STR/DEX/CON/INT/WIS/CHA), HP, AC, Speed, Prof Bonus
- **Class-Appropriate Stats**: Saving throws, skills, attacks, abilities/features, and spells based on class
- **AI Generation**: GPT-4o powered NPC creation with race, class, level, role parameters
- **Editable NPCs**: Full edit modal with 6 sections (Basic, Stats, Combat, Abilities, Spells, Roleplay)
- **Relationship Mapping**: Connect NPCs with typed relationships (Ally, Enemy, Family, Business, Political, Romantic, Rival, Unknown)
- **Spellcaster Support**: Full spell blocks with casting ability, save DC, attack bonus, cantrips, and known spells
- **Backend API**: Full CRUD + AI generation endpoint at /api/campaigns/{id}/npcs/generate

### Soundboard Features
- **Built-in sounds**: Tavern, Forest, Campfire, Ocean, Battle, Wind, Rain, Storm, Night, Dungeon, Temple, Tension
- **Custom uploads**: Upload your own audio files
- **Master volume control** with mute toggle
- **Individual volume sliders** per sound

### Story Arc Tracker
- **Priority levels**: Main Quest, Side Quest, Character Arc, Background
- **Status tracking**: Planning, Active, Paused, Completed, Abandoned
- **Plot points**: Add milestones with completion checkboxes

### Uploads Tab
- **5 upload categories**:
  - Campaign Maps (cyan)
  - Character Portraits (green)
  - Documents & PDFs (gold)
  - Audio & Music (pink)
  - Other Files (purple)

## Subscription Tiers
| Tier | Price | Status | Features |
|------|-------|--------|----------|
| Free | £0 | Active | View campaigns (read-only), Basic dice roller |
| Player | TBD | Coming Soon | Create characters, Join campaigns, Full character sheets |
| Game Master | £3.99/mo | Active | Create campaigns, GM tools & AI, Combat tracker |
| Legendary | £5.99/mo | Active | Full GM access, Player tier included*, Priority AI |

## Recent Updates (March 31, 2026)

### NPC Network & Full Stat Blocks (Latest)
- Built complete NPC relationship map component with visual graph interface
- Expanded NPC data model: 6 ability scores, saving throws, skills, attacks, abilities, spells
- AI-powered NPC generation (GPT-4o) with class-appropriate stats
- Full edit modal with 6 sections for manual NPC creation/editing
- Relationship connections between NPCs with 8 relationship types
- Stat block panel displaying combat stats, ability scores, attacks, abilities, spells
- Integrated as 13th tab "NPC Network" in GM Screen

### Visual Overhaul
- **GM Screen Background**: Black at top → purple glow at bottom
- **Character Sheet Background**: Dark blue at top → cyan glow at bottom
- **3D Dice Roller**: Dark blurred overlay (85% black) with subtle theme-colored glow
- **Color Consistency**: Removed old pink/gold, replaced with purple (GM) and cyan (Player)
- **Live Session Mode**: Merged into GM Screen (removed floating panel)

### Player Section Unlocked
- "Coming Soon" overlay removed from Player section
- Character creation now accessible
- Character sheets now accessible

## Test Results
- **Latest test run**: iteration_59 - 7/7 backend, 100% frontend (NPC Network feature)
- **Previous test run**: iteration_58 - 26 tests passed (UI overhauls)

## Upcoming Tasks (Priority Order)

### P0 - Critical
1. **Finalize Equipment & Inventory System** - Equip/unequip with stat modifications

### P0 - High Priority
2. **Context-Aware AI Co-GM** - AI suggestions based on current tab
3. **Combat Flow Improvements** - Status effect library, AI tactical suggestions

### P1 - High Priority
4. **Smart Session Log** - Auto-tagging, AI recaps
5. **Map Creator Enhancements** - Pins, routes, fog of war

### P2 - Medium Priority
6. **Economy System** - City wealth, trade routes
7. **Event System** - Festivals, tournaments, markets
8. **Mini-Game Engine** - Horse racing, gambling, card games
9. **Session Replay Generator** - Narrative recaps
10. **Player Sync** - Real-time shared views

### Future Tasks
- PDF export/print for character sheets
- Live audio transcription ("ROOK listener")
- Virtual Tabletop (VTT) functionality
- AI-powered travel encounter generator

## Known Issues
- **Production Login/Password Reset Broken** - External environment configuration issue

## NPC Data Model
```json
{
  "id": "uuid",
  "campaign_id": "uuid",
  "name": "string",
  "race": "string",
  "class_name": "string",
  "level": 1,
  "alignment": "string",
  "description": "string",
  "appearance": "string",
  "personality": "string",
  "backstory": "string",
  "role": "string",
  "hp": 10,
  "max_hp": 10,
  "ac": 10,
  "speed": "30 ft.",
  "proficiency_bonus": 2,
  "stats": { "strength": 10, "dexterity": 10, "constitution": 10, "intelligence": 10, "wisdom": 10, "charisma": 10 },
  "saving_throws": ["strength", "constitution"],
  "skills": ["athletics", "perception"],
  "attacks": [{ "name": "Longsword", "bonus": "+6", "damage": "1d8+3 slashing", "notes": "" }],
  "abilities": [{ "name": "Extra Attack", "description": "Attack twice per Attack action" }],
  "spells": { "casting_ability": "Intelligence", "spell_save_dc": 15, "spell_attack_bonus": 7, "cantrips": [], "slot_level": 3, "slot_count": 2, "known_spells": [] },
  "location": "string",
  "notes": "string",
  "color": "#8A2BE2"
}
```

## Test Credentials
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!

---
*Last Updated: March 31, 2026*
