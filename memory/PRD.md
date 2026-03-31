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
    │   ├── DiceRoller.js               # GM dice roller (adv/disadv buttons)
    │   ├── DiceRollHistory.js          # Dice roll history sidebar
    │   ├── CharacterSheetFull.js       # Player page (compact layout, condition-aware)
    │   ├── CharacterCombatTab.js       # Combat dashboard (HP, attacks, exhaustion, concentration)
    │   ├── LevelUpWizard.js            # Full class progression (subclass, fighting style, spellcasting, ASI/feat, multiclass)
    │   ├── GMScreen.js                 # GM tools (13 tabs)
    │   └── gm/AISessionPlanner.js      # AI Session Outline, Replay & Prep Checklist
    └── data/
        ├── classFeatures.js            # 2014 + 2024 rules for ALL 12 classes, subclasses, fighting styles
        ├── characterRules5e.js         # 9 races, 12 classes, backgrounds, multiclass rules
        ├── classResources.js           # Feature type configs
        ├── conditionEffects.js         # D&D 5e condition → roll effect mapping
        └── spellDatabase.js            # Spellcasting classes, spell slots, spells
```

## Implemented Features

### Phases 1-7: Core → Fighter System (Complete)
Full auth, character CRUD, 18-route backend, GM tools, world map, AI, 3D dice, soundboard, NPC network, Smart Spellbook, Quick-Action Inventory, Player Progression Dashboard, AI Session Planner, Dice Roll History, Fighter 20-level progression.

### Phase 8: Combat UX Overhaul (Complete)
Clickable attacks, HP Tracker, Roll Mode Toggle, Death Save animation, Quick Dice Bar, 2014/2024 rules edition.

### Phase 9: Condition Auto-Effects System (Complete)
16 D&D 5e conditions with mechanical effects, visual indicators, effects summary bar.

### Phase 10: UI Compaction & Trackers (Complete - March 31, 2026)
Compact 3-column layout, Exhaustion Tracker (levels 1-6, backend persistence), Concentration Tracker, 2024 Class Features for all 12 classes.

### Phase 11: Session Prep Checklist (Complete - March 31, 2026)
AI-generated prep checklists (8 categories, 3 priorities, progress tracking), "Generate from Outline" button.

### Phase 12: Full Class Progression System (Complete - March 31, 2026)
- **ALL 12 classes** now have full subclass data with SRD-compliant options:
  - Barbarian: Berserker, Totem Warrior
  - Bard: College of Lore, College of Valor
  - Cleric: Life Domain, Light Domain
  - Druid: Circle of the Land, Circle of the Moon
  - Fighter: Champion, Battle Master, Eldritch Knight
  - Monk: Way of the Open Hand, Way of Shadow
  - Paladin: Oath of Devotion, Oath of the Ancients
  - Ranger: Hunter, Beast Master
  - Rogue: Thief, Assassin
  - Sorcerer: Draconic Bloodline, Wild Magic
  - Warlock: The Fiend, The Archfey
  - Wizard: School of Evocation, School of Abjuration
- **Fighting Styles** for Paladin (4 styles at level 2) and Ranger (4 styles at level 2), matching Fighter
- **Subclass selection** in Level-Up Wizard with class-specific labels (Sacred Oath, Monastic Tradition, etc.)
- **Feature pills** preview on "Continue as [Class]" button showing what you'll gain
- **Spellcasting progression** for all casters (spell slots, cantrip/spell selection, spellbook for Wizard)
- **ASI/Feat** at correct levels per class (Fighter: 7 ASI levels, Rogue: 6, all others: 5)
- **Multiclass** option when stats qualify
- **Backend**: All 12 classes verified via automated test (12/12 PASS)
- **9 races** supported: Human, Elf, Dwarf, Halfling, Gnome, Tiefling, Aasimar, Goliath, Orc

## Prioritized Backlog

### Suggested Player Page Enhancements
- Party View Panel (see allies' HP/AC/conditions)
- Short/Long Rest automation
- Character Backstory/RP Notes tab
- Spell Slot visual overhaul (animated orbs)
- Combat Log per character

### Suggested Campaign Page Enhancements
- Initiative Tracker (drag-and-drop turn order)
- Session Timer/Clock
- Quick NPC Generator
- Player Handout System
- Session Recap Sharing

### P2 - Future Tasks
- Event System: Custom activities with configurable costs/risks
- Mini-game Engine: Gambling/racing with dice outcomes

### Known Issues (External)
- Production Login/Password Reset: BLOCKED (external hosting config)
- Production Deployment Risk: BLOCKED (external hosting config)

## Test Iterations (All 100%)
62-65: Core | 67-68: P1 | 69: AI Planner | 70: Fighter | 71: Combat UX | 72: Condition Effects | 73: UI Compaction/Trackers | 74: Prep Checklist | 75: Full Class Progression (12/12 classes)

---
*Last Updated: March 31, 2026*
