# Rookie Quest Keeper / Ultimate DM Screen

Rookie Quest Keeper is a web-based TTRPG companion app for running campaigns, managing player characters, building homebrew, tracking combat, saving campaign lore, and giving GMs a cleaner live-play screen.

The project started as **Ultimate DM Screen** and is now being shaped into **Rookie Quest Keeper**.

## Current stack

- **Frontend:** React, React Router, CRACO, Tailwind/CSS modules, Radix UI components, Lucide icons, Sonner toasts
- **Backend:** FastAPI, Pydantic, MongoDB via Motor, JWT authentication, WebSockets for live campaign sync
- **Database:** MongoDB
- **AI features:** Text-based Rook helpers, homebrew parsing, portrait-generation routes intentionally disabled unless registered
- **Rules direction:** SRD-safe / public-domain-friendly / homebrew-friendly content only. Do not paste protected publisher text into code.

## Project structure

```text
backend/
  server.py                 # FastAPI app entry point, router registration, health checks, WebSocket sync
  config.py                 # Required environment variables, MongoDB, CORS, constants
  models/                   # Pydantic models
  routes/                   # Domain routes: auth, campaigns, characters, AI, homebrew, admin, etc.
  utils/                    # Auth, WebSocket manager, AI provider helpers
  data/                     # SRD-safe rule data and progression helpers

frontend/
  src/App.js                # Main React routes and auth gate
  src/components/           # Dashboard, GM screen, sheets, builder, admin, homebrew, etc.
  src/components/builder/   # Character builder step components
  src/components/gm/        # GM screen tools
  src/lib/                  # API and shared frontend helpers
  src/styles/               # Visual polish and responsive CSS

docs/
  PRODUCT_VISION.md         # What Rookie Quest Keeper is trying to become
  ARCHITECTURE.md           # Technical overview
  ROADMAP.md                # Next feature and cleanup priorities
  KNOWN_ISSUES.md           # Bugs, debt, and follow-up work
  AI_SAFE_RULES.md          # Rules for safe game-content generation

memory/
  PRD.md                    # Historical iteration log from earlier development
```

## Required backend environment variables

The backend fails loudly if these are missing:

```env
MONGO_URL=mongodb://...
DB_NAME=rookiequestkeeper
JWT_SECRET_KEY=replace-with-a-long-random-secret
APP_URL=https://your-app-url.com
CORS_ORIGINS=https://your-app-url.com,http://localhost:3000
```

Optional:

```env
JWT_EXPIRATION_HOURS=24
RESEND_API_KEY=...
SENDER_EMAIL=noreply@rookiequestkeeper.com
ADMIN_USERNAMES=lcblakey24
LLM_API_KEY=...
```

## Frontend environment variables

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

If `REACT_APP_BACKEND_URL` already ends in `/api`, the frontend will use it as-is. Otherwise it appends `/api` automatically.

## Local development

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
yarn install
yarn start
```

## Testing checklist before deployment

Run these checks after making changes:

```bash
cd frontend
yarn build
```

```bash
cd backend
# Fast default run (integration tests are opt-in)
pytest

# Run integration tests explicitly
pytest --run-integration -m integration
```

Manual smoke test:

1. Register/login.
2. Create a character with standard array, point buy, roll, and custom ability scores.
3. Open an existing character sheet and save HP, temp HP, conditions, spells, notes, and inventory.
4. Create/open a campaign.
5. Open the GM screen.
6. Start combat and end combat, confirming player HP persists.
7. Test mobile character sheet layout at phone width.
8. Check admin pages if logged in as an admin username.

## Current development priorities

1. Split very large frontend files into smaller safe components.
2. Finish mobile character sheet integration and testing.
3. Keep character save logic consistent between builder, sheet, and combat.
4. Improve account deletion cleanup so deleted users leave no orphaned data.
5. Add rate limits and usage limits around login, password reset, AI generation, and file parsing.
6. Lazy-load heavy routes and tabs to reduce initial frontend bundle size.
7. Keep visual style consistent: dark navy base, gold accents, clean flat panels, minimal noisy gradients.

## Content/IP safety

This repo should avoid copying protected D&D/Wizards of the Coast rules text into source files. Use SRD-safe summaries, original wording, user-created homebrew, and public-domain-compatible mechanics. When in doubt, store only names/short labels and let the user add their own private notes.
