# Character Builder Experience Plan

This document locks the intended experience for each Rookie Quest Keeper character builder. All four builders should use the Mystic Tabletop visual direction: dark navy surfaces, blue-to-purple accents, compact readable cards, and red only for danger/destructive states.

## Shared principles

- Every route creates a usable saved character sheet.
- Every route should show a live or near-live preview before creation.
- Every route should allow editing from the full character sheet after creation.
- Builders should feel different because of layout, wording, and amount of control, not because they each use different colour themes.
- Avoid wording such as “best mode,” “recommended mode,” or “default path.” Use neutral labels that explain purpose.

## Builder entry order

1. Full Creation
2. Basic Build
3. Premade Characters
4. Kids Mode

This order keeps the most complete route first while still making the faster routes visible.

---

## Full Creation

**Purpose:** detailed builder for players who want full control.

**Visual feel:** an arcane workshop. Use a step sidebar, a central form, and a live sheet preview. Purple should mark the active step. Blue can highlight preview/player-facing data.

**Core layout:**

```text
[ Step list ]   [ Current step form ]   [ Live character preview ]
```

**Step plan:**

1. Character setup
   - Name
   - Rules edition
   - Starting level
   - Campaign/table link if relevant
2. Class
   - Class choice
   - Hit die
   - Saving throws
   - Armour and weapon proficiencies
   - Features through selected level
   - Subclass when unlocked
3. Species
   - Species/race
   - Size, speed, traits, languages
   - Subrace/lineage choices if needed
4. Background
   - Skills
   - Tools
   - Languages
   - Equipment
   - Feature
5. Ability scores
   - Method selection eventually: standard array, point buy, manual, rolled
   - Assign scores
   - Show modifiers and class-useful hints
6. Skills, tools, and languages
   - Class skill picks
   - Tool/language choices
   - Background grants shown as locked-in
7. Equipment and defence
   - Armour
   - Shield
   - Weapons
   - Pack/equipment choices
   - Live AC and starter gear summary
8. Spells and special features
   - Cantrips
   - Spells known/prepared
   - Spellcasting ability, save DC, attack bonus
   - Non-casters see combat/features summary instead
9. Review and create
   - HP, AC, speed, proficiency bonus
   - Skills, saves, features, traits, equipment
   - Create character

**Should avoid:** large unexplained rules dumps, one giant form, hidden final consequences.

---

## Basic Build

**Purpose:** guided builder for normal players who want a proper character quickly.

**Visual feel:** compact guided form with a starter sheet preview. The user chooses the fun/important pieces; ROOK fills the sheet maths and starter details.

**Core layout:**

```text
[ Core choices and skills ]   [ Starter sheet preview ]
```

**Current/near-term sections:**

1. Character idea prompt
   - ROOK-assisted text prompt
   - Can fill name/class/species/background/level
2. Core choices
   - Name
   - Edition
   - Starting level
   - Class
   - Species
   - Background
3. Defence choices
   - Armour dropdown
   - Shield toggle
   - Live AC update
   - Saved starting equipment update
4. Class skills
   - Pick required class skills
   - Background skills shown as already granted
5. Starter sheet preview
   - HP
   - AC
   - Proficiency bonus
   - Hit die
   - Armour choice
   - Background
   - Tools
   - Languages
   - Class features
   - Starting equipment
6. Create character
   - Saves a usable sheet
   - Sheet remains editable after creation

**Should avoid:** asking for every spell/equipment option, complex point-buy flows, and advanced character optimisation choices.

---

## Premade Characters

**Purpose:** instant character route for one-shots, guests, schools, clubs, and quick starts.

**Visual feel:** choose-your-hero card gallery. Cards should feel like game character cards rather than a form.

**Core layout:**

```text
[ Filter bar ]
[ Hero card ] [ Hero card ] [ Hero card ]
[ Selected hero preview / quick customise ]
```

**Step plan:**

1. Browse hero cards
   - Filter by class
   - Filter by role
   - Filter by difficulty
   - Search by name/vibe later
2. Select hero
   - Show name, class, species, level
   - Show role tag, HP, AC, main attack/spell
   - Show beginner-friendly marker if suitable
3. Quick customise
   - Rename
   - Optional portrait/icon later
   - Optional small flavour change later
4. Create character
   - Save a copy to the player/table
   - Keep the premade template unchanged

**Card content target:**

- Name
- Class/species/level
- Role tag
- HP and AC
- Main attack/spell
- Short flavour line
- Difficulty/new-player marker

**Should avoid:** turning premades into another full form before the user can play.

---

## Kids Mode

**Purpose:** simple hero builder for younger players and absolute beginners.

**Visual feel:** big friendly choice cards. Less text, fewer visible numbers, plain-English wording. The real D&D-compatible sheet can still be created in the background.

**Core layout:**

```text
[ Big question ]
[ Big choice card ] [ Big choice card ] [ Big choice card ]
[ ROOK helper text ]
```

**Step plan:**

1. Hero name
   - Type name
   - Random name option later
2. Hero style
   - Strong hero
   - Sneaky hero
   - Magic hero
   - Nature hero
   - Healing hero
   - Brave defender
   - Map these to classes behind the scenes
3. Hero look
   - Human, elf, dwarf, halfling, tiefling, orc, etc.
   - One-line description each
4. Hero background
   - Guard
   - Explorer
   - Performer
   - Scholar
   - Helper
   - Street survivor
   - Map to rules backgrounds behind the scenes
5. Pick three strengths
   - Climbing
   - Sneaking
   - Spotting danger
   - Talking
   - Animals
   - Magic knowledge
   - Helping people
6. Pick gear
   - Sword and shield
   - Bow
   - Magic staff
   - Two daggers
   - Big axe
   - Adventurer pack
7. Hero card preview
   - Name
   - Hero type
   - HP
   - AC
   - Speed
   - Three skills
   - Main attack
   - One special thing
8. Create hero
   - Save a normal sheet
   - Keep advanced rules hidden until later

**Should avoid:** dense labels such as ability modifiers, saving throw proficiencies, spell save DC, and rules-heavy warnings during creation.

---

## Data completion targets

The builders need reliable rules data. Track these areas over time:

### Classes

- Hit die
- Primary ability
- Saving throws
- Armour proficiencies
- Weapon proficiencies
- Skill choices and count
- Features by level
- Subclass data
- Spellcasting data where needed
- Starting equipment

### Backgrounds

- Description
- Skill proficiencies
- Tool proficiencies
- Language count/options
- Equipment
- Feature
- 2014/2024 differences later

### Species/races

- Description
- Speed
- Size
- Traits
- Languages
- Subraces/lineages where needed
- 2014/2024 compatibility later

### Equipment

- Name
- Type
- Cost later
- Weight later
- Damage/properties for weapons
- AC/properties for armour
- Proficiency category
- Starting equipment mapping

### Spells

- Name
- Level
- School
- Casting time
- Range
- Components
- Duration
- Description
- Class availability
- Preparation/known rules later

---

## Implementation order

1. Keep Basic Build stable and visually aligned.
2. Polish the builder mode picker so routes are clear.
3. Document and then build Premade Characters as a card-gallery experience.
4. Build Kids Mode as its own simplified flow, not just Basic Build with fewer fields.
5. Improve Full Creation in smaller step-by-step PRs, avoiding one large refactor.
6. Add a rules-data completion tracker once classes/backgrounds/species/equipment/spells are more structured.
