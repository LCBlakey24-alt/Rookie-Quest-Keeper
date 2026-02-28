# Rookie Quest - TTRPG Companion
## Product Requirements Document

## Overview
A comprehensive web application for tabletop role-playing game (TTRPG) Dungeon Masters (DMs), serving as an all-in-one "DM Screen" for campaign management and live gameplay. Originally called "DM Screen," rebranded to "Rookie Quest / TTRPG Companion" with a complete UI redesign in February 2026.

## Target Users
- D&D Dungeon Masters
- TTRPG Game Masters (multiple systems supported)
- New and experienced DMs

## Branding
- **Primary Logo**: Rookie Quest (stylized white text)
- **Secondary Logo**: TTRPG Companion (blue/white badge)
- **Tagline**: Your ultimate TTRPG companion

## Core Requirements

### Authentication
- [x] User registration with username/password
- [x] User login with JWT tokens
- [x] Session persistence

### Campaign Management
- [x] Create/Delete campaigns
- [x] TTRPG system selector (D&D 5e 2024, Pathfinder 2e, Call of Cthulhu 7e, etc.)
- [x] Campaign listing with cards

### Campaign Dashboard (Tabbed Interface)
- [x] **Campaign Setting** - World lore and campaign description
- [x] **Gods** - Deity management with AI generation
- [x] **NPCs** - Non-player character tracking with AI generation
- [x] **Locations** - Place management with AI generation
- [x] **Players** - Player character tracking with D&D Beyond-style character creator
- [x] **Combat Creator** - Pre-plan combat encounters with:
  - Map uploads
  - Token placement
  - **Enemy Loot Assignment** - Add specific loot items to enemies
- [x] **Calendar** - In-game date tracking with events + custom calendar builder
- [x] **In-Game Notes** - Session notes with AI auto-categorization

### DM Screen (Tabbed Interface - NEW)
All sections now organized in clean tabbed layout:
- [x] **Combat Tab** - Select encounters and launch Combat Page
- [x] **Dice Tab** - Animated dice roller with D4-D100
- [x] **Loot Gen Tab** - AI-powered loot generation
- [x] **Inventory Tab** - Party inventory with drag-drop to players
- [x] **Party Tab** - Full character cards with stats
- [x] **Notes Tab** - Session notes with two-column layout

### Dedicated Combat Page
- [x] Two-column layout: Initiative tracker (left) | Battle Map (right)
- [x] Auto-roll initiative for all combatants
- [x] Turn management with Next Turn button
- [x] HP tracking with +/- buttons
- [x] Condition toggles
- [x] Death save tracking
- [x] **Loot Collection** - "Collect Loot" button on defeated enemies with loot
- [x] **Loot Panel** - View collected loot and add to party inventory
- [x] End Combat button returns to DM Screen

### Party Inventory System
- [x] Party Treasury - Track PP, GP, EP, SP, CP
- [x] Item management - Add, edit, delete items
- [x] Item types: Weapon, Armor, Potion, Scroll, Magic Item, Misc
- [x] **Drag-and-Drop** to assign items to players
- [x] Search and filter functionality

### Combat Loot System (NEW)
- [x] Add loot items to enemies in Combat Creator
- [x] Loot fields: name, quantity, type, value, is_magical
- [x] "Collect Loot" button appears when enemy is defeated (HP <= 0)
- [x] Collected loot displayed in floating panel
- [x] "Add All to Party Inventory" transfers loot to inventory

## Technical Stack
- **Frontend**: React.js, TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT
- **AI**: Emergent LLM Key integration

## API Endpoints
- `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- `/api/campaigns` (CRUD)
- `/api/campaigns/{id}/setting`
- `/api/campaigns/{id}/gods` (CRUD)
- `/api/campaigns/{id}/npcs` (CRUD)
- `/api/campaigns/{id}/locations` (CRUD)
- `/api/campaigns/{id}/players` (CRUD)
- `/api/campaigns/{id}/calendar` (GET/PUT)
- `/api/campaigns/{id}/calendar/advance`
- `/api/campaigns/{id}/calendar-events` (CRUD)
- `/api/campaigns/{id}/combat-scenarios` (CRUD)
- `/api/campaigns/{id}/ingame-notes` (CRUD)
- `/api/campaigns/{id}/inventory` (CRUD)
- `/api/campaigns/{id}/currency` (GET/PUT)
- `/api/ai/generate`

## Database Schema
- **users**: {username, hashed_password}
- **campaigns**: {name, system, user_id, created_at}
- **campaign_settings**: {campaign_id, content, dm_rules}
- **gods, npcs, locations, players**: Campaign-linked entities
- **calendars**: {campaign_id, type, current_day/month/year, custom_months}
- **calendar_events**: {campaign_id, name, day, month, year, is_recurring}
- **combat_scenarios**: {campaign_id, name, combatants (with loot array), map_url, tokens}
- **ingame_notes**: {campaign_id, content, ai_processed}
- **inventory**: {campaign_id, name, quantity, item_type, description, value, weight, is_magical, attunement_required, attuned_to}
- **party_currency**: {campaign_id, copper, silver, electrum, gold, platinum}

## Test Credentials
- Users can be created via the registration form
- Example: username: `testdm1`, password: `testpass123`

## Upcoming Tasks
- [ ] **P2: AI NPC/Location Generator** - Quick generation tool in dashboard

## Future/Backlog Tasks
- [ ] Enhanced Map features (fog of war, AoE templates, distance measurement)
- [ ] Monetization (Stripe integration)
- [ ] Enhanced Players tab (stats on hover)
- [ ] Backend refactoring (split server.py into routers)
- [ ] Database normalization (separate collections)
- [ ] Mobile-optimized views
- [ ] Export/Import campaign data

---
Last Updated: February 28, 2026
