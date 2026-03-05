# Quest Keeper - TTRPG GM Companion PRD

## Overview
A comprehensive web application for Tabletop RPG Game Masters, serving as a digital "GM Screen" for managing campaigns, combat, and world-building. Supports multiple TTRPG systems including D&D 5e, Pathfinder, and more.

## Brand Structure (Updated March 5, 2026)

### Full Rebrand - Clean Modern Design
**Color Scheme:**
- GM Theme: Black/Gray/Red (#A4243B)
- Player Theme: Black/Gray/Blue (#2563EB)
- NO gold accents
- Square corners throughout (border-radius: 2-4px)

### Color Palette (NEW)
```css
/* Base */
--bg-primary: #18181B;
--bg-card: #242428;

/* GM (Red) */
--gm-primary: #A4243B;
--gm-hover: #B82E47;

/* Player (Blue) */
--player-primary: #2563EB;
--player-hover: #3B82F6;
```

### Three-Layer Brand Hierarchy
1. **Rookie Quest** - Parent brand/company
2. **Rookie Quest Keeper (RQK)** - Main web platform and campaign management system
3. **ROOK** - Built-in AI assistant

### Logo Assets
- `/public/rqk-logo-mascot.png` - Logo with ROOK mascot
- `/public/rqk-logo-text.png` - Text-only logo (footer)
- `/public/rook-mascot.png` - ROOK mascot icon (AI features)

### ROOK AI Branding
**R.O.O.K** = Roleplaying Organization Operations Keeper
- "Your AI Game Master Assistant"
- Button labels: "Generate with ROOK", "ROOK Worldbuilder", "ROOK Recap", "Ask ROOK"

## Unified Dashboard (NEW - March 5, 2026)

### Post-Login Experience
**Replaces Role Selection page** - After login, users go directly to Unified Dashboard at `/home`

### Layout
```
┌─────────────────────────────────────────────────┐
│  [Logo]           ⭐ Review    🔗 Referral Code │
├──────────────────────┬──────────────────────────┤
│   MY CHARACTERS      │    MY CAMPAIGNS          │
│   (Blue Theme)       │    (Red Theme)           │
│   [Character List]   │    [Campaign List]       │
│   [+ New Character]  │    [+ New Campaign]      │
└──────────────────────┴──────────────────────────┘
```

### Features
- Split view: Player characters (left, blue) | GM campaigns (right, red)
- Header: Review button (opens star rating modal), Referral code button
- Direct navigation to characters or campaigns from single page

## Player Mode Experience ✅ (Updated - March 5, 2026)
- **Tab Navigation**: "Characters" and "Notes" tabs
- "My Characters" grid with character cards showing portraits, class color, stats
- "My Campaigns" section showing joined campaigns
- Quick actions: "Create New Character" and "Join Campaign"
- Empty states with call-to-action buttons

### Player Notes Tab ✅ (NEW - March 4, 2026)
- **Session Recaps Section**: Read-only recaps synced from GM
  - Shows campaign name, date, GM who created it
  - Expandable/collapsible content with golden top border
  - Automatic sync when GM generates a recap
- **My Notes Section**: Personal editable notes
  - Create, edit, delete personal notes
  - Optional campaign linking
  - Cyan top border for visual distinction
  - Timestamps for last update

### GM to Player Session Recap Sync ✅ (NEW - March 4, 2026)
- When GM clicks "Generate Recap" in In-Game Notes tab:
  1. AI generates a narrative recap from session notes
  2. Recap is automatically saved to all players in that campaign
  3. Players see recaps in their Notes tab under "Session Recaps"
- Backend endpoint: `POST /api/campaigns/{campaign_id}/session-recaps`

### Character Builder (Redesigned)
- 4-step wizard: Concept → Race & Class → Abilities → Details
- Step 1: AI "Unseen Servant" panel with quick ideas + Basic Info form
- Step 2: Race selection with stat bonuses, Class grid with hit dice/primary stats
- Step 3: **Multiple stat generation methods**:
  - **Custom** - Point buy with +/- buttons
  - **Standard Array** - Classic 15, 14, 13, 12, 10, 8
  - **Recommended** - Optimized stats for selected class
  - **Roll Dice** - 4d6 drop lowest with animated dice rolling, shows individual dice, "Re-roll All" button
- Step 4: Alignment grid, Backstory, Portrait generation
- Progress indicators with completion checkmarks
- Live HP/AC/Total Points calculation based on stats

### Backend Endpoints Added
- `GET /api/player/campaigns` - Get campaigns user has joined
- `GET /api/player/campaign/{id}/inventory` - Get items assigned to player
- `GET /api/player/session-recaps` - Get all session recaps for player ✅ NEW
- `GET /api/player/notes` - Get personal player notes ✅ NEW
- `POST /api/player/notes` - Create a player note ✅ NEW
- `PUT /api/player/notes/{note_id}` - Update a player note ✅ NEW
- `DELETE /api/player/notes/{note_id}` - Delete a player note ✅ NEW
- `POST /api/campaigns/{campaign_id}/session-recaps` - GM generates and syncs recap ✅ NEW

## Landing Page Showcase ✅ (NEW - March 4, 2026)
Interactive "See It In Action" section showcasing app features:
- **Tab Navigation**: GM Dashboard, World Builder, Player Hub, Session Notes
- **Browser Mockup**: Realistic window chrome with feature previews
- **Feature Tags**: Quick highlights for each feature area
- **CTA Button**: "Try It Free" after showcase

## Design System - Arcane SaaS / Nebula Flow (Updated March 4, 2026)
Modern dark fantasy dashboard design combining the clarity of a professional SaaS app (like Notion/Linear) with subtle magical fantasy elements. Inspired by Nebula Flow dashboard style.

### Color Palette
- **Background**: #0B0F19 (Deep Obsidian)
- **Primary Panel**: #111827
- **Secondary Panel**: #1F2937
- **Primary Accent**: #7C3AED (Arcane Purple)
- **Secondary Accent**: #22D3EE (Magic Cyan)
- **Highlight**: #F59E0B (Gold)
- **Text Primary**: #E5E7EB
- **Text Secondary**: #9CA3AF

### Typography
- **Headings**: Montserrat (bold, clean sans-serif)
- **Body**: Inter (clean sans-serif)

### Visual Effects
- **Rainbow text animation** for key headings (green → cyan → purple → pink → gold)
- Subtle background patterns
- Soft magical glow effects on active elements
- Smooth hover animations
- Rounded corners with clean shadows

## Terminology
- **GM** (Game Master) - Universal term used throughout the app
- **TTRPG** - Tabletop Roleplaying Game

## User Persona
**Primary User**: Game Masters running TTRPG campaigns who need quick access to game information, combat management, and world-building tools during sessions.

## Core Requirements

### Authentication & Subscription
- [x] Email-based registration and login (migrated from username)
- [x] JWT-based session management
- [x] Protected routes for authenticated content
- [x] **Freemium subscription model** ($3.99/month Adventurer tier)
- [x] **Promo code system** for free premium access
- [x] Subscription status tracking per user
- [x] **Forgot Password** - Email reset link via Resend
- [x] **Password Reset** - Token-based password reset flow
- [x] **Account Settings Page** - Profile editing, password change, account deletion

### Campaign Management
- [x] Create and manage multiple campaigns
- [x] Campaign Dashboard with tabbed interface
- [x] Campaign Setting tab with **Unseen Servant** AI
- [x] Gods pantheon management with **Unseen Servant** auto-save
- [x] NPC creation with **Unseen Servant** auto-save
- [x] **Locations with Places of Interest** (shops, taverns, temples, etc.) with **Unseen Servant**
- [x] Player character management with stat generation
- [x] In-game notes with AI categorization
- [x] **Free tier**: Limited to 2 campaigns
- [x] **Premium tier**: Unlimited campaigns

### **Unseen Servant** - AI Auto-Save Feature
- [x] Renamed from "AI Assistant" to "Unseen Servant" (D&D thematic)
- [x] Auto-generates and saves content directly to database
- [x] Supports: Gods, NPCs, Locations, Places of Interest
- [x] Shows "Just Created" indicator on newly generated items
- [x] Green glow animation on newly created cards
- [x] Click edit button to modify generated content
- [x] **Free tier**: 5 AI generations per month
- [x] **Premium tier**: Unlimited AI generations

### World Builder (NEW)
- [x] **Hierarchical world structure**: Continents → Countries/Regions → Cities/Towns → Places of Interest
- [x] Continent types: Continent, Island/Archipelago, Plane of Existence
- [x] Region types: Kingdom, Empire, Republic, Territory, Wilderness
- [x] Settlement types: Capital, City, Town, Village, Outpost, Ruins, Landmark
- [x] Place types: Shop, Tavern, Temple, Blacksmith, Guild, Library, Residence, Dungeon
- [x] Expandable/collapsible tree view
- [x] AI "Unseen Servant" integration for generating world elements
- [x] Full CRUD operations for all hierarchy levels

### Monetization System
- [x] **Pricing Page** with plan comparison
- [x] **Free Tier**: 2 campaigns, 5 AI generations/month
- [x] **Adventurer Tier** ($3.99/month): Unlimited everything
- [x] Stripe checkout integration
- [x] Promo code system with **customizable duration** (1 week, 2 weeks, 1 month, 3 months, 6 months, 1 year, lifetime)
- [x] Premium badge in UI header
- [x] Feature gating for AI limits
- [x] Admin panel for promo code management with duration selection
- [x] Referral program (1 free month per referred user)

### Review System (NEW)
- [x] User review submission with 1-5 star rating
- [x] Auto-approve 4-5 star reviews for landing page
- [x] Admin panel: view, approve/hide, delete reviews
- [x] Dynamic landing page reviews section (only shows if reviews exist)
- [x] "What GMs Are Saying" section with real user testimonials

### Combat System
- [x] Combat Creator for preparing encounters
- [x] Monster Database with 2687+ creatures from D&D lore
- [x] Initiative tracker with correct +/- modifiers
- [x] Combat Page with two-column layout (tracker left, map right)
- [x] Enemy loot assignment and collection
- [x] AI Encounter Generator

### DM Screen (Live Session)
- [x] Tabbed interface (Combat, Dice, Loot Gen, Inventory, Party, Notes)
- [x] Dice roller with all standard D&D dice
- [x] AI Loot Generator
- [x] Party Inventory with drag-and-drop item assignment
- [x] Party overview with player stats and **correct initiative modifiers** (+X or -X)
- [x] Session notes with AI recap generator

### Reference System
- [x] **Items Database with 3,076 items** (weapons, armor, magic items, etc.)
- [x] Search and filter by type, rarity, magic items
- [x] **Rules Reference** with:
  - [x] Difficulty Classes (DC 5-30)
  - [x] XP Thresholds per level (Easy/Medium/Hard/Deadly)
  - [x] Conditions Reference (15 conditions)
  - [x] Cover Rules

### Custom Content Creation
- [x] Item Creator for custom magic items
- [x] World Calendar system
- [x] **Custom Creature Creator** (NEW - March 2026)
  - [x] Create homebrew monsters with full stat blocks (name, CR, HP, AC, type, size, speed, abilities, description)
  - [x] Edit and delete custom creatures
  - [x] Import creatures from CSV files
  - [x] Export creatures to CSV files
  - [x] Accessible from GM Screen "Creatures" tab
  - [x] Campaign-specific creature management
  - [x] **AI-Powered Generation via Unseen Servant** - Describe a creature concept and get auto-generated stat blocks
  - [x] Quick suggestion buttons for inspiration
  - [x] "Just Created" highlight effect for AI-generated creatures

### UI/UX
- [x] "Rookie Quest" branded aesthetic
- [x] **Enlarged logos on login page** (both sides + above form)
- [x] Dark fantasy theme with glow effects
- [x] Responsive design
- [x] Consistent tabbed navigation
- [x] **Premium badge** in campaign list header
- [x] **Quick Tips Component** - Contextual help boxes on each page
- [x] **Marketing Landing Page** - Public-facing product showcase

### Landing Page (NEW)
- [x] Public marketing page for non-authenticated visitors
- [x] Hero section with logos, tagline, and CTAs
- [x] Feature showcase cards (World Builder, Combat, AI, DM Screen)
- [x] Pricing comparison (Free vs Adventurer tiers)
- [x] Testimonials section with star ratings
- [x] Final CTA with "Create Your First Campaign"
- [x] Fixed navigation bar with "Get Started Free" button
- [x] SEO meta tags and Open Graph tags for social sharing
- [x] Responsive design with gradient backgrounds

### Quick Tips System (NEW)
- [x] Reusable QuickTips component with collapsible panels
- [x] Page-specific contextual tips:
  - [x] **Campaign List**: Getting Started guide
  - [x] **Campaign Dashboard**: Campaign Tips (Setting, World, AI, Combat)
  - [x] **DM Screen**: DM Screen Tips (Monsters, Names, Tables, Notes)
  - [x] **Combat Creator**: Combat Creator Tips (Add Combatants, Difficulty, Loot, Run Combat)
  - [x] **World Builder**: World Builder Tips (Hierarchy, Expand, AI, Places)
  - [x] **Pricing Page**: Subscription Tips (Free Tier, Adventurer, Promo Codes, Referrals)
- [x] Persistent collapse/dismiss state via localStorage
- [x] Yellow highlight styling for key actions
- [x] Expand/collapse and dismiss buttons

## Technical Stack
- **Frontend**: React.js, TailwindCSS, react-beautiful-dnd
- **Backend**: FastAPI (Python), Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: Emergent LLM for content generation (via Unseen Servant)
- **Authentication**: JWT with email-based auth
- **Payments**: Stripe (via emergentintegrations)
- **Email**: Resend for transactional emails (password reset)

## Key API Endpoints

### Account Management (NEW)
- `POST /api/auth/register` - Register with email, username, password
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/account/profile` - Get user profile
- `PUT /api/account/update` - Update username/email
- `POST /api/account/change-password` - Change password
- `DELETE /api/account/delete` - Delete user account and all data

### Subscription System (NEW)
- `GET /api/subscription/plans` - Get available subscription plans
- `GET /api/subscription/status` - Get current user's subscription status
- `POST /api/subscription/checkout` - Create Stripe checkout session
- `GET /api/subscription/checkout/status/{session_id}` - Check payment status
- `POST /api/promo-codes` - Create promo code
- `POST /api/promo-codes/apply` - Apply promo code for free premium
- `POST /api/webhook/stripe` - Handle Stripe webhooks

### Unseen Servant
- `POST /api/unseen-servant/generate` - Auto-generate and save entities
  - entity_type: 'god', 'npc', 'location', 'place_of_interest', 'creature'
  - Returns: entity_id, entity_name, success status
  - **Now checks AI usage limits for free tier users**

### Places of Interest
- `POST /api/campaigns/{id}/locations/{loc_id}/places` - Add place
- `GET /api/campaigns/{id}/locations/{loc_id}/places` - List places
- `PUT /api/campaigns/{id}/locations/{loc_id}/places/{place_id}` - Update place
- `DELETE /api/campaigns/{id}/locations/{loc_id}/places/{place_id}` - Delete place

### Custom Creatures (NEW)
- `GET /api/campaigns/{id}/custom-creatures` - List all custom creatures
- `POST /api/campaigns/{id}/custom-creatures` - Create new creature
- `PUT /api/campaigns/{id}/custom-creatures/{creature_id}` - Update creature
- `DELETE /api/campaigns/{id}/custom-creatures/{creature_id}` - Delete creature
- `POST /api/campaigns/{id}/custom-creatures/import` - Bulk import creatures from CSV

## Test Status
- **Backend**: 128/128 tests passing (100%) - Added 22 account management tests
- **Frontend**: 116/116 E2E tests passing (100%) - Added 26 account settings tests
- **New Test Files**: test_account_management.py, account-settings.spec.ts

## UI Redesign & SRD Database ✅ (March 5, 2026)

### UI Redesign - Landing Page Aesthetic
Applied consistent design system across GM Screen and Player Dashboard:
- **Parallax backgrounds** with grid patterns and decorative circles
- **Glass morphism tabs** with backdrop blur and translucent borders
- **Gradient buttons** matching landing page style
- **Improved visual hierarchy** with better spacing and colors
- **Design system** created at `/app/frontend/src/styles/designSystem.js`

### SRD Content Database (Copyright Safe - OGL)
Created D&D 5e SRD database at `/app/backend/data/srd/`:
- **39 Spells**: Cantrips through level 3 (Fireball, Magic Missile, etc.)
- **6 Classes**: Barbarian, Bard, Cleric, Fighter, Rogue, Wizard with features
- **4 Races**: Human, Elf, Dwarf, Halfling with traits
- **8 Feats**: Alert, Great Weapon Master, Sharpshooter, War Caster, etc.

### SRD API Endpoints
- `GET /api/srd/spells` - All spells with filtering (level, school, class, search)
- `GET /api/srd/spells/{name}` - Specific spell details
- `GET /api/srd/classes` - All classes with features
- `GET /api/srd/classes/{name}` - Specific class
- `GET /api/srd/class-features/{class}/{level}` - Features at level
- `GET /api/srd/races` - All races with traits
- `GET /api/srd/feats` - All feats

## Map Builder Feature ✅ (March 5, 2026)

### Overview
Full-featured battle map builder for DMs integrated into the GM Screen. Allows creating grid-based maps with terrain, walls, fog of war, and token placement.

### Components
- `/app/frontend/src/components/MapBuilder/MapBuilder.js` - Main editor with canvas, toolbar, side panel
- `/app/frontend/src/components/MapBuilder/MapCanvas.js` - HTML5 Canvas rendering engine
- `/app/frontend/src/components/MapBuilder/MapToolbar.js` - Tool selection and controls

### Features
- **Grid Canvas**: 30x20 default grid (configurable)
- **Terrain Tools**: Stone, Wood, Grass, Water, Sand, Dirt, Snow, Lava, Void
- **Drawing Tools**: Terrain brush, Wall, Door, Eraser, Fog of War
- **Quick Fill**: One-click fill entire map with terrain
- **Fog of War**: Reveal All / Hide All controls
- **Token Placement**: Add tokens with HP tracking
- **Keyboard Shortcuts**: V(Select), B(Brush), W(Wall), E(Eraser), F(Fog)
- **View Controls**: Zoom, Pan, Grid toggle
- **Save/Load**: Maps persist to campaign database
- **Image Import**: Upload background images

### API Endpoints
- `POST /api/campaigns/{id}/maps` - Create map
- `GET /api/campaigns/{id}/maps` - List maps
- `PUT /api/campaigns/{id}/maps/{map_id}` - Update map
- `DELETE /api/campaigns/{id}/maps/{map_id}` - Delete map

### Integration
- Accessible via GM Screen "Maps" tab
- Maps can be loaded into combat encounters (future)

## Combat Enhancement Features (March 4, 2026)

### Creature Ability Cards ✅ IMPLEMENTED
- Enemy/NPC cards in combat now show expandable "X Abilities" section
- Abilities are parsed from creature data with clickable buttons
- Each ability shows dice notation (e.g., "Bite 2d6+4")
- Clicking abilities rolls dice and shows damage results
- **Files**: `/app/frontend/src/components/CreatureAbilityCard.js`

### NPC Combat Recruiter ✅ IMPLEMENTED
- "Add NPCs/Creatures to Combat" button in combat page
- Tabbed interface: NPCs (allies) and Creatures (enemies)
- Search/filter functionality
- Adding creature rolls initiative and inserts into turn order
- **Files**: `/app/frontend/src/components/NPCCombatRecruiter.js`

### AI Token Generation ✅ IMPLEMENTED
- API endpoint `/api/ai/generate-token` creates AI art for creature tokens
- Tokens stored in DB (combat_tokens collection)
- Returns base64 PNG images
- **Files**: `/app/frontend/src/components/CombatTokenGenerator.js`, `/app/backend/server.py`

## Bug Fixes (March 4, 2026)

### Combat Black Screen Bug ✅ FIXED
- **Issue**: When clicking "End Combat" button, the screen went black
- **Root Cause**: `CombatPage.js` was navigating to `/dm-screen/${campaignId}` but the route is defined as `/gm-screen/:campaignId`
- **Fix**: Updated navigation in `CombatPage.js` lines 68 and 117 to use `/gm-screen/${campaignId}`
- **Files Changed**: `/app/frontend/src/components/CombatPage.js`

### Dice Roller Limit Bug ✅ FIXED  
- **Issue**: Dice roller was limited to preset button options (1, 2, 4, 6, 8 dice)
- **Root Cause**: The max limit was set to 100 dice, but users needed more for high-level play
- **Fix**: Increased max from 100 to 999 dice in `DiceRoller.js`
- **Files Changed**: `/app/frontend/src/components/DiceRoller.js`
- **Verification**: Tested rolling 50, 100, and 500+ dice successfully

## Recently Implemented Features (March 2, 2026)

### Account Management System ✅ (NEW)
- Email-based login/registration (migrated from username)
- Forgot Password flow with Resend email integration
- Reset Password page with token validation
- Account Settings page with:
  - Profile editing (display name, email)
  - Change Password with confirmation
  - Account deletion with "DELETE" confirmation
  - Subscription information display

### Custom Creature Creator ✅
- Full CRUD for homebrew creatures
- AI-powered generation via Unseen Servant
- CSV import/export

### Quick/Spontaneous Combat ✅
- "Spontaneous Combat" button on GM Screen
- Search and add monsters or custom creatures
- Instant combat launch with selected creatures

### Attack Roller System ✅
- "Attack" button on enemy combatants in combat
- Auto-parses creature abilities for dice notation
- Roll to Hit with target AC input
- Roll Damage only for hits
- Critical hit support (double dice)

### AI Character Generation ("Unseen Servant") ✅ (March 4, 2026)
- Expandable "Unseen Servant" panel in Character Builder
- Players describe their character concept in natural language
- AI generates complete character (name, race, class, stats, backstory, etc.)
- Quick suggestion buttons for character inspiration
- Auto-populates all form fields in the character builder
- Success indicator when character is generated
- Backend: POST /api/ai/generate-character using GPT-5.2

### AI Character Portrait Generation ✅ (NEW - March 4, 2026)
- Character Portrait panel in Character Builder (Step 4)
- Gender selection (Male/Female/Neutral)
- AI generates fantasy portrait based on character's race, class, and description
- Backend: POST /api/ai/generate-portrait using GPT Image 1
- Returns base64 encoded image

### Minor UX Improvements ✅ (March 4, 2026)
- NPCsTab: Loading skeletons, empty states, search bar, delete confirmation
- LocationsTab: Loading skeletons, empty states, search bar, delete confirmation
- Count indicators showing filtered results

### Performance Improvements ✅ (March 4, 2026)
- Fixed all unbounded `.to_list(None)` queries in server.py
- Added limits: 500 for inventory/items, 200 for AI context, 100 for characters, 50 for campaign players

## All-in-One Character Sheet ✅ (March 5, 2026)

### Overview
New comprehensive player character sheet with tabbed interface replacing the old single-page view. Integrates with SRD database for class-specific content.

### Components
- `/app/frontend/src/components/CharacterSheetFull.js` - Main component with 6 tabs

### Features
- **Overview Tab**: Quick stats (HP, AC, Initiative, Speed, Proficiency), Ability scores, Character info, Skills
- **Abilities & Skills Tab**: Full ability score blocks with modifiers and saving throws, Complete skill list with proficiency toggles
- **Spells Tab**: Spellcasting stats (ability, save DC, attack bonus), Class-specific spell list from SRD, Search and level filter, Expandable spell cards with full details
- **Features & Feats Tab**: Class features from SRD (filtered by character level), Racial traits section, Feats with SRD integration (add available feats in edit mode)
- **Equipment Tab**: Currency tracker (CP, SP, EP, GP, PP), Equipment list with equipped status, Inventory management
- **Notes & Bio Tab**: Personality traits (traits, ideals, bonds, flaws), Backstory, Personal notes

### Edit Mode
- Toggle edit mode to modify ability scores, skill proficiencies, character details
- Save/Cancel buttons with async API updates
- Inline editing for HP, AC, Currency, Text fields

### Data Test IDs
- `character-sheet-full` - Main container
- `tab-{overview|abilities|spells|features|equipment|notes}` - Tab buttons
- `ability-{strength|dexterity|constitution|intelligence|wisdom|charisma}` - Ability blocks
- `skill-{name}` - Skill rows
- `spell-{name}` - Spell cards
- `spell-search`, `spell-level-filter` - Spell filters
- `edit-btn`, `save-btn`, `cancel-edit-btn`, `back-btn` - Action buttons

### SRD Integration
- Spells filtered by character class
- Class features filtered by character level
- Feats available for selection in edit mode

## UX Improvements (March 5, 2026)

### Map Builder Relocation
- **Moved from:** GM Screen → **Moved to:** Campaign Dashboard (Maps tab)
- Campaign Dashboard = building, prepping, creating (maps, combats, NPCs, world)
- GM Screen = running sessions (reference tables, dice, quick info lookup only)

### Navigation Fixes
- End combat → returns to Campaign Dashboard (not campaign list)
- End session → returns to Campaign Dashboard (not campaign list)

### Dice Roller Visibility
- Shows ONLY on gameplay pages: /campaigns, /player, /campaign/:id, /gm-screen/:id, /combat
- Hidden on: Landing page (/), Auth (/auth), Role selection, Pricing, Admin, Account settings

### Character Sheet Layout Tightening
- More compact ability score blocks (smaller padding, font sizes)
- Compact skill rows with ellipsis for long names
- Smaller quick stats bar (HP, AC, Init, Speed, Prof)
- Compact tab navigation

### Spell Slots Added to Character Sheet
- Visual spell slot tracker in Spells tab (levels 1-9)
- Click to mark slots as used (in edit mode)
- Shows available/max slots count
- Integrated with spellcasting stats (ability, save DC, attack bonus)

## Completed Features (Updated March 5, 2026)
1. ✅ **P0: Player Character Sheet Overhaul** - COMPLETED - All-in-one character sheet with tabs, spell slots
2. ✅ **P1: SRD Content Database** - COMPLETED - 39 spells, 6 classes with features, 4 races with traits, 8 feats
3. ✅ **P2: UX Improvements** - COMPLETED - Map Builder relocation, dice roller visibility, compact layouts
4. ✅ **P3: ROOK AI Suggestions** - COMPLETED - "Did you know?" popups based on character class
5. ✅ **P4: Map-Combat Integration** - COMPLETED - Load saved maps into combat encounters

## Upcoming Tasks (Priority Order)
1. **P0: Character Builder Enhancements** - Add subclass selection, spell selection, feat selection (user requested)
2. **P1: GM→Player Item Linking** - Items assigned by GM auto-sync to player's character sheet with functional stats
3. **P2: Player Mode (Full Combat View)** - Player-side combat experience with actions syncing to GM view
4. **P3: User Content Upload System** - Allow users to upload JSON files to extend content database
5. **P4: Database Indexes** - Add MongoDB indexes for campaign_id, user_id for performance

## Future Tasks
- Smart Note Parsing | Backend Refactoring (split server.py) | AI Combat Narrator

## Test Status (Updated March 5, 2026)
- **Backend**: 31 tests passing (18 SRD API + 13 Character API)
- **Frontend**: 91 E2E tests passing
- **New Test Files Created**:
  - `/app/tests/e2e/ux-updates.spec.ts` - UX improvements tests (10 tests)
- **Updated Test Files**:
  - `/app/tests/e2e/gm-screen-tabs.spec.ts` - Removed Maps tab test
  - `/app/tests/e2e/map-builder.spec.ts` - Maps now accessed from Campaign Dashboard

---
Last Updated: March 5, 2026

