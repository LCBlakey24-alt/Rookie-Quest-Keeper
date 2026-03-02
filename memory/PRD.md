# Quest Keeper - TTRPG GM Companion PRD

## Overview
A comprehensive web application for Tabletop RPG Game Masters, serving as a digital "GM Screen" for managing campaigns, combat, and world-building. Supports multiple TTRPG systems including D&D 5e, Pathfinder, and more.

## Terminology
- **GM** (Game Master) - Universal term used throughout the app
- **TTRPG** - Tabletop Roleplaying Game

## User Persona
**Primary User**: Game Masters running TTRPG campaigns who need quick access to game information, combat management, and world-building tools during sessions.

## Core Requirements

### Authentication & Subscription
- [x] Username/password registration and login
- [x] JWT-based session management
- [x] Protected routes for authenticated content
- [x] **Freemium subscription model** ($3.99/month Adventurer tier)
- [x] **Promo code system** for free premium access
- [x] Subscription status tracking per user

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
- **Authentication**: JWT
- **Payments**: Stripe (via emergentintegrations)

## Key API Endpoints

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
  - entity_type: 'god', 'npc', 'location', 'place_of_interest'
  - Returns: entity_id, entity_name, success status
  - **Now checks AI usage limits for free tier users**

### Places of Interest
- `POST /api/campaigns/{id}/locations/{loc_id}/places` - Add place
- `GET /api/campaigns/{id}/locations/{loc_id}/places` - List places
- `PUT /api/campaigns/{id}/locations/{loc_id}/places/{place_id}` - Update place
- `DELETE /api/campaigns/{id}/locations/{loc_id}/places/{place_id}` - Delete place

## Test Status
- **Backend**: 91/91 tests passing (100%)
- **Frontend**: 77/77 E2E tests passing (100%)
- **New Test Files**: subscription-pricing.spec.ts, test_subscription.py

## Upcoming Tasks (Priority Order)
1. **P1: Session Recap & Player Handouts** - AI-powered "Last time on..." summaries and shareable player links
2. **P2: Dark Mode / Theme Options** - Theme switcher for better usability
3. **P3: Player View Mode** - Simplified player-safe campaign view for sharing
4. **P4: Import/Export Campaign Data** - Backup campaigns to JSON/PDF
5. **P5: Merge Combat/Encounter Gen Tabs** - Needs careful refactoring (previously failed)
6. **P6: World Calendar System** - Full customization
7. **P7: Editable Rules Reference** - User-editable content
8. **P8: Sound/Ambiance Integration** - Background music triggers
9. **P9: Mobile App / PWA** - Progressive Web App for mobile/tablet

---
Last Updated: March 1, 2026
