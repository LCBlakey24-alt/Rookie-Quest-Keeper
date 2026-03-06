# Rookie Quest Keeper - Product Requirements Document

## Overview
Rookie Quest Keeper is a comprehensive TTRPG campaign management application designed for Game Masters (GMs) and Players to run better tabletop sessions.

## Product Vision
An all-in-one campaign operating system for 5e combining worldbuilding, AI content generation (ROOK), combat control, player tools, and live session features.

---

## Recent Major Updates (March 2026)

### Rule System & Content Management
- **Database-driven rule systems**: Support for D&D 5e 2014, 5e 2024, and custom systems
- **Content storage**: Classes, subclasses, races, spells, items, feats, monsters, class features
- **Mass upload**: JSON and CSV file upload for bulk content import
- **AI rule awareness**: AI generation respects campaign rule system (2024 vs 2014 terminology)
- **Custom systems**: Users can create custom rule systems (e.g., Sci-Fi with custom skills)

### Character Multiclassing
- **Multiclass API**: Add new classes to characters with requirement checking
- **Level-up specific class**: Choose which class to level up for multiclass characters
- **Proficiency handling**: Automatic multiclass proficiency grants

### Admin Features
- **Rule System Manager**: New tab in Admin panel for managing game content
- **Content upload UI**: Visual interface for uploading classes, races, spells, etc.
- **System selector**: Switch between 2014, 2024, and custom systems

---

## Monetization (Updated March 2026)

### Subscription Tiers

| Tier | Monthly | Yearly | Target |
|------|---------|--------|--------|
| **Free** | $0 | $0 | Casual players |
| **Hero** | $3.99 | $39.99 (~2mo free) | Serious players |
| **Quest Master** | $3.99 | $39.99 (~2mo free) | GMs |
| **Legendary** | $5.99 | $59.99 (~2mo free) | GM who also plays |

### Feature Breakdown

**Free:**
- 1 character
- Join campaigns (can't create)
- Basic character sheet
- Dice roller
- 3 AI generations/month

**Hero (Player):**
- Unlimited characters
- Character journal
- Party inventory
- Session recaps
- AI portrait generation
- 50 AI calls/month

**Quest Master (GM):**
- Unlimited campaigns
- Full world building
- ROOK AI generation
- Combat tracker
- Reference tools
- Session mode
- Unlimited AI

**Legendary (Both):**
- Everything in Hero + Quest Master
- Priority support
- Early access to features

### Promo Codes System
- Tiers: player, gm, legendary
- Duration: 7 days to Forever
- Uses: Unlimited or limited
- Description field for internal notes
- Existing codes (e.g., CRITICALMIND) give lifetime legendary access

---

## Design System (Updated March 2026)

### Dark Minimalist Theme

**Color Palette:**
- **Background Colors:**
  - Black: `#0D0D0D`
  - Dark: `#141414`
  - Panel: `#1A1A1A`
  - Card: `#1F1F1F`
  - Hover: `#2A2A2A`

- **Accent Color - CRIMSON RED:**
  - Red: `#E11D48` (rgb(225, 29, 72))
  - Red Hover: `#F43F5E`
  - Red Subtle: `rgba(225, 29, 72, 0.15)`

- **Text Colors (WHITE ONLY):**
  - White: `#FFFFFF`
  - Secondary: `#B3B3B3`
  - Muted: `#808080`

### UI Elements
- **ALL corners are SQUARE** (no rounded - 0px border-radius)
- **Font:** Cityworm for branding, Inter for body text
- **GM/DM Sections:** Red accents (`#E11D48`)
- **Player Sections:** Blue accents (`#3B82F6`) - differentiates player experience

### Tab Navigation (Sidebar)
- **Position:** Left sidebar on Campaign Dashboard and GM Screen
- **Default state:** Dark grey background, grey text
- **Hover state:** Lighter grey background + 3px red bar slides in from right
- **Active state:** Full #E11D48 red background, white text

### Sidebar Tab Groups (Campaign Dashboard)
- **World Group:** Setting, World Builder, Gods, Locations, NPCs, Calendar
- **Combat Group:** Combat, Battle Maps, Encounter Gen
- **Standalone Tabs:** References, Inventory, Players, Notes

### Dice Roller
- **Position:** Bottom-LEFT corner (left: 24px, bottom: 24px)
- **Theme:** Dark background, red header, square corners
- **Features:** Quick dice buttons (d4-d100), Advantage roll, custom dice input
- **Keyboard shortcut:** Press `R` to toggle

---

## Brand Assets

### Logos
- **Main Logo:** `/public/rqk-main-logo.svg` - Cityworm font "ROOKIE QUEST KEEPER"
- **Mini Logo:** `/public/rqk-mini-logo.svg` - "RQK" initials

### Mascot
- **ROOK Mascot:** `/public/rqk-mascot.png` - Hooded wizard figure with D20 and spellbook, red glowing eyes

---

## Core Features

### 1. Landing Page
- Dark minimalist design with ROOK mascot
- Red CTA buttons (#E11D48)
- Feature showcase
- Pricing section (Free + Adventurer tiers)

### 2. Authentication
- Login/Register flow
- Password reset
- Referral system
- Dark themed auth cards with square corners

### 3. Unified Dashboard
- Post-login landing page
- "My Characters" section (left)
- "My Campaigns" section (right)
- Red accent on buttons and borders

### 4. Campaign Dashboard
- **LEFT SIDEBAR** navigation with **COLLAPSIBLE TAB GROUPS**:
  - **World Group:** Setting, World Builder, Gods, Locations, NPCs
  - **Tools Group:** Reference, Encounter Gen, Items
  - **Players Group:** Party
  - **Ungrouped Tabs:** Combat, Battle Maps, Calendar, Notes
- Tab hover: lighter grey + red bar on right
- Active tab: full red background
- Group headers: expand/collapse on click, active tab's group auto-expands
- Tab active: full red

### 5. GM Screen
- **LEFT SIDEBAR** navigation with tabs (same layout as Campaign Dashboard)
- Tabs: Combat, Dice, Monsters, Creatures, Names, Tables, Loot Gen, Inventory, Party, Notes
- Tab hover: lighter grey + red bar on right
- Tab active: full red

### 6. ROOK AI Assistant
- AI content generation
- NPC generation
- Location generation
- Session recaps

### 7. Combat System
- Initiative tracker
- Battle maps
- Encounter difficulty calculator
- Loot management

---

## Technical Stack

### Frontend
- React
- Tailwind CSS
- shadcn/ui components (modified for square corners)
- lucide-react icons
- Cityworm custom font

### Backend
- FastAPI
- MongoDB (motor)
- JWT authentication

### Integrations
- OpenAI (GPT-5.2 for ROOK)
- OpenAI Image Generation (character portraits)
- Stripe (payments)
- Resend (emails)

---

## What's Been Implemented (March 2026)

### Completed
- [x] Full dark minimalist redesign with #E11D48 red
- [x] New Cityworm font for branding
- [x] New mascot (hooded wizard with D20)
- [x] New SVG logos
- [x] Landing page with new theme
- [x] Auth page (login/register/forgot password)
- [x] Unified Dashboard
- [x] Campaign Dashboard with LEFT SIDEBAR tabs
- [x] GM Screen with LEFT SIDEBAR tabs (same layout)
- [x] Tab hover animation (red bar slides in from right)
- [x] Tab active animation (full red background)
- [x] Square corners on ALL UI elements
- [x] Quick Tips with red accent
- [x] **QuickReferenceTab Enhancement (March 2026)**
  - [x] Real D&D 5e SRD data fetched from backend API
  - [x] **319 spells** with level/school/class filters
  - [x] **12 character classes** with hit dice, saving throws, proficiencies
  - [x] **9 character races** with ASI, speed, traits, languages
  - [x] **3000+ items** from local database with type/rarity filters
  - [x] Click-to-expand shows full descriptions for all entries
  - [x] Search functionality across all sections
  - [x] Rules section with DC tables, Conditions, Cover Rules

### In Progress
- [ ] None

### Completed (March 2026)
- [x] **Context-Aware ROOK AI** - AI now pulls campaign setting, NPCs, locations, gods, and notes to generate tailored content
- [x] **Sidebar Tab Grouping** - Organized tabs into World/Combat groups + standalone tabs (References, Inventory, Players, Notes)
- [x] **Maps renamed to Battle Maps**
- [x] **Keyboard Shortcuts** - R (dice), N (note), / (search), ? (help), Esc (close)
- [x] Fixed "Invalid entity type: world_place" error
- [x] Fixed RQKLogoInline import in PlayerDashboard
- [x] Fixed Character Builder BACKGROUNDS dropdown bug
- [x] **Dice Roller moved to bottom-LEFT** for better UX
- [x] **Player Section uses BLUE theme** (#3B82F6) to differentiate from GM
- [x] **Enhanced Character Builder** with 5 steps:
  - Subclass selection
  - Cantrip & spell selection for casters
  - Starting equipment display
  - Background feature details
  - Optional feat selection
- [x] Campaign setting save persistence fixed
- [x] **New 3-Tier Pricing Model (March 2026)**
  - Free ($0): 1 character, join campaigns, 3 AI calls/month
  - Hero ($3.99/mo or $39.99/yr): Unlimited characters, 50 AI calls, player tools
  - Quest Master ($3.99/mo or $39.99/yr): Unlimited campaigns, unlimited AI, GM tools
  - Legendary ($5.99/mo or $59.99/yr): Everything combined
- [x] **Feature Gating System** - useSubscription hook restricts features by tier
  - Unlimited Characters: Hero/Legendary only
  - Campaign Creation: Quest Master/Legendary only
- [x] **Promo Code Fix** - Fixed endpoint from /subscription/apply-promo to /promo-codes/apply
- [x] **RECURRING STRIPE SUBSCRIPTIONS (March 2026)** - Major payment system update:
  - Changed from one-time payments to Stripe subscription mode (auto-renews monthly/yearly)
  - Created Stripe Products/Prices for all paid tiers
  - Subscription cancellation endpoint (cancels at period end)
  - Promo codes now PAUSE existing Stripe subscriptions to prevent double-charging
  - When promo expires, original subscription automatically resumes
  - Webhook handling for subscription lifecycle events
- [x] **Clarified GM Screen = Session Mode** - The GM Screen IS the live session tool, removed redundant Session Mode page
- [x] **CLICKABLE DICE ROLLERS ON CHARACTER SHEET (March 2026)**
  - All ability score modifiers are clickable (rolls d20 + ability modifier)
  - All saving throw modifiers are clickable (rolls d20 + save modifier)
  - All 18 skill modifiers are clickable (rolls d20 + skill modifier)
  - Initiative is clickable (rolls d20 + DEX modifier)
  - Toast notifications show roll results (green for crit 20, red for nat 1)
- [x] **SESSION JOURNAL (Hero Tier Feature)** - New player companion feature
  - CRUD operations for journal entries
  - Entry types: session, combat, npc, location, loot, note
  - Search and filter functionality
  - Journal tab added to Player Dashboard
- [x] **CHARACTER LEVEL UP SYSTEM (March 2026)** - Full progression system
  - Level up endpoint: POST /api/characters/{character_id}/level-up
  - ASI (Ability Score Improvements) at levels 4, 8, 12, 16, 19
  - Fighters get extra ASI at levels 6 and 14
  - Rogues get extra ASI at level 10
  - Choice: +2 to one ability OR +1 to two abilities
  - Alternative: Select a Feat instead of ASI
  - HP calculation with roll or average option
  - Proficiency bonus auto-calculated
  - Hit dice updated per class (d6-d12)
  - Level Up Modal with 3-step wizard
  - 16 copyright-safe feats available
- [x] **SPELLS PREPARED/KNOWN TABS (March 2026)**
  - Backend supports both spells_prepared and spells_known fields
  - Sub-tabs to toggle between Prepared and Known views
  - Prepare/unprepare spells with auto-save
  - Search and level filtering for spells

### Backlog
- [ ] Party Inventory tracking (Hero Tier)
- [ ] **Smart Entity Linking** - Auto-link NPC names, locations to their pages (SmartNoteParser exists)
- [ ] Backend refactoring (split server.py into routers)
- [ ] Mobile-first Combat Tracker
- [ ] "Zero Prep Mode" AI generation
- [ ] Shareable World Codex for players
- [ ] Offline Mode
- [ ] Ambient Soundscapes
- [ ] **Modular Progression System** - Database-driven character progression (foundation exists)

### Completed (March 2026 - Yellow Tier GM Features)
- [x] **NPC Relationship Web** - Visual graph showing connections between NPCs
  - Relationship types: Ally, Enemy, Family, Romantic, Business, Rival, Neutral, Serves
  - Interactive canvas with drag-and-drop nodes
  - Link mode for creating connections
  - Zoom/Pan controls
  - Backend: POST/GET/DELETE /api/campaigns/{id}/npc-relationships
- [x] **Session Timeline** - Visual history of campaign events
  - Event types: Session, Combat, NPC Met, Location, Quest, Death, Level Up, Major Event, Milestone
  - Filter by event type
  - Group by session number
  - In-game date tracking
  - Backend: POST/GET/DELETE /api/campaigns/{id}/timeline
- [x] **Random Generator Tables** - Quick-roll tables for GM prep
  - NPC Names (Human, Elf, Dwarf male/female + Random NPC with traits)
  - Place Names (Tavern, Shop, Village, City, Dungeon)
  - Treasure (CR 0-4, CR 5-10, CR 11+, Art Objects, Gems)
  - Encounters (Forest, Dungeon, Road, Urban)
  - Plot Hooks (Hooks, Rumors, NPC Secrets, Motivations)
  - Copy to clipboard functionality
- [x] **Campaign Dashboard Reorganization**
  - World group: Setting, World Builder, Gods, Locations, NPCs, NPC Web, Calendar, Timeline
  - Combat group: Combat, Battle Maps, Encounter Gen
  - GM Tools group: Generators, References, Inventory
  - Standalone tabs: Party Loot, AI Recap, Players, Notes

---

## Testing Status
- 49/49 tests passing (Yellow Tier GM Features)
- 44/44 tests passing (level up system + spells tabs)
- 30/30 frontend tests passing (dice rolls, journal, subscription)
- Comprehensive stress test passed (10/10 API tests)
- Recurring Stripe subscriptions verified
- Monthly and yearly billing both working
- Promo codes work correctly with subscription pausing
- All dice roll buttons verified working (ability checks, saves, skills, initiative)
- Session Journal CRUD verified working
- Level Up API: ASI, Feats, HP calculation all tested
- Level Up Modal UI: all 3 steps tested with E2E tests
- **NEW: GM Features tested with 18 backend + 31 frontend tests**

## Design System
### Tron Aries (GM Side) - Red/Orange Theme
- Primary: #E11D48
- Hover: #F43F5E
- Subtle: rgba(225, 29, 72, 0.15)
- Glow: 0 0 20px rgba(225, 29, 72, 0.4)

### Tron Legacy (Player Side) - Blue/Cyan Theme
- Primary: #3B82F6
- Cyan: #06B6D4
- Hover: #60A5FA
- Subtle: rgba(59, 130, 246, 0.15)
- Glow: 0 0 30px rgba(6, 182, 212, 0.3)

---

## File Structure
```
/app
├── backend/
│   ├── models.py
│   └── server.py
├── frontend/
│   ├── public/
│   │   ├── fonts/
│   │   │   └── CitywormRegular.ttf
│   │   ├── rqk-main-logo.svg
│   │   ├── rqk-mini-logo.svg
│   │   └── rqk-mascot.png
│   ├── src/
│   │   ├── fonts/
│   │   │   └── CitywormRegular.ttf
│   │   ├── components/
│   │   │   ├── AuthPage.js
│   │   │   ├── CampaignDashboard.js (LEFT SIDEBAR)
│   │   │   ├── CampaignList.js
│   │   │   ├── GMScreen.js (LEFT SIDEBAR)
│   │   │   ├── LandingPage.js
│   │   │   ├── QuickTips.js
│   │   │   └── UnifiedDashboard.js
│   │   ├── components/ui/
│   │   │   ├── button.jsx (square corners)
│   │   │   ├── card.jsx (square corners)
│   │   │   ├── dialog.jsx (square corners)
│   │   │   └── input.jsx (square corners)
│   │   └── App.css (design system)
```

---

## Next Steps
1. Complete frontend UI for the Level-Up Wizard using the new progression API
2. Party Inventory (Hero Tier Feature) - shared loot tracking
3. Landing Page Enhancements - social proof, player invites, quick start templates
4. Session Recap AI (Quest Master Tier) - AI-powered session summaries
5. Smart Entity Linking - auto-link NPC names, locations in notes
6. Mobile Responsiveness Audit - GM Screen for tablets, Character Sheet for mobile

---

## API Endpoints - SRD Reference Data

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/srd/spells` | D&D 5e SRD spells with filters (level, school, class) | 319 |
| `/api/srd/spells/{name}` | Get specific spell by name | - |
| `/api/srd/classes` | All character classes with features | 12 |
| `/api/srd/classes/{name}` | Get specific class by name | - |
| `/api/srd/races` | All character races with traits | 9 |
| `/api/srd/feats` | All feats | 8 |
