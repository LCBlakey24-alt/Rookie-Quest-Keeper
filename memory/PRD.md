# Rookie Quest Keeper (ROOK) - Product Requirements Document

## Original Problem Statement
Build an immersive, context-aware TTRPG application with strict SRD 5.1 compliance. Dual-theme design (Midnight Neon for GM, Electric Tundra for Players), advanced GM tools, and a combat-ready player dashboard surpassing D&D Beyond.

## Architecture
```
/app
├── backend/
│   ├── server.py              # Thin orchestrator
│   ├── models/                # Pydantic models
│   ├── routes/                # 18 modular route files
│   ├── tests/                 # Test scripts
│   └── utils/
└── frontend/src/
    ├── components/
    │   ├── ui/DiceRoller3D.js          # BG3-style sequential dice animation
    │   ├── DiceRoller.js               # GM dice roller
    │   ├── DiceRollHistory.js          # Dice roll history sidebar
    │   ├── CharacterSheetFull.js       # Player page (compact layout, backstory tab, rest panel)
    │   ├── CharacterCombatTab.js       # Combat dashboard (HP, attacks, exhaustion, concentration)
    │   ├── RestPanel.js                # Short/Long Rest automation
    │   ├── LevelUpWizard.js            # Full class progression (12 classes, 24 subclasses)
    │   ├── GMScreen.js                 # GM tools (13 tabs + initiative tracker, session timer)
    │   └── gm/
    │       ├── AISessionPlanner.js     # AI Outline, Replay & Prep Checklist
    │       ├── InitiativeTracker.js    # Drag-and-drop turn order with HP tracking
    │       ├── SessionTimer.js         # Real-time session duration counter
    │       └── QuickNpcGenerator.js    # Instant NPC with personality/quirk/motivation
    └── data/
        ├── classFeatures.js            # 2014 + 2024 rules, 12 classes, 24 subclasses
        ├── characterRules5e.js         # 9 races, backgrounds, multiclass
        ├── conditionEffects.js         # 16 conditions → roll effects
        └── spellDatabase.js
```

## Implemented Features

### Phases 1-9: Core through Condition Auto-Effects (Complete)
Full auth, character CRUD, 18-route backend, GM tools (13 tabs), world map, AI, 3D dice, soundboard, NPC network, Smart Spellbook, Quick-Action Inventory, Player Progression Dashboard, AI Session Planner, Dice Roll History, Combat UX Overhaul (clickable attacks, HP tracker, death saves), 16 D&D 5e conditions with auto-effects.

### Phase 10: UI Compaction & Trackers (Complete - March 31, 2026)
Compact 3-column layout, Exhaustion Tracker (1-6), Concentration Tracker, 2024 class features for all 12 classes.

### Phase 11: Session Prep Checklist (Complete - March 31, 2026)
AI-generated prep checklists (8 categories, 3 priorities, progress tracking).

### Phase 12: Full Class Progression (Complete - March 31, 2026)
- **24 subclasses** across all 12 classes (Barbarian: Berserker/Totem Warrior, Bard: Lore/Valor, Cleric: Life/Light, Druid: Land/Moon, Fighter: Champion/BM/EK, Monk: Open Hand/Shadow, Paladin: Devotion/Ancients, Ranger: Hunter/Beast Master, Rogue: Thief/Assassin, Sorcerer: Draconic/Wild Magic, Warlock: Fiend/Archfey, Wizard: Evocation/Abjuration)
- Fighting styles for Fighter, Paladin, Ranger
- Spellcasting progression, ASI/Feat, multiclass support
- 9 races verified (Human, Elf, Dwarf, Halfling, Gnome, Tiefling, Aasimar, Goliath, Orc)

### Phase 13: Player & GM Experience Enhancements (Complete - March 31, 2026)
**Player Page:**
- **Rest Panel**: Expandable Short/Long Rest automation in Combat tab. Short Rest: hit dice selector (d[hitdie]+CON), resource recovery. Long Rest: full HP restoration, hit dice recovery, spell slot reset, exhaustion reduction.
- **Backstory Tab**: 7 editable fields (Personality Traits, Ideals, Bonds, Flaws, Backstory, Allies & Organizations, Appearance) with inline editing and backend persistence.

**GM Screen:**
- **Initiative Tracker**: Add combatants (Name, Init, HP, NPC flag). Roll All initiative. Start Combat with sorted turn order, highlighted current turn, round counter. HP bars with +/- adjustment. Next Turn advances through the order.
- **Session Timer**: Real-time play duration counter in the GM Screen header. Play/pause/reset controls. Monospace font display.
- **Quick NPC Generator**: Instant random NPC with name, race, occupation, personality, quirk, motivation, and voice note. Regenerate for new NPC. Copy to clipboard button.

## Prioritized Backlog

### Suggested Enhancements
- Party View Panel (see allies' HP/AC/conditions at a glance)
- Spell Slot visual overhaul (animated orbs)
- Combat Log per character
- Player Handout System (GM reveals content to specific players)
- Session Recap Sharing (shareable links for session replays)

### P2 - Future Tasks
- Event System: Custom activities with configurable costs/risks
- Mini-game Engine: Gambling/racing with dice outcomes

### Known Issues (External)
- Production Login/Password Reset: BLOCKED (external hosting config)
- Production Deployment Risk: BLOCKED (external hosting config)

## Test Iterations (All 100%)
62-65: Core | 67-68: P1 | 69: AI Planner | 70: Fighter | 71: Combat UX | 72: Conditions | 73: UI Compaction | 74: Checklist | 75: All Classes (12/12) | 76: Player/GM Enhancements (5 features, 7/7 backend)

---
*Last Updated: March 31, 2026*
