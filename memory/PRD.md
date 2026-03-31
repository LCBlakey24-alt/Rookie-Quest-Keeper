# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build a TTRPG application called "Rookie Quest Keeper" (ROOK) for Players (character management) and Game Masters (campaign management, GM tools).

## Visual Theme: Cyber-Fantasy Dual Theme

### GM Mode - "Midnight Neon" (Purple/Violet)
- Background: Black (#0B0B0D) → purple glow at bottom
- Primary: #8A2BE2, Secondary: #4B0082
- Gradient: `linear-gradient(135deg, #4B0082, #8A2BE2)`

### Player Mode - "Electric Tundra" (Blue/Cyan)
- Background: Dark blue (#050A30) → cyan glow at bottom
- Primary: #4DD0E1, Secondary: #0066FF

## GM Screen Features (12 Tabs - Live Play Only)
1. Combat, 2. Location, 3. NPCs, 4. NPC Network, 5. Monsters, 6. Tables, 7. Loot, 8. Dice, 9. Party, 10. Notes, 11. Story Arcs, 12. Soundboard

**AI Co-GM**: Floating assistant panel accessible on every tab, context-aware

## Completed Features

### NPC Network (March 31, 2026)
- Visual graph with draggable NPC nodes, full stat blocks (6 ability scores, skills, attacks, abilities, spells)
- AI generation (GPT-4o) with class-appropriate stats
- Editable NPCs with 6-section edit modal
- 8 relationship types between NPCs

### World Map System (March 31, 2026)
- Draggable pins, instant placement (no refresh), grid overlay (square/hex/diamond)
- Custom drawable freehand paths, terrain types with modifiers
- Travel calculator (5 modes: foot/horse/cart/ship/flying)
- Travel animation with day counter

### AI Co-GM (March 31, 2026)
- Floating chat panel on GM Screen with sparkle button toggle
- 9 tab-context modes: Combat Advisor, Location Guide, NPC Voice, Intrigue Weaver, Bestiary Expert, Story Architect, Random Oracle, Treasure Master, Session Scribe
- Context-aware hint buttons, GPT-4o powered responses
- Backend endpoint: POST /api/rook/chat

### Equipment & Inventory Enhancement (March 31, 2026)
- Electric Tundra theme for player inventory
- Auto-save on equip/unequip
- AC auto-calculation from equipped armor/shield
- Stat propagation back to character sheet

### Combat Flow Enhancement (March 31, 2026)
- 16 status conditions with full SRD rule descriptions (tooltips)
- New conditions: Hasted, Raging, Hexed
- Midnight Neon theme applied to combat page

### Theme Cleanup (March 31, 2026)
- Fixed 16+ components from old red/gold/pink to proper dual-theme
- Removed Uploads tab from GM Screen (live play only)

### Previous Completions
- Copyright cleanup (SRD-safe only)
- Dual-theme system, Player Dashboard unlocked
- 3D Dice Roller with edge glow effects
- Soundboard, Story Arcs

## Upcoming Tasks (Priority Order)

### P1 - High Priority
1. **Smart Session Log** - Auto-tagging NPCs/locations, AI recaps
2. **Advanced Map Enhancements** - Fog of war, multi-layer, location hover cards

### P2 - Medium Priority
3. **Loot & Economy System** - Shared party loot, regional wealth, dynamic trade
4. **Event System** - Festivals, tournaments with risk/reward
5. **Mini-Game Engine** - Horse racing, gambling with dice
6. **Session Replay Generator** - Narrative recaps
7. **Player Sync** - Real-time shared views

### Refactoring
- backend/server.py is 9700+ lines → break into domain routers

## Known Issues
- Production Login/Password Reset Broken (BLOCKED - external)

## Test Results
- iteration_61: Backend 90%, Frontend 100% (AI Co-GM + Combat + Equipment)
- iteration_60: Frontend 100% (Theme + Map)
- iteration_59: Backend+Frontend 100% (NPC Network)

## Test Credentials
- Email: lcblakey24@outlook.com
- Password: LCBlakey24?!

---
*Last Updated: March 31, 2026*
