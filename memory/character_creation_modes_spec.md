# Character Creation Modes + ROOK AI Match (Implementation Spec)

## Goal
Ship a four-lane character creation experience plus an AI-assisted premade matcher:
1. Premade Characters
2. Basic Build
3. Full Creation
4. Kids Mode

This spec is designed to be handed to Emergent for implementation.

---

## Product Overview

### 1) Premade Characters
- Player chooses a curated archetype template.
- Player sets **Creative Power** level:
  - `locked`: level-up choices auto-applied.
  - `guided`: curated short choices at key moments.
  - `manual`: full choices enabled.

### 2) Basic Build
- Inputs only: `name`, `level`, `class`, `race` (and optional portrait).
- Everything else is auto-filled by server defaults.

### 3) Full Creation
- Current advanced flow (edition, race, class, background, abilities, skills, review).
- Keep all control exposed.

### 4) Kids Mode
- Simplified UI + curated rules.
- Fewer options, plain language descriptions, and safe defaults.

### 5) Premade tab: "AI Match Me" (ROOK)
- Player describes desired playstyle in free text.
- ROOK returns best match + 2 alternatives.
- Each match includes "why it fits" explanation.

---

## Frontend Architecture

## Route additions
- `/characters/new` -> new mode picker screen.
- `/characters/new/premade`
- `/characters/new/basic`
- `/characters/new/full`
- `/characters/new/kids`

## New components
- `frontend/src/components/CharacterCreationModePicker.js`
- `frontend/src/components/PremadeCharacterBuilder.js`
- `frontend/src/components/BasicCharacterBuilder.js`
- `frontend/src/components/KidsCharacterBuilder.js`
- `frontend/src/components/PremadeAIMatchTab.js`

## Shared utility hook
- `frontend/src/hooks/useCreationModeConfig.js`
- Returns step visibility, field lock state, and allowed choices based on mode.

---

## Backend API Changes

## New endpoints

### 1) Get premade templates
`GET /api/character-templates`

Response:
```json
{
  "templates": [
    {
      "id": "fighter_guardian_v1",
      "name": "Shield Guardian",
      "class": "Fighter",
      "race": "Human",
      "level": 1,
      "complexity": 1,
      "playstyle_tags": ["tank", "melee", "simple"],
      "pitch": "A sturdy front-line protector.",
      "auto_level_plan": {"subclass":"Champion","asi":"strength_then_constitution"}
    }
  ]
}
```

### 2) Create from premade
`POST /api/characters/create-from-template`

Request:
```json
{
  "template_id": "fighter_guardian_v1",
  "name": "Aric",
  "creative_power": "locked",
  "edition": "2014"
}
```

### 3) Create basic build
`POST /api/characters/create-basic`

Request:
```json
{
  "name": "Aric",
  "level": 3,
  "character_class": "Fighter",
  "race": "Human",
  "edition": "2014"
}
```

### 4) ROOK match premade
`POST /api/character-templates/ai-match`

Request:
```json
{
  "description": "I want to protect teammates and be easy to play",
  "preferences": {
    "complexity": "easy",
    "combat_style": "melee",
    "role": "tank"
  }
}
```

Response:
```json
{
  "best_match": {
    "template_id": "fighter_guardian_v1",
    "score": 0.92,
    "why": "Great fit for easy front-line defense and protecting allies."
  },
  "alternatives": [
    {"template_id":"paladin_warden_v1","score":0.84,"why":"Defensive with support magic."},
    {"template_id":"barbarian_stalwart_v1","score":0.79,"why":"Simple, durable melee bruiser."}
  ]
}
```

---

## Data Model Extensions

## player_characters (new fields)
- `creation_mode`: `"premade" | "basic" | "full" | "kids"`
- `creative_power`: `"locked" | "guided" | "manual"` (premade only)
- `template_id`: string | null
- `autopilot_settings`:
  - `asi`: `"auto" | "manual"`
  - `feats`: `"auto" | "manual"`
  - `spells`: `"auto" | "manual"`
  - `subclass`: `"auto" | "manual"`
- `kids_mode_enabled`: boolean

## character_templates (new collection)
- `id`, `name`, `pitch`, `class`, `race`, `level`
- `complexity` (1-5)
- `playstyle_tags` (array)
- `resource_intensity` (`low|medium|high`)
- `auto_level_plan` (json)
- `ability_array`, `skills`, `equipment`, `spells`, `features`
- `version`

---

## ROOK AI Matching Design

## Two-phase match
1. Deterministic scorer:
   - Parse signals from description + toggles.
   - Score templates by tag overlap and complexity fit.
2. LLM explainer:
   - Explain top 3 in plain language.

## Why this design
- Prevents random/unstable template picks.
- Keeps results reproducible for QA.
- Uses AI for explanation quality, not core ranking integrity.

---

## Kids Mode Requirements

## UX constraints
- Max 3 choices per decision point.
- Large buttons, icons, plain-language copy.
- Avoid jargon unless tappable definition exists.

## Rules constraints
- Curated spell list per class (small set).
- Simplified feat packs (e.g., "Strong", "Sneaky", "Helper").
- Optional short turn-by-turn tips.

---

## Rollout Plan

## Phase 1 (MVP, 1-2 sprints)
- Mode picker
- Basic build endpoint + UI
- Premade browse + create-from-template

## Phase 2
- Creative power autopilot on level-up
- AI Match Me endpoint + tab

## Phase 3
- Kids mode full experience
- telemetry + A/B tuning

---

## Acceptance Criteria
- New character flow always starts with mode picker.
- Basic mode can create legal characters in <= 30 seconds.
- Premade mode creates characters with template data and selected creative power.
- AI Match returns exactly 1 best + 2 alternatives with reasons.
- Kids mode presents simplified choices and never blocks on advanced data.

