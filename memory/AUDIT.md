# Rookie Quest Keeper — Full Audit

A page-by-page list of fixes (bugs/regressions) and improvements (quality-of-life).
Last updated: April 30, 2026.

---

## 1. HOME PAGE  (`/home`)

### Fixes
- Long character lists have no **search** or **filter**.
- Campaign cards don't show the **2014 / 2024 rules edition** that's set on the campaign.
- No **"Resume last character"** or **"Resume last campaign"** quick action.
- Top-right has several admin and account actions; some belong inside a profile menu.

### Improvements
- **Character cards** — show class icon, current HP/Max, last-played date, class accent dot.
- **Campaign cards** — show player count (e.g. "2 / 5"), last session date, in-world calendar date, "2024 RULES" pill.
- **Sort controls** for both lists (level / class / recent).
- Friendlier **empty state** with a "Create your first character" tutorial link.

---

## 2. ADMIN PAGE  (`/admin`)

### Fixes
- The four stat boxes use **vivid teal/red/gold/green tinted borders** — breaks the unified Dark Navy + Gold theme.
- Tab bar uses a red highlight — inconsistent with the gold-active styling everywhere else.
- No **user search** or user list view.
- No **system-health dashboard** (signups, AI calls, error rate).

### Improvements
- **AI usage / cost per user** (you're paying for LLM calls; visibility matters).
- **Campaign stats** (total, average players, active this week).
- **"Impersonate user"** button for support debugging.
- **Export** users / campaigns as CSV.
- **Feature-flag toggles** (kill-switch a broken integration in prod).

---

## 3. CHARACTER BUILDER

### Fixes
- **Mode picker layout** — 4 cards laid out as 3-in-a-row + 1 orphaned wrap. Should be 2×2 or 4-in-a-row at all widths.
- Kids Mode is last and feels like an afterthought — should be **first** (easiest entry).
- Full Creation has **9 steps but no progress percentage** — only "Step 3 of 9" text; users get lost.
- Some steps are **missing a Back button** (or hidden at the bottom).
- **No "Save as Draft"** — closing the tab mid-build loses everything.
- **No live preview panel** — you don't see your character until the end.

### Improvements
- **Right-side sticky preview** showing name, race, class, ability mods, AC/HP live-updating.
- **Point-buy / Standard Array / Roll-4d6** toggle should explain each in one line.
- Equipment step should preview **weapon damage + AC** (not just names).
- Language picker grouped "Common · Exotic" instead of one long list.
- **Smart defaults for Kids Mode** — auto-pick race + stats; only ask name + class + appearance.
- **"Randomize all"** button on Premade / Basic for indecisive players.

---

## 4. CHARACTER SHEET

### Fixes
- **Combat tab spell slots still appear pink** despite the gem refactor — needs a re-check.
- The **huge green HP bar** duplicates the Vitals-bar HP info; takes ~30 % of the panel for no extra value.
- Combat-tab summary row (AC / HP / PROF / INIT / SPEED / 2014 / Insp) looks like **disabled buttons** — flat gray outlines, no hierarchy.
- **DMG / Amount / HEAL** input is wide and clunky — should be a compact `[-1] [7] [+1]` plus a Heal-Full button inline with HP.
- **CONDITIONS section is collapsed by default** — new players miss the entire condition system.
- **Exhaustion chips (1-6)** have no tooltip explaining each level's effect.
- "Disadv / Normal / Adv" buttons are ambiguous — unclear they apply to the next roll only.
- **ATTACKS shows only "Unarmed Strike"** — equipped weapons aren't flowing into the combat panel.
- **Adventure Timeline mixes real-world dates** ("3/31/2026") with in-world events — confusing.

### Improvements
- Skills list with **proficiency icons** (○ not-prof / ● prof / ★ expertise).
- **Ability Scores** column is too narrow — modifiers feel cramped; widen it.
- Add a **portrait** at the top of the sheet (currently a generic gold ring).
- **Rest** as a quick action in the header, not buried under tabs.
- **Features & Abilities** list collapsible by class / background / race.
- "**!  Spells not prepared**" warning in the header for prepared casters.

---

## 5. GM PAGE  (Live Play Mode)

### Fixes
- **"Spontaneous Combat"** button is bright red — no other button uses red; looks broken.
- Right-side dice panel is fixed and always-visible — **eats ~300 px** even when not rolling.
- **"Quick Start with Players (0)"** is disabled but still shown — should hide when no players.
- **Initiative Order** has no helpful empty state on first load.
- Sidebar groups **don't remember collapsed state** between visits.
- No **search** across NPCs / Monsters / Notes — scrolling huge lists mid-session is painful.

### Improvements
- The **Rules 2014/2024 pill** is great but should live next to the campaign name (more discoverable).
- **NPC Quick-Search command bar** (press `/` to search any NPC by name).
- **Soundboard** with playlist / loop support.
- **AI Planner output** auto-saved to a Note.
- Combat tab needs **"Surprise Round"** toggle + **initiative re-roll**.
- Party tab should show **HP/Max per PC** (GM awareness).
- Right-side dice panel **toggleable / minimizable** to a floating icon.

---

## 6. LIVE SESSION PAGE  (full-screen combat launched from Combat tab)

### Fixes
- Launching combat jumps to a completely different UI with **no Back button** to return to GM tabs.
- **Turn timer** not implemented (SessionTimer is global, not per-turn).
- No **round counter** displayed prominently.
- Conditions applied to combatants **don't persist** when combat ends.
- Mid-combat HP edits **don't sync** back to the player's character sheet.
- HP edits **lost if you refresh** the page.

### Improvements
- **Drag-to-reorder** initiative tracker.
- **"End Turn"** button auto-advances and decrements concentration saves on damaged casters.
- Add **"Delay Action"** and **"Ready Action"** turn-state options.
- **Hide Monster HP from players** (GM-view toggle).
- **Kill / Down** buttons auto-apply unconscious condition + remove from initiative.
- **Auto-save combat state** every round so a browser crash doesn't lose the fight.
- (Future) **Broadcast to players** — push GM narration to a companion player view.

---

## Cross-cutting priorities

### 🔴 P0 — bugs users will hit today
- Combat-tab spell slots not blue (still pink).
- Equipped weapons not flowing into the Attacks section.
- Live Session — no Back button, HP changes don't sync on refresh.

### 🟡 P1 — high-impact quality of life
- Rules 2014 / 2024 pill on campaign cards.
- Search + sort on character and campaign lists.
- Right-side GM dice panel toggleable.
- Sticky character-builder preview.
- Sidebar collapsed-state memory.

### 🟢 P2 — larger features
- Player Handouts (GM pushes text/images to a player).
- Session Recap Sharing (one-click shareable summary).
- Custom GM Templates (reusable NPCs / encounters).
- Personality prompts during character creation.
