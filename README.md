# Ultimate DM Screen (Rookie Quest Keeper)

A full-stack tabletop RPG companion with:
- GM dashboard + player dashboard
- campaign, map, combat, notes, and worldbuilding tools
- auth + account management + subscription support
- AI-assisted generation features


## IP & copyright safety

This project is intended for **system-agnostic / 5e-compatible** tabletop play.

To reduce copyright and trademark risk:
- Do not use official brand names, logos, or trade dress from third-party publishers.
- Do not ship proprietary setting text, character names, artwork, or book excerpts.
- Prefer original/homebrew content or open-licensed rules content you are permitted to use.
- Configure AI prompts/content generation to avoid proprietary franchises and to create original material.

This project is not affiliated with or endorsed by Wizards of the Coast.

If you run into merge conflict markers in this section (`<<<<<<<`, `=======`, `>>>>>>>`),
keep the IP & copyright safety block and remove the marker lines before committing.

## Project structure

- `frontend/` — React + CRACO UI
- `backend/` — FastAPI server
- `backend/tests/` — backend test suite

## Prerequisites

- Node.js 18+
- Yarn 1.22.x
- Python 3.10+
- MongoDB (or the DB endpoints/environment expected by backend)

## Environment variables

### Frontend (`frontend/.env`)

Required in most deployments:

```bash
REACT_APP_BACKEND_URL=https://<your-backend-domain>
```

Notes:
- If `REACT_APP_BACKEND_URL` is omitted, frontend now falls back to `window.location.origin`.
- That fallback is useful for single-origin deploys where frontend and backend are hosted together.

### Backend (`backend/.env`)

At minimum configure:

```bash
MONGO_URL=<your-mongodb-connection-string>
DB_NAME=<database-name>
JWT_SECRET=<strong-secret>
CORS_ORIGINS=https://<your-frontend-domain>
```

Optional but recommended depending on features used:

```bash
APP_URL=https://<your-frontend-domain>
RESEND_API_KEY=<for password reset emails>
SENDER_EMAIL=<verified sender>
STRIPE_SECRET_KEY=<if using subscription checkout>
```

## Local development

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2) Frontend

```bash
cd frontend
yarn install
yarn start
```

App should run on `http://localhost:3000` and call backend at `REACT_APP_BACKEND_URL`.

## Known routes (core)

- `/` — landing
- `/auth` — login/register
- `/reset-password?token=...` — password reset
- `/home` — authenticated dashboard
- `/campaigns` — campaign list

## Deployment notes (GitHub + Emergent)

1. Push repository to GitHub.
2. In your deploy platform, set **frontend** env var:
   - `REACT_APP_BACKEND_URL`
3. Set **backend** env vars listed above.
4. Ensure backend CORS includes your frontend domain.
5. Deploy backend first, then frontend.
6. Verify auth flow:
   - register/login works
   - token persists across refresh
   - reset password link opens `/reset-password?token=...`


## Recommended next updates (priority order)

1. **Character Builder reliability pass**
   - Enforce ability score bounds in UI and at API validation.
   - Add selectable build modes (Manual, Standard Array style, Point Allocation style).
   - Validate race/class/background selections against your own internal rules dataset.

2. **Character creation consistency**
   - Add derived-stat preview before save (HP, proficiency, spell/DC basics).
   - Block save when required fields are invalid and show inline field-level errors.
   - Add autosave + draft recovery for partially built characters.

3. **Deployment hardening**
   - Add `/api/health` frontend startup check with clear UI message if backend is unreachable.
   - Add centralized API error handling/toasts for auth-expired and network failures.

4. **Content/IP safety QA**
   - Keep all public-facing labels system-agnostic / "5e-compatible" and avoid third-party trademarks.
   - Use only original or properly licensed text/art assets in generated or seeded content.

## Quick troubleshooting

- **Login fails instantly / network error**:
  - check `REACT_APP_BACKEND_URL`
  - verify backend is reachable and CORS allows frontend origin
- **Password reset email not sent**:
  - verify `RESEND_API_KEY` and `SENDER_EMAIL`
- **`undefined/api` requests**:
  - indicates missing/incorrect frontend env at build time

