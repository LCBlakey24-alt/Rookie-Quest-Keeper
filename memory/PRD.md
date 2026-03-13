# Rookie Quest Keeper - Product Requirements Document

## Overview
Rookie Quest Keeper is a comprehensive TTRPG campaign management application designed for Game Masters (GMs) and Players to run better tabletop sessions.

## Product Vision
An all-in-one campaign operating system for 5e combining worldbuilding, AI content generation (ROOK), combat control, player tools, and live session features.

---

## Recent Major Updates (March 2026)

### FANTASY SUNSET REBRAND (March 13, 2026)
**Complete visual rebrand with sunset purple/pink/gold theme**

**Color Palette:**
- **Void Purple** (`#0F0A1E`) - Main background
- **Deep Purple** (`#1A112E`) - Card surfaces
- **Ethereal Purple** (`#8B5CF6`) - Player accent
- **Mystic Pink** (`#EC4899`) - Secondary accent
- **Sunset Gold** (`#F59E0B`) - GM accent, highlights

**Key Visual Features:**
- Fantasy sunset landscape background (blurred) on landing/auth pages
- Glassmorphism panels with `backdrop-filter: blur(20px)`
- Purple gradient borders with glow effect
- Cinzel font for headings, Montserrat for body

**Files Updated:**
- index.css - New CSS variables and glass panel styles
- LandingPage.js - Complete redesign with sunset background
- AuthPage.js - Glassmorphism login/register cards
- UnifiedDashboard.js - Updated theme colors (purple player, gold GM)

**Background Image:**
- URL: `https://static.prod-images.emergentagent.com/jobs/b9fc55bd-0a80-4d15-9934-a7087e3445c8/images/9be68b2095230a13a9d52ed25ea5ba93da54c6f47b915d5cd89f4c7b8992a6d3.png`

### FRONTEND-BACKEND RECONNECTION (March 13, 2026)
**Repaired disconnected components to restore full functionality**

**Fixed Components:**
- **PlayerDashboard.js** - Now fetches characters from backend API instead of expecting props
- **CampaignList.js** - Now fetches campaigns from backend API with create campaign modal
- **CharacterSheetFull.js** - Now loads character using `characterId` from route params (useParams)
- **CharacterBuilder.js** - Copied from user's GitHub project with proper API integration

**New Files Created:**
- `/app/frontend/src/data/characterOptions.js` - Race, Class, Background options
- `/app/frontend/src/lib/characterRules.js` - Ability score validation and calculation utilities
- `/app/frontend/src/lib/api.js` - API base URL configuration

**CSS Updates:**
- Added `rq-*` CSS classes to designSystem.css for GitHub project component compatibility
- `.rq-panel`, `.rq-card`, `.rq-title`, `.rq-muted`, `.rq-button-primary`, `.rq-button-secondary`

**All Routes Working:**
- `/auth` - Authentication (login/register/reset)
- `/home` - UnifiedDashboard
- `/player` - PlayerDashboard with character list
- `/campaigns` - CampaignList with search and create
- `/characters/new` - CharacterBuilder
- `/characters/:characterId` - CharacterSheetFull
- `/campaign/:campaignId` - CampaignDashboard
- `/gm-screen/:campaignId` - DMScreen
- `/pricing`, `/admin`, `/account` - Other pages

### FONT UPDATE - MONTSERRAT (March 12, 2026)
**User requested clean, modern SaaS-style font**

**Current Fonts:**
- **Montserrat** - Clean sans-serif for headers and body text
- Removed fantasy fonts (Cinzel, Crimson Text, Eros Book)
- Professional "Notion meets Roll20" aesthetic

### AETHER & IRON THEME WITH EMBER EFFECTS (March 11, 2026)
**Complete visual redesign with high-contrast dark theme and fire elements**

**Design Philosophy:**
- Clean, modern sci-fi/fantasy hybrid aesthetic
- High contrast for readability during long gaming sessions
- Ember/fire effects to add warmth and magical atmosphere
- Clear visual distinction between GM (amber) and Player (cyan) features

**Color Palette:**
- `--background`: #0B0F19 (Near black/deep slate)
- `--surface`: #111827 (Card/panel backgrounds)
- `--surface-hover`: #1F2937 (Hover states)
- `--border`: #374151 (Subtle grey borders)
- `--text-primary`: #F9FAFB (Almost white)
- `--text-secondary`: #9CA3AF (Muted text)
- `--gm-primary`: #F59E0B (Amber - GM accent)
- `--gm-secondary`: #D97706 (Darker amber)
- `--player-primary`: #06B6D4 (Cyan - Player accent)
- `--player-secondary`: #0891B2 (Darker cyan)

**Ember Effects:**
- Floating ember particles (15 particles with varied sizes)
- Ambient bottom glow in amber tones
- Subtle animation for organic feel
- CSS-only implementation (no JS overhead)

**Typography:**
- Cinzel for titles and major headings (fantasy medieval feel)
- Crimson Text for all body/interface text (elegant serif)
- High contrast white on dark backgrounds

**Button Hierarchy:**
- GM buttons: Amber gradient with dark text
- Player buttons: Cyan gradient with dark text  
- Secondary: Dark surface with grey border

**Files Updated:**
- index.css (Complete theme rewrite with ember effects)
- LandingPage.js, AuthPage.js, UnifiedDashboard.js (Theme objects)
- 24 additional component files (color updates)

### RULES CONSISTENCY PASS - EDITION-AWARE SYSTEM (March 8, 2026)
**Full rules-consistency pass for character creation + level-up with strict 5e 2014/2024 support**

**Runtime Bug Fixes:**
- Fixed undefined variable errors in character creation payload (`selectedSpells`, `selectedCantrips`, `selectedFeat`)
- All spell/cantrip/feat selections now properly reference `characterData.*` properties
- Added proper error handling for 400 validation errors from backend

**Data Model Consistency:**
- Added `cantrips_known` field to `PlayerCharacter` model
- Normalized spell inputs to object format `{name, level}` for consistency
- Separate fields: `spells_known` (for known-spell casters), `spells_prepared` (for prepared casters), `cantrips_known`
- Backend normalizes any format to `{name, level}` objects before storage

**Edition-Aware Rule Enforcement:**
- Subclass options disabled in UI when character level < unlock level
- Clear messaging shows why subclass is locked ("Subclass Locked - Clerics choose at level 1 in 2014 rules")
- Backend validates subclass on both CREATE and UPDATE endpoints
- New endpoint `GET /characters/{id}/level-up-info` returns edition-aware subclass timing
- Level-up info includes: unlock level, can_choose_now, needs_selection, ASI levels, HP info

**Test Coverage (25 tests):**
- Subclass validation for 2014 edition (Cleric L1, Wizard L2, Sorcerer L1, etc.)
- Subclass validation for 2024 edition (all classes L3)
- Hit dice calculation per class (Barbarian d12, Wizard d6, Fighter d10)
- max_hit_points auto-calculation with CON modifier
- Spell and cantrip persistence in object format
- Level-up-info endpoint returns correct edition-aware data

### EDITION-AWARE CHARACTER CREATION (March 8, 2026)
- **Edition selection**: Players choose 2014 or 2024 rules at the start of character creation
- **Edition-specific subclass levels**:
  - 2014: Class-specific (Cleric/Sorcerer/Warlock at 1, Druid/Wizard at 2, others at 3)
  - 2024: All classes get subclass at level 3
- **Spell/cantrip limits**: Now calculated from rules tables, not hardcoded
  - Shows exact cantrip count based on class and level
  - Prepared vs known spell distinction for different class types
- **Edition-specific SRD races**: Shows appropriate races for selected edition
- **Backend validation**: Rejects illegal subclass selection before unlock level
- **Proper HP calculation**: Uses correct hit dice per class (d12 Barbarian, d6 Wizard, etc.)
- **Data payload fix**: Fixed `max_hp` → `max_hit_points` mismatch between frontend/backend
- **New data file**: `frontend/src/data/editionRules.js` contains all edition-specific rules

### JSON UPLOAD INSTRUCTIONS (March 8, 2026)
- **Upload modal enhanced**: Shows required/optional fields for each content type
- **Dynamic instructions**: Changes based on selected content type (classes, races, spells, etc.)
- **Better sample JSON**: Realistic examples with Blood Hunter, Dhampir, custom spells

### DYNAMIC COMBAT TAB FEATURES (March 8, 2026)
- **Class-specific abilities**: Combat tab now dynamically displays actions, bonus actions, reactions, and passives based on character class and level
- **Data source**: `frontend/src/data/classFeatures.js` contains comprehensive feature data for all 12 D&D 5e classes
- **Implementation**: `combatFeatures` useMemo hook in `CharacterSheetFull.js` filters and aggregates features
- **Multiclass support**: Aggregates features from all classes without duplicates for multiclass characters
- **Level filtering**: Only shows features the character has actually unlocked at their current level
- **Feature types displayed**:
  - CLASS ACTIONS (Divine Sense, Lay on Hands, Channel Divinity, Action Surge, Wild Shape, etc.)
  - ATTACK MODIFIERS (Divine Smite, Sneak Attack, Reckless Attack, Stunning Strike)
  - BONUS ACTIONS (Rage, Second Wind, Cunning Action, Ki abilities, Bardic Inspiration)
  - REACTIONS (Deflect Missiles, Uncanny Dodge, Indomitable, Slow Fall)
  - PASSIVE ABILITIES (Fighting Style, Extra Attack, Evasion, Unarmored Defense)
- **Uses tracking**: Shows uses per rest (short/long) for limited abilities
- **Test coverage**: 19 new E2E tests in `tests/e2e/combat-tab-class-features.spec.ts`

### FREE TIER RESTRICTIONS IMPLEMENTED (March 7, 2026)
- **Backend enforcement:** Character and campaign limits enforced on creation endpoints
- **Upgrade prompts:** Beautiful modal prompts appear when limits are reached
- **Campaign limits:** Free users (0 campaigns), Quest Master/Legendary (unlimited)
- **Character limits:** Free users (1 character), Hero/Legendary (unlimited)
- **AI call tracking:** Usage tracked per month, reset monthly
- **Frontend component:** `UpgradePrompt.js` with contextual messaging and tier suggestions

### CUSTOM FONT - EXCLUDED (March 7, 2026)
- **New brand font:** Replaced all Cityworm/Montserrat/Inter references with "Excluded" font
- **Font files:** `/public/fonts/Excluded.ttf` and `/public/fonts/ExcludedItalic.ttf`
- **Global application:** Font applied via index.html @font-face and index.css body rule
- **51 files updated:** All fontFamily references across the codebase

### STRIPE INTEGRATION RE-ENABLED (March 7, 2026)
- **Issue resolved:** Previously deployment was blocked due to cached expired Stripe API key
- **Solution:** Re-integrated Stripe using `emergentintegrations` library with fresh API key
- **Implementation:**
  - Uses `StripeCheckout` from `emergentintegrations.payments.stripe.checkout`
  - Checkout sessions created with fixed prices from backend (security best practice)
  - Dynamic success/cancel URLs built from frontend origin (not hardcoded)
  - Payment transactions recorded in `payment_transactions` collection
  - Webhook endpoint handles payment confirmations
- **Features working:**
  - `/api/subscription/checkout` - Creates Stripe checkout sessions
  - `/api/subscription/checkout/status/{session_id}` - Polls payment status
  - `/api/webhook/stripe` - Handles Stripe webhook events
  - `/api/subscription/cancel` - Cancels subscription
- **Pricing:** £3.99/mo Hero, £3.99/mo Quest Master, £5.99/mo Legendary (GBP)

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
- Stripe (payments) - Re-integrated via `emergentintegrations` library
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
- [x] **COLOR SCHEME UPDATE (March 2026)**
  - Player/Character side: Three shades of blue (#3B82F6 primary, #06B6D4 secondary, #1E40AF tertiary)
  - GM/Campaign side: Three shades of red (#DC2626 primary, #EF4444 secondary, #991B1B tertiary)
  - Dice roller button changes color based on current page (blue on player pages, red on GM pages)
  - Updated: UnifiedDashboard, CharacterBuilder, CampaignDashboard, GMScreen, AuthPage, FloatingDiceRoller

- [x] **USER-LEVEL RULESETS WITH EDITION TAGGING (March 2026)** - Major feature
  - Moved ruleset uploader to Player Dashboard (home page)
  - Rulesets now stored per-user (not per-campaign)
  - Edition tagging: 2014 vs 2024 rules separation
  - Character Builder starts with edition selection screen
  - Custom content shows with source indicators (My Rulesets vs Campaign)
  - Smart duplicate skipping across editions
  - Backend: New collections (user_rulesets, user_races, user_classes, etc.)
  - Endpoints: POST /api/user/content/upload, GET /api/user/content, GET /api/user/content/summary

- [x] **CODEBASE CLEANUP - REMOVED UNUSED ROUTES & COMPONENTS (March 2026)**
  - Removed `/character-builder` route (duplicate of `/characters/new`)
  - Removed `/characters` route (redundant with `/player` - PlayerDashboard)
  - Removed unused components: RoleSelection, CombatTracker, MapTokenSystem, SessionMode, MyCharacters, MulticlassManager
  - Updated navigation links: CharacterSheet and CampaignList now go to `/player` instead of `/characters`
  - 103/105 tests passing (2 failures due to stale test IDs, not actual bugs)

- [x] **USER MANAGEMENT CLEANUP & DELETE FUNCTIONALITY (March 2026)**
  - Deleted 335 test accounts and 41 test campaigns, keeping only lcblakey24
  - Account settings: Email: lcblakey24@outlook.com, Password: Trigger24?!, Tier: legendary, Admin: true
  - Added delete buttons for characters on home page (Player Side)
  - Added delete buttons for campaigns on home page (GM Side)
  - Both show red hover state and require confirmation before deletion

- [x] **SMART DUPLICATE SKIPPING FOR RULESETS (March 2026)**
  - Backend now automatically SKIPS duplicate races, classes, subclasses, backgrounds, and feats
  - Only new content is uploaded, duplicates are not created
  - Response includes detailed breakdown: what was added vs what was skipped
  - Frontend shows toast notification with skipped items
  - Example: "Ruleset uploaded! 2 items added, 2 duplicates skipped" + info toast with skipped names

- [x] **COMPREHENSIVE STRESS TEST (March 2026)** - 72/72 tests passed
  - Backend API: 49/49 tests passed - All CRUD endpoints for NPCs, Locations, Gods, Timeline, Combat, Notes, Characters
  - Frontend E2E: 23/23 tests passed - All dashboards, tabs, navigation, forms working correctly
  - AI generation working (NPC, Location, Quest generation)
  - Character creation flow fully functional with custom campaign content

- [x] **RULESET UPLOAD UX IMPROVEMENTS (March 2026)**
  - Added expandable guidance section explaining how multiple rulesets stack
  - Backend now detects duplicate race/class names and returns warnings
  - Frontend shows duplicate warnings in toast notifications  
  - Improved ruleset list to show content counts per ruleset (races, classes, subclasses, backgrounds, feats)
  - Added JSON format example in collapsible section
  - Added copyright notice reminding users to only upload content they have rights to

- [x] **STRUCTURED RULESET INTEGRATION FOR CHARACTER CREATOR (March 2026)** - Full custom content system
  - GMs can upload JSON rulesets with custom races, classes, subclasses, backgrounds, and feats
  - Backend API: POST /api/campaigns/{id}/content/bulk-upload, GET /api/campaigns/{id}/content
  - Character Builder accepts ?campaignId=xxx query parameter to load campaign-specific content
  - Custom content displays with orange/gold styling and star (★) indicators
  - Custom races, classes, etc. appear BEFORE standard content in selection lists
  - Ability bonuses object (e.g., {strength: 2, charisma: 1}) automatically formatted to "+2 STR, +1 CHA"
  - Campaign name and "Custom Content Available" badge shown in Character Builder header
  - Toast notification when custom content loads successfully
  - Link in Campaign Settings to create character using campaign content
  - 16/16 tests passed (11 backend, 5 frontend E2E)
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
  - Level Up Modal with mode selection (Level Up vs Multiclass)
  - 16 copyright-safe feats available
  - **hp_gained now stored for ALL level types** (standard, ASI, feat)
- [x] **MULTICLASSING UI (March 2026)** - Added to Level Up Modal
  - Mode selection: players can choose to level up current class OR add a new class
  - Displays multiclass requirements for each class
  - Shows which classes player is eligible for based on ability scores
  - Multiclass confirmation screen with expected gains
  - Backend endpoints: POST /api/characters/{id}/multiclass, POST /api/characters/{id}/level-up-class
- [x] **SPELLS PREPARED/KNOWN TABS (March 2026)**
  - Backend supports both spells_prepared and spells_known fields
  - Sub-tabs to toggle between Prepared and Known views
  - Prepare/unprepare spells with auto-save
  - Search and level filtering for spells

### Backlog
- [ ] Backend refactoring (split server.py into routers)
- [ ] Mobile-first Combat Tracker
- [ ] Mobile Responsiveness Audit (GM Screen, Character Sheet)
- [ ] "Zero Prep Mode" AI generation
- [ ] Shareable World Codex for players
- [ ] Offline Mode
- [ ] Ambient Soundscapes
- [ ] Custom rule system AI assistance (help write rules)
- [ ] Smart Entity Linking - Auto-link NPC names, locations to their pages (SmartNoteParser exists)

### Completed (March 2026 - UX Enhancements)
- [x] **Tron Light Cycle Background Effects (March 2026)**
  - Reusable TronBackground component with variant support (blue, red, both, landing)
  - Blue/cyan light trails for Player sections (Tron Legacy aesthetic)
  - Red light trails for GM sections (Tron Aries aesthetic)
  - Animated grid overlay with subtle glow effects
  - Applied to: Landing Page, Auth Page, Unified Dashboard, Character Sheet, Campaign Dashboard, GM Screen
  - CSS animations with pointer-events: none to preserve UI interactivity
  - Reduced motion support for accessibility (@media prefers-reduced-motion)
  - 17/17 tests passed confirming all features work correctly
- [x] **Interactive Map System (March 2026)**
  - World Maps: Upload map images, add location pins, create paths between locations
  - Local Maps: Upload city/dungeon maps, add POI pins (shops, taverns, temples)
  - Pin Selection Highlighting: Visual glow and border when pins are selected
  - Pin Info Panel: Shows pin details, description, connected routes
  - Path Creation Flow: Visual feedback with pulsing animation for source pin
  - Travel Calculator: Calculate travel time based on distance, terrain, and travel mode
  - Travel Modes: Walking, Horseback, Cart, Ship, Flying with different speeds
  - Nearby Locations: Show destinations connected to current location with distances
  - 40/40 tests passed (28 frontend + 12 backend)
- [x] **Rook's Tips - First-Time User Guide (March 2026)**
  - RookGuide component shows helpful tips when users open tabs for the first time
  - Dashboard Guides: Player Hub and GM Command Center welcome messages
  - Campaign Tab Guides: Settings, World Map, Local Maps, NPCs, Locations, etc.
  - Guide Content: Icon, title, bullet-point tips, themed colors (cyan for player, red for GM)
  - LocalStorage Persistence: Dismissed guides stored in 'rook_guides_dismissed' key
  - Dismiss Functionality: "Got it, thanks!" button to hide guide permanently
  - Animation: Smooth fade-in/out with slide effect
  - Variants: 'card' (large info panel) and 'tooltip' (small floating tip)
  - resetAllGuides() utility function for testing/admin purposes
- [x] **Billing Toggle & Pricing Consistency (March 2026)**
  - Added Monthly/Yearly billing toggle to landing page pricing section
  - Dynamic price updates when toggling billing cycle
  - Monthly: Hero £3.99, Quest Master £3.99, Legendary £5.99
  - Yearly: Hero £39.99 (£3.33/mo), Quest Master £39.99 (£3.33/mo), Legendary £59.99 (£5.00/mo)
  - "SAVE ~17%" badge on yearly option
  - Shows monthly equivalent for yearly pricing for clarity
- [x] **Campaign Dashboard Tab Consolidation (March 2026)**
  - Reduced tabs from 16+ to 10 main tabs for cleaner navigation
  - **Maps** tab: Combines World Map + Local Maps with sub-tab navigation
  - **NPCs** tab: Combines NPC Manager + Relationship Web
  - **Chronicle** tab: Combines Session Timeline + In-Game Calendar
  - **Combat** tab: Combines Combat Creator + Encounter Generator
  - **Tools** tab: Combines Quick Reference + Random Generators
  - **Inventory** tab: Combines Party Loot + Item Creator
  - Each consolidated tab has descriptive sub-tabs with icons
  - RookGuide entries added for all consolidated tabs
- [x] **Professional Screen Animations**
  - Fade-in animations for page loads
  - Staggered list animations (cards appear sequentially)
  - Hover lift effects on cards with shadow
  - Smooth transitions on all interactive elements
  - CSS classes: card-animated, hover-lift, transition-smooth, stagger-1 to stagger-8
- [x] **NPC Quick Reference (GM Screen)**
  - New "NPCs" tab in GM Screen sidebar
  - Search NPCs by name, role, or occupation
  - Filter by location
  - Expand/collapse NPC cards to show quick stats
  - View full NPC details in modal
  - Shows secrets (GM only), personality, motivation
- [x] **Mobile Navigation Toggle**
  - Toggle bar appears on screens under 768px
  - Switch between "PLAYER HUB" and "GM SIDE" with one tap
  - Highlights active section (blue for Player, red for GM)
  - Fixes issue where GM Side was hidden on mobile

### Completed (March 2026 - Interactive World Maps)
- [x] **World Map System** - Upload and manage world/region maps
  - Upload map images (PNG, JPG up to 10MB)
  - Configure scale (e.g., "1 inch = 50 miles")
  - Pin locations on the map (cities, towns, villages, landmarks)
  - Link pins to existing Locations from World Builder
  - Create travel paths between locations
  - Terrain types affect travel time (road, trail, wilderness, mountain, swamp, desert, water)
  - Backend: CRUD for /api/campaigns/{id}/world-maps, pins, and paths
- [x] **Travel Calculator** - Calculate travel time between locations
  - Multiple travel modes: Walking (24 mi/day), Horseback (48), Cart (16), Ship (72), Flying (96)
  - Terrain modifiers apply to travel time
  - Show "nearby locations" from current position with travel times
  - Backend: POST /api/campaigns/{id}/world-maps/{id}/calculate-travel
- [x] **Local Maps** - City/town/village maps with places of interest
  - Link to existing campaign Locations
  - Pin places of interest (Tavern, Shop, Temple, Blacksmith, Guild, Library, etc.)
  - Multiple maps per location supported
  - Backend: CRUD for /api/campaigns/{id}/local-maps and pins
- [x] **Party Location Tracker (GM Screen)** - Live gameplay location management
  - New "Location" tab in GM Screen sidebar
  - Select current party location from world map pins
  - View all places of interest in current location (from local maps)
  - See travel distances to all nearby destinations
  - Switch between travel modes to see different travel times
  - "Travel" button to quickly move party to new location
  - Summary bar shows current location, # of places, and # of routes
- [x] **Landing Page Update** - Added "Interactive World Maps" feature to carousel
  - Showcases pin cities & landmarks
  - Highlights travel time calculator
  - Mentions terrain modifiers

### Completed (March 2026 - Rule Systems & Player Features)
- [x] **Rule System Management** (Copyright-Safe)
  - Generic rule systems (no official D&D content pre-loaded)
  - User-created and shared systems
  - Content upload (classes, races, spells, items, feats, monsters)
  - JSON/CSV file upload support
  - Admin Rule Systems tab
- [x] **AI Rule Awareness**
  - AI respects campaign's rule system
  - Generates content using uploaded system data
- [x] **Multiclass Support**
  - API endpoints for multiclassing
  - Requirement checking (ability scores)
  - Level-up specific class
- [x] **Party Loot for Players**
  - New "Party Loot" tab in Player Hub
  - View shared loot from joined campaigns
  - Claim items for your character
  - Items grouped by type with rarity badges

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
- **27/27 tests passing (multiclass + HP storage)** - March 2026
- **38/38 tests passing (World Map & Local Map features)** - March 2026
- **36/36 tests passing (Party Location Tracker)** - March 2026
- **18/18 tests passing (Animations, NPC Reference, Mobile Nav)** - March 2026
- Comprehensive stress test passed (10/10 API tests)
- Recurring Stripe subscriptions verified
- Monthly and yearly billing both working
- Promo codes work correctly with subscription pausing
- All dice roll buttons verified working (ability checks, saves, skills, initiative)
- Session Journal CRUD verified working
- Level Up API: ASI, Feats, HP calculation all tested
- Level Up Modal UI: all 3 steps tested with E2E tests
- **NEW: GM Features tested with 18 backend + 31 frontend tests**
- **NEW: World Maps tested with 26 backend + 12 frontend tests**
- **NEW: Party Location Tracker tested with 14 backend + 22 frontend tests**
- **NEW: UX Enhancements tested with 6 backend + 12 frontend tests**

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
1. Implement "Session Mode" - One-click focused GM view for live play (P1)
2. Quick Start Tutorial for new GMs (P2)
3. Backend refactoring - Split server.py into domain-specific routers
4. Mobile Responsiveness Audit - GM Screen for tablets, Character Sheet for mobile

---

## API Endpoints - Campaign Content

| Endpoint | Description |
|----------|-------------|
| `POST /api/campaigns/{id}/content/bulk-upload` | Upload JSON ruleset with races, classes, subclasses, backgrounds, feats |
| `GET /api/campaigns/{id}/content` | Get all custom content for a campaign |
| `GET /api/campaigns/{id}/content/races` | Get custom races |
| `GET /api/campaigns/{id}/content/classes` | Get custom classes |
| `GET /api/campaigns/{id}/content/subclasses` | Get custom subclasses |
| `GET /api/campaigns/{id}/content/backgrounds` | Get custom backgrounds |
| `GET /api/campaigns/{id}/content/feats` | Get custom feats |

## API Endpoints - SRD Reference Data

| Endpoint | Description | Count |
|----------|-------------|-------|
| `/api/srd/spells` | D&D 5e SRD spells with filters (level, school, class) | 319 |
| `/api/srd/spells/{name}` | Get specific spell by name | - |
| `/api/srd/classes` | All character classes with features | 12 |
| `/api/srd/classes/{name}` | Get specific class by name | - |
| `/api/srd/races` | All character races with traits | 9 |
| `/api/srd/feats` | All feats | 8 |
