# Full Run Overview (2026-05-12)

## Scope
- Repository health review for backend + frontend.
- Test/build smoke run in current environment.
- Static review for maintainability and risk hotspots.

## Commands Run
1. `cd backend && pytest -q`
2. `cd frontend && npm run -s test -- --watchAll=false`
3. `cd frontend && npm run -s build`

## Findings (Issues + Suggested Improvements)

### A) Immediate blockers
1. **Backend test suite cannot run in this environment** because Python deps are not installed in the active interpreter (`ModuleNotFoundError: No module named 'requests'`).
   - Impact: Backend regressions are currently invisible in CI-like local run.
   - Fix: Ensure `pip install -r backend/requirements.txt` is part of local/bootstrap and CI.

### B) Test coverage/process gaps
2. **Backend has many tests but no guaranteed preflight dependency check.**
   - Add a simple `make test-backend` (or npm script) that validates venv + dependencies before pytest.
3. **Frontend appears to have only one active test file (`spellDatabase.test.js`).**
   - Add component/integration tests for combat, auth flows, campaign tabs, and character sheet interactions.
4. **No single top-level command for full-stack verification.**
   - Add a root-level script (`./scripts/verify.sh`) that runs backend tests, frontend tests, and frontend build.

### C) Repository hygiene & consistency
5. **Mixed audit/report files at repo root and `memory/` can cause drift and stale guidance.**
   - Consolidate to one canonical status document and archive old reports.
6. **Potential stale/generated artifacts committed in repo** (e.g., logs/build-check files and image snapshots in root).
   - Move ephemeral outputs to ignored paths or docs assets folder.
7. **Very large frontend bundle (`~441 KB` gzipped main JS).**
   - Introduce route-level code splitting and lazy loading for heavy tabs/features.

### D) Architecture & maintainability improvements
8. **Large monolithic UI surface (`frontend/src/components/` and many consolidated tabs) likely increases regression risk.**
   - Refactor high-churn tabs into smaller feature modules with local tests.
9. **Backend route surface is broad (`backend/routes/*.py`) and likely has duplicated validation/business logic.**
   - Centralize shared validators/services and enforce schema contracts.
10. **No explicit typed API contract between frontend and backend observed.**
   - Add OpenAPI client generation or shared schema package to reduce mismatch bugs.

### E) Performance & reliability opportunities
11. **Frontend production build succeeds, but no bundle budget enforcement.**
   - Add bundle-size thresholds in CI to stop accidental growth.
12. **No visible smoke checks for critical user journeys (auth, campaign load, combat update).**
   - Add a minimal end-to-end smoke suite (Playwright/Cypress).
13. **No visible backend startup/healthcheck gate in this run.**
   - Add healthcheck endpoint test in CI plus startup sanity command.

### F) Security & operational hardening
14. **Dependency set is large; no observed automated vulnerability audit in this run.**
   - Add `pip-audit` and `npm audit` (or OSV scanner) in CI.
15. **No explicit secret/config validation pass in this run.**
   - Add startup-time env var validation with clear error output.

## Giant To-Do List (Prioritized)

### Priority 0 (Unblock now)
- [ ] Add environment bootstrap docs and scripts to guarantee backend deps before tests.
- [ ] Create one-command verification script for backend tests + frontend tests + build.

### Priority 1 (Stability next)
- [ ] Add backend dependency preflight check before pytest.
- [ ] Expand frontend tests beyond spell database to key UI flows.
- [ ] Add CI job that runs full verify command on every PR.

### Priority 2 (Quality & maintainability)
- [ ] Consolidate/normalize audit docs and remove stale duplicates.
- [ ] Move or ignore transient build/log artifacts.
- [ ] Introduce shared API schema/client contract generation.
- [ ] Break up large consolidated UI tabs into smaller tested modules.

### Priority 3 (Performance)
- [ ] Add route-level code splitting and lazy-loading.
- [ ] Define and enforce bundle size budgets in CI.

### Priority 4 (Security/ops)
- [ ] Add dependency vulnerability scanning (Python + JS).
- [ ] Add environment/secret validation and startup checks.
- [ ] Add end-to-end smoke tests for critical user journeys.

## Suggested Execution Plan
1. Week 1: Unblock reproducible test execution + one-command verification.
2. Week 2: Expand automated tests for highest-risk flows.
3. Week 3: Refactor hotspot modules and introduce API contract tooling.
4. Week 4: Performance budgets + security scans + smoke e2e.

