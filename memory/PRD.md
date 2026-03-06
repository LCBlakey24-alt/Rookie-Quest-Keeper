# Rookie Quest Keeper - Product Requirements Document

## Overview
Rookie Quest Keeper is a comprehensive TTRPG campaign management application designed for Game Masters (GMs) and Players to run better tabletop sessions.

## Product Vision
An all-in-one campaign operating system for 5e combining worldbuilding, AI content generation (ROOK), combat control, player tools, and live session features.

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

### Backlog
- [ ] Party Inventory tracking (Hero Tier)
- [ ] **Session Recap AI (Quest Master Tier)** - AI-powered session summaries
- [ ] **Smart Entity Linking** - Auto-link NPC names, locations to their pages
- [ ] Backend refactoring (split server.py into routers)
- [ ] Mobile-first Combat Tracker
- [ ] "Zero Prep Mode" AI generation
- [ ] Shareable World Codex for players
- [ ] Offline Mode
- [ ] Ambient Soundscapes

---

## Testing Status
- 30/30 frontend tests passing (dice rolls, journal, subscription)
- Comprehensive stress test passed (10/10 API tests)
- Recurring Stripe subscriptions verified
- Monthly and yearly billing both working
- Promo codes work correctly with subscription pausing
- All dice roll buttons verified working (ability checks, saves, skills, initiative)
- Session Journal CRUD verified working

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
1. Context-Aware AI Idea Generation (enhance ROOK to use campaign data)
2. Character Builder enhancements (subclasses, spells, feats)
3. Continue auditing other tabs for old color references
4. Full regression testing
5. User acceptance testing

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
