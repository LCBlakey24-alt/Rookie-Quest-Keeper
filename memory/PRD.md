# Rookie Quest Keeper - Product Requirements Document

## Overview
Rookie Quest Keeper is a comprehensive TTRPG campaign management application designed for Game Masters (GMs) to run better tabletop sessions in less time.

## Product Vision
An all-in-one campaign operating system for 5e Game Masters combining worldbuilding, AI content generation (ROOK), combat control, and live session tools.

---

## Design System (Updated March 2026)

### Dark Minimalist Theme
- **Background Colors:**
  - Black: `#0D0D0D`
  - Dark: `#141414`
  - Panel: `#1A1A1A`
  - Card: `#1F1F1F`
  - Hover: `#2A2A2A`

- **Accent Color:**
  - Red: `#DC2626`
  - Red Hover: `#EF4444`
  - Red Subtle: `rgba(220, 38, 38, 0.15)`

- **Text Colors:**
  - White: `#FFFFFF`
  - Secondary: `#B3B3B3`
  - Muted: `#808080`

- **UI Elements:**
  - ALL corners are SQUARE (no rounded)
  - Tabs: Hover = lighter grey + red bar on right side
  - Tabs: Active = full red background

### NO GOLD ACCENTS
The previous gold/blue theme has been completely replaced with the dark minimalist red theme.

---

## Core Features

### 1. Landing Page
- Dark minimalist design with ROOK mascot
- Red CTA buttons
- Feature showcase
- Pricing section (Free + Adventurer tiers)

### 2. Authentication
- Login/Register flow
- Password reset
- Referral system
- Dark themed auth cards

### 3. Unified Dashboard
- Post-login landing page
- "My Characters" section (left)
- "My Campaigns" section (right)
- Quick access to all features

### 4. Campaign Dashboard
- Sidebar navigation with tabs
- Setting, World, Gods, NPCs, Locations, Players, Combat, Maps, etc.
- Tab hover effect with red bar
- Tab active state = full red

### 5. GM Screen
- Combat management
- Monster database (2687+ monsters)
- Quick reference tools
- Session notes
- Dice roller

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
- [x] Full dark minimalist redesign
- [x] Landing page with new theme
- [x] Auth page (login/register/forgot password)
- [x] Unified Dashboard
- [x] Campaign Dashboard with sidebar tabs
- [x] Tab hover effect (lighter grey + red bar)
- [x] Tab active effect (full red)
- [x] Square corners on all UI elements
- [x] Quick Tips with red accent
- [x] Campaign List page
- [x] GM Screen basic layout

### In Progress
- [ ] Character Builder enhancements (subclass, spells, feats)
- [ ] Full GM Screen redesign

### Backlog
- [ ] Custom content import system
- [ ] AI-powered smart note parsing
- [ ] Backend refactoring (split server.py)

---

## Testing Status
- 36/36 frontend tests passing
- All design requirements verified
- Sidebar tabs working correctly

---

## File Structure
```
/app
├── backend/
│   ├── models.py
│   └── server.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthPage.js
│   │   │   ├── CampaignDashboard.js
│   │   │   ├── CampaignList.js
│   │   │   ├── GMScreen.js
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
1. Complete any remaining pages with the new design
2. Character Builder enhancements
3. Full regression testing
4. User acceptance testing
