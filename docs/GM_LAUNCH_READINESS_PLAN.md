# GM Launch Readiness Progression Plan

This plan keeps the next launch-readiness work focused on the GM side first, then returns to player-side polish after campaign management and live play feel reliable.

## Direction

- Prioritize the GM experience before additional player-side expansion.
- Build on existing campaign, world, NPC, notes, handout, map, combat, and live-session tools instead of inventing parallel flows.
- Move the visible app toward the Rookie Quest charcoal/red/white theme in small page-level passes.
- Add backend test coverage where it protects campaign data, permissions, imports, and live-session workflows.
- Keep each PR small enough to review and roll back safely.

## Theme progression

The new theme should become sitewide, but not through a single broad rewrite.

1. Define or confirm shared theme tokens for charcoal surfaces, red actions, white text, muted grey support text, and sharp/minimal cards.
2. Apply the theme to GM-facing pages first.
3. Replace local legacy blue, gold, purple, or velvet palettes only when a page is already being touched for GM launch work.
4. Keep compatibility aliases where older components still rely on existing variable names.
5. After GM launch readiness is stable, continue the same theme pass across player dashboards, character creation, and character sheets.

## GM progression order

### 1. GM route and data audit

Goal: confirm what already exists before adding new flows.

- Inventory GM-facing routes and components.
- Inventory backend campaign-owned routes and collections.
- Identify which screens already support create, read, update, delete, empty, loading, and error states.
- Identify where GM-only actions are visible to non-GM users.
- Identify where a campaign has no data yet and should show a clear next action.

Deliverable: a focused audit note or checklist that names the exact files and routes to improve next.

### 2. Campaign dashboard readiness

Goal: make the campaign dashboard the stable GM home base.

- Make empty states clear for first-time GMs.
- Make campaign cards/actions visually match the new theme.
- Keep create/join/edit/delete behavior unchanged unless a bug is found.
- Make navigation to notes, NPCs, maps, handouts, world tools, and live session tools obvious.
- Add manual checks for mobile layout and GM/player permission visibility.

### 3. Campaign information intake

Goal: support the real workflow of getting campaign material into the app.

Start with the safest intake model first:

- Paste or type campaign notes/content.
- Save content to the current campaign.
- Let the GM organize content into existing concepts such as notes, NPCs, locations, handouts, or story arcs when those tools already exist.

Avoid in the first pass:

- Complex PDF parsing.
- Large automatic schema migrations.
- AI-only import flows with no review step.
- Replacing existing notes/world/NPC tools.

Future improvements can add structured import, AI extraction, and file upload once the baseline manual intake is stable.

### 4. GM tools polish

Goal: make each GM tool useful even when the campaign is new or sparse.

Work through tools in this order:

1. Notes and campaign content.
2. NPCs and relationship tools.
3. Locations, world tools, and places of interest.
4. Maps and handouts.
5. Session planning and session logs.
6. Combat, initiative, party, and reference tools.
7. Live/player display controls.

For each tool:

- Confirm it opens without crashing.
- Confirm the empty state tells the GM what to do next.
- Confirm create/update/delete errors use plain language.
- Confirm primary actions are visible and theme-consistent.
- Confirm data is scoped to the selected campaign.

### 5. Backend test progression

Goal: add backend tests that protect GM data before making larger GM changes.

Start with reliable tests around:

- Campaign CRUD and ownership checks.
- Campaign content CRUD.
- Notes CRUD.
- NPC CRUD and campaign scoping.
- Maps and handouts campaign scoping.
- Invite/member permission behavior.

Then add CI coverage gradually:

1. Run stable backend helper tests that do not require external services.
2. Document test environment variables and database expectations.
3. Add database-backed GM route tests once the setup is repeatable.
4. Keep frontend build CI in place while backend CI is introduced.

### 6. Live-session readiness

Goal: make the live GM table tools dependable after campaign data is stable.

- Confirm live session screens load from campaign context.
- Confirm player display controls have clear empty and disconnected states.
- Confirm initiative, combat, dice, and session log tools do not require hidden setup.
- Confirm WebSocket behavior is tested or at least manually checked for GM-owned campaigns.

## Manual checks for GM-first PRs

For any GM-facing PR, check:

- Campaign dashboard opens.
- A new campaign has clear next steps.
- An existing campaign opens without console-breaking errors.
- GM-only actions are hidden or blocked for non-GM users.
- Empty/loading/error states are understandable.
- Mobile layout is not obviously broken.
- The touched page follows the charcoal/red/white theme direction.
- Data remains scoped to the selected campaign.
- Backend route changes include or update tests when practical.

## Near-term PR backlog

1. Audit GM routes, components, and backend endpoints.
2. Add deployment and backend test environment docs.
3. Add a backend CI starter job for stable non-DB tests or documented DB-backed tests.
4. Polish the campaign dashboard empty/loading/error states.
5. Apply the new theme to the campaign dashboard.
6. Improve notes/campaign content intake for campaign information.
7. Add backend tests for campaign content and notes.
8. Polish NPC and world/location tools.
9. Polish maps and handouts.
10. Polish live-session tools.

## Deferred until after GM readiness

- Broad player-side redesigns.
- More character creation features unless they unblock GM testing.
- Full character builder refactors outside the already planned small-step extraction work.
- Large AI import automation without a reviewed manual baseline.
- Backend schema migrations unless required by the campaign information workflow.
