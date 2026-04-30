# Roadmap

Tracking deferred features and ideas for future sprints.

---

## 🗺 Travel Grid Overlay (Map Replacement)
**Status:** Concept — replaces the deleted Map Maker.
**User intent:**
> "It should be a square grid you scale over the top of an uploaded world map, where each square represents a day's travel. The GM scales the grid so a known route equals X days, then can draw lines between locations and count squares to figure out travel time."

**Spec sketch:**
1. **Upload** a world-map image (PNG/JPG) per campaign — uses object storage.
2. **Calibration step**: GM clicks two known locations and enters "this distance = N days." Grid auto-scales so each square = 1 day.
3. **Grid overlay**: square grid, GM-toggleable opacity, snap-to-grid optional.
4. **Line tool**: GM draws straight or path lines between locations; the app counts squares crossed and shows "≈ 5 days travel."
5. **Save** all annotations per campaign so they persist between sessions.
6. **Connected hex pattern** *(rejected by user — square grid is simpler and the original implementation gave disconnected hexes which they disliked).*

**Why this beats the old Map Maker:**
- The old MapMaker tool drew tiles from scratch — too creative-tool-heavy for most GMs.
- Most GMs *already have* a world map (Inkarnate, Wonderdraft, hand-drawn). They just need a measurement layer.
- Travel-time math is a real friction point in 5e travel rules — solving it is a genuine win.

---

## Other deferred items (from `/app/memory/AUDIT.md`)

### P2 features (each ~1 session of work)
- **Player Handouts** — GM pushes text/image to a specific player during a session.
- **Session Recap Sharing** — one-click summary of the last session, copyable to Discord/Slack.
- **Custom GM Templates** — save reusable NPCs / monsters / encounters as templates.
- **Personality prompts** — guided fears/dreams/backstory questionnaire during character creation.

### Live Session deeper polish
- **Drag-to-reorder** initiative tracker (needs DnD library).
- **End-turn auto-advance** + concentration save prompts on damaged casters.
- **Delay Action** / **Ready Action** turn states.
- **Auto-save combat state** every round (browser-crash safety).
- **Broadcast to players** — push GM narration to a companion player view.

### Tech debt
- **Refactor `UnifiedDashboard.js`** (1376 lines → split into Header / PlayerSection / CampaignSection / Modals).
- **Backend `routes/ai.py`** has duplicate function bodies (~600 lines of dead code).
- **AdminPage** stat-box `data-testid` attributes for testing.
- **Backend `PUT /api/campaigns/{id}` → `PATCH`** for partial updates (currently requires full `CampaignCreate` body).

### Admin enhancements
- AI usage / cost per user dashboard.
- "Impersonate user" debug button.
- CSV export for users / campaigns.
- Feature-flag toggles.

---

*Last updated: April 30, 2026*
