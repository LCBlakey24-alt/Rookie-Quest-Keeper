# Architecture

## Overview

Rookie Quest Keeper is split into a React frontend and a FastAPI backend. The backend exposes REST endpoints under `/api` and a WebSocket endpoint for live campaign sync.

```text
frontend React app
      |
      | HTTP /api/*
      | WebSocket /ws/campaign/{campaign_id}
      v
backend FastAPI app
      |
      v
MongoDB
```

## Backend

### Entry point

`backend/server.py` is the application entry point. It:

- Creates the FastAPI app.
- Registers all routers from `routes/__init__.py` under `/api`.
- Configures CORS from explicit trusted origins.
- Exposes `/health` and `/api/health`.
- Hosts the campaign WebSocket endpoint.
- Seeds initial rule/template data at startup.

### Configuration

`backend/config.py` owns required environment variables, MongoDB connection setup, JWT settings, CORS settings, admin username configuration, and core fantasy-d20 constants such as hit dice and subclass unlock levels.

Required env vars should fail loudly on startup rather than silently falling back to unsafe defaults.

### Routing

Domain routes live in `backend/routes/`.

Key route areas:

- `auth.py` — register, login, account updates, password reset, account deletion.
- `admin.py` — admin dashboard, users, exports, impersonation, template management.
- `campaigns.py` and campaign content routes — campaign CRUD and campaign-owned data.
- `characters.py` — core character CRUD, level-up, multiclass, character linking.
- `character_patch.py` — lenient live character-sheet PATCH route.
- `srd.py`, `progression.py`, `rule_systems.py` — rule/reference/progression helpers.
- `ai.py` — text-based Rook AI helpers.
- `homebrew.py` — parse, save, list, and delete user homebrew.

### Character update strategy

There are currently two update paths:

- `PUT /api/characters/{id}` in `characters.py` for stricter full updates.
- `PATCH /api/characters/{id}` in `character_patch.py` for live sheet/builder saves.

Long term, the frontend should use PATCH for live sheet state and reserve PUT for full edit-mode replacement. This avoids failed saves when a character sheet sends fields the older strict model does not know about.

### Realtime sync

`/ws/campaign/{campaign_id}` authenticates using a token query param, verifies campaign membership, then broadcasts campaign messages such as cursor movement, map updates, initiative updates, chat messages, and dice rolls.

### Database

MongoDB collections are used directly through Motor. Many collections are user-owned, campaign-owned, or both. Deletion and export features should be careful to avoid orphaned documents.

## Frontend

### Entry point

`frontend/src/App.js` is the main route and auth gate. It:

- Sets up React Router routes.
- Checks token validity through `/api/auth/me`.
- Stores the current token and username in localStorage.
- Applies route-based themes.
- Adds global keyboard shortcut handling.
- Mounts the impersonation banner and toast provider.

### Important frontend areas

- `components/UnifiedDashboard.js` — home dashboard for characters and campaigns.
- `components/CharacterBuilder.js` and `components/builder/*` — character creation/edit workflow.
- `components/CleanCharacterSheet.js` / sheet components — active player sheet experience.
- `components/GMScreen.js` and `components/gm/*` — GM screen and live-play tools.
- `components/CombatPage.js` — full-screen combat tracker.
- `components/HomebrewWorkshop.js` — homebrew import/create workflow.
- `components/admin/*` — admin pages.

### API base handling

`frontend/src/lib/api.js` builds both `BACKEND_URL` and `API_BASE` from `REACT_APP_BACKEND_URL` or `window.location.origin`. If the configured value already ends with `/api`, it avoids double-appending `/api`.

## Current architecture risks

1. Some frontend components are very large and should be split into safer subcomponents.
2. Inline styling is used heavily, which increases render churn and makes design consistency harder.
3. Character save logic exists in multiple paths and should be made more consistent.
4. Account deletion must be kept in sync with every new user-owned collection.
5. AI and file-parsing endpoints need clear usage limits before public launch.
6. WebSocket message types should eventually be typed/validated rather than accepting arbitrary data.

## Preferred future direction

- Smaller frontend components with lazy-loaded heavy tabs.
- Shared frontend API client instead of scattered axios calls.
- Shared backend helpers for ownership checks and account cleanup.
- Regression tests for critical save flows.
- Centralized constants for collection names and user/campaign deletion rules.
