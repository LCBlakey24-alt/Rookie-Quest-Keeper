# D&D DM Screen Companion - Product Requirements Document

## Overview
A comprehensive web application for Dungeons & Dragons Dungeon Masters, serving as a digital "DM Screen" for managing campaigns, combat, and world-building.

## User Persona
**Primary User**: Dungeon Masters (DMs) running D&D 5e campaigns who need quick access to game information, combat management, and world-building tools during sessions.

## Core Requirements

### Authentication
- [x] Username/password registration and login
- [x] JWT-based session management
- [x] Protected routes for authenticated content

### Campaign Management
- [x] Create and manage multiple campaigns
- [x] Campaign Dashboard with tabbed interface
- [x] Campaign Setting tab with AI assistant
- [x] Gods pantheon management
- [x] NPC creation and management
- [x] **Locations with Places of Interest** (shops, taverns, temples, etc.)
- [x] Player character management with stat generation
- [x] In-game notes with AI categorization

### Combat System
- [x] Combat Creator for preparing encounters
- [x] Monster Database with 2687+ creatures from D&D lore
- [x] Initiative tracker
- [x] Combat Page with two-column layout (tracker left, map right)
- [x] Enemy loot assignment and collection
- [x] AI Encounter Generator

### DM Screen (Live Session)
- [x] Tabbed interface (Combat, Dice, Loot Gen, Inventory, Party, Notes)
- [x] Dice roller with all standard D&D dice
- [x] AI Loot Generator
- [x] Party Inventory with drag-and-drop item assignment
- [x] Party overview with player stats and **correct initiative modifiers**
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

### UI/UX
- [x] "Rookie Quest" branded aesthetic
- [x] **Enlarged logos on login page** (both sides + above form)
- [x] Dark fantasy theme with glow effects
- [x] Responsive design
- [x] Consistent tabbed navigation

## Technical Stack
- **Frontend**: React.js, TailwindCSS, react-beautiful-dnd
- **Backend**: FastAPI (Python), Motor (async MongoDB)
- **Database**: MongoDB
- **AI**: Emergent LLM for content generation
- **Authentication**: JWT

## Data Models

### Campaign
```javascript
{
  id, dm_user_id, name, system,
  inventory: { currency: {}, items: [] },
  combat_scenarios: [{ combatants: [{ loot: [] }] }],
  custom_items: []
}
```

### Location (with Places of Interest)
```javascript
{
  id, campaign_id, name, location_type,
  description, notable_npcs, notes,
  places_of_interest: [{
    id, name, place_type,  // shop, tavern, temple, etc.
    description, owner, services, notes
  }]
}
```

## API Endpoints

### Places of Interest
- `POST /api/campaigns/{id}/locations/{loc_id}/places` - Add place
- `GET /api/campaigns/{id}/locations/{loc_id}/places` - List places
- `PUT /api/campaigns/{id}/locations/{loc_id}/places/{place_id}` - Update place
- `DELETE /api/campaigns/{id}/locations/{loc_id}/places/{place_id}` - Delete place

### Items Database
- Loaded from 3,076 items extracted from D&D backup file
- Frontend data file: `/app/frontend/src/data/itemsDatabase.js`

## Test Status
- **Backend**: 63/63 tests passing (100%)
- **Frontend**: 51/51 E2E tests passing (100%)

---
Last Updated: March 1, 2026
