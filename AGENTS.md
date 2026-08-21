# Agent working manual for Rookie Quest Keeper

This is the operating manual for coding agents working in this repository.

The goal is to make Rookie Quest Keeper launch-ready without breaking working table flows. Prefer small, safe, reviewable changes over broad rewrites.

## Product summary

Rookie Quest Keeper is a D&D-style character and campaign companion app.

Core user goals:

- Players create characters through one clear Create Character flow.
- Players can import an existing character separately.
- Players can open and use character sheets at the table.
- GMs can build a campaign library, prepare encounters, and run Live Play.
- The app should feel polished, compact, clear, and beginner-friendly.
- The visual direction is Rookie Quest charcoal/red/white, not the older blue/gold/purple/sunset skins.

## Product principles

- **Prep = build the campaign library. Live Play = use and update it.**
- A session is not a required campaign data structure.
- Multiple quests may be active at once.
- Rook suggests; the GM decides. Never silently mutate campaign canon from AI or note detection.
- Saved encounters are reusable templates. A live combat receives a one-off copy.
- Travelling-NPC state is temporary campaign state.
- Quest links suggest next actions; they do not force the table down one path.
- Avoid inventing campaign canon, creature statistics, or rules data that the user did not provide.

## Most important engineering rule

Do not make risky, broad, or clever changes unless specifically requested.

Prefer this pattern:

1. Make one small change.
2. Test/build it.
3. Open one focused PR.
4. Merge only after CI passes.
5. Move to the next small change.

If a requested behaviour change touches a very large file, prefer extracting/refactoring a small boundary first rather than rewriting the whole file.

## Repository safety rules

### Branching

Never commit directly to `main`.

Create a descriptive branch from current `main` for each focused change.

### Pull requests

Every PR should explain:

- What changed.
- Why it changed.
- What was intentionally not changed.
- Build/test result.
- Any manual checks still useful.

Use draft PRs for uncertain work. Do not recommend merging while required CI is red.

### CI

If CI fails:

1. Inspect the failing job/log.
2. Determine whether it is a product regression, stale test, or runner/dependency problem.
3. Fix only the cause.
4. Re-run the gate.

The normal frontend gate runs the full Jest suite and the production build. Character Audit and Homebrew Regression provide additional focused coverage.

### Accidental files

Do not create placeholder/probe files in the repository. Delete accidental files immediately.

## Styling direction

Use the current Rookie Quest direction:

- Charcoal backgrounds.
- Red accents.
- White text.
- Muted grey secondary text.
- Sharp/minimal cards.
- Compact information density without tiny touch targets.
- Responsive phone/tablet/desktop layouts.

Avoid reintroducing the old purple/pink/orange sunset, blue/gold, Twilight, Velvet, or similar legacy visual skins as global product themes.

Preferred feel:

- Clean.
- Professional.
- Slightly game-like.
- Practical during play.
- Easy to scan on a phone.

## Character creation: one product flow

Rookie has **one user-facing new-character creator**.

Do not reintroduce separate Basic, Kids, Premade, Matchmaker, or similar creator modes unless the product decision is explicitly changed later.

Canonical routes:

- `/characters/new` — create a new character using the current full builder.
- `/characters/import` — import an existing sheet/character; this remains a separate workflow.
- `/characters/:characterId` — open a saved character sheet.
- `/characters/:characterId/edit` — edit an existing character through the full builder system.

Legacy creator URLs may remain redirects to `/characters/new` for old bookmarks, cached PWAs, and historical links. New UI should link directly to `/characters/new`.

The intended user path is:

**My Characters → Create Character → Build → Review → Save → Character Sheet**

Make that one builder beginner-friendly through wording, progressive disclosure, Rook help, sensible defaults, and responsive layout instead of maintaining multiple creator products.

See `docs/CHARACTER_CREATION_ARCHITECTURE.md`.

## Character builder architecture

The current full builder/bridge is large and should be changed cautiously.

Important rules:

- Reuse existing helper modules instead of duplicating rules logic.
- Keep new-character and edit-character behaviour compatible.
- Do not casually change save endpoints or payload shapes.
- `PUT /api/characters/{id}` is a strict full update.
- `PATCH /api/characters/{id}` is a lenient partial update.
- Live sheet/builder partial saves should prefer PATCH.
- Full replacement edit flows can use PUT only when the payload is complete and expected by the backend.

Existing language helpers include:

```text
frontend/src/data/languageChoiceUtils.js
frontend/src/data/languageFullBuilderHelpers.js
frontend/src/components/builder/LanguageChoicePicker.js
```

## Campaign architecture

The campaign dashboard is the preparation/library surface. Live Play is the lightweight running surface.

Important behaviours to preserve:

- Quests persist independently from sessions.
- The GM may mark/focus a current quest without hiding access to other quests.
- NPC, location, encounter, map, handout, loot/reward links should stay reusable campaign records.
- Live Play should permit quick lookup and lightweight updates without requiring deep setup.
- Combat should preserve player-state updates safely and return to Live Play when launched from Live Play.
- Offline campaign packs must be account-scoped and must not cache auth/admin/Rook-AI responses as ordinary campaign data.

## Rook behaviour

Rook is the assistant plus deterministic rules/knowledge layer.

- Rook may suggest next steps, content, rulings, names, or drafts.
- Generated content should be draft-first: Generate Draft → Review/Edit → Save.
- Saving, not generation, makes content campaign canon.
- Never silently update quests, NPC travel state, campaign notes, or combat state merely because Rook detected something in text.
- Keep live-play answers short and table-ready.

## Tia-Karta import safety

The repository includes campaign-pack/import work used to establish known Tia-Karta/Balderin data.

Importers must be:

- repeatable/idempotent,
- fail-safe when duplicate-protection reads fail,
- conservative about GM-edited text/progress,
- explicit about what they add/repair,
- free from invented stats/canon.

Correct spelling for the city in current campaign data is **Balderin**.

## Mobile and installable-app direction

The web app is the shared product core.

Current direction:

- responsive web/PWA foundation first,
- offline campaign data and safe sync on top of that,
- native mobile/desktop wrappers later without splitting the campaign database into separate products.

Do not create separate mobile and desktop repositories merely to achieve different layouts. Prefer shared components/data with responsive or platform-specific presentation layers where necessary.

## Testing guidance

Add tests where they protect real behaviour.

High-value areas:

- campaign import idempotency/repair,
- offline cache boundaries,
- account deletion/local cleanup,
- character payload derivation,
- progression and class-choice helpers,
- route compatibility,
- Live Play → encounter → combat handoffs,
- small formatting/sanitisation helpers.

Avoid brittle UI assertions that contradict the actual supported product/rules data. If a test fails after a valid accessibility improvement, target the semantic element more precisely rather than weakening accessibility.

## PR size guide

A good routine PR usually has:

- 1–3 focused files,
- one visible or risk-reduction purpose,
- tests/build passing,
- no unrelated cleanup.

Larger PRs are acceptable for an explicitly coordinated recovery/consolidation effort, but should return to small PRs afterward.

## Copywriting guidance

Use plain, helpful language.

Good:

- `Create Character`
- `Open Sheet`
- `Import Character`
- `Start Encounter`
- `Add to Encounter`

Avoid:

- multiple competing creator-mode labels,
- `Best mode`, `Recommended mode`, or `Default path`,
- overly dramatic fantasy wording on utility screens,
- long instructional paragraphs where a short label or expandable help would work.

## Manual checks before merging UI work

At minimum:

- Page opens without console-breaking errors.
- Main action works.
- Back/navigation works.
- Empty/loading state makes sense.
- Mobile width is not obviously broken.
- Text remains readable on dark surfaces.
- Required CI passes.

For campaign/live changes, also check the relevant handoff before merging, such as Prep → Live, Live → Encounter, Encounter → Combat, or Combat → Live.

## Work that needs extra caution

Plan these carefully rather than treating them as quick cleanup:

- broad full-builder rewrites,
- auth model changes,
- account deletion backend changes,
- campaign permission changes,
- payment/subscription functionality,
- large cross-app visual redesigns,
- database schema migrations,
- offline conflict-resolution changes.

## Current tracking context

Historical issues may describe older multi-mode character creation plans. Current product decisions in this file and `docs/CHARACTER_CREATION_ARCHITECTURE.md` take precedence over those obsolete creator-mode descriptions unless the user explicitly changes direction again.

## Final guidance

Make Rookie more ready, not more complicated.

Every change should answer at least one of these:

- Does this make the app clearer for a real player or GM?
- Does this reduce a launch or campaign-data risk?
- Does this make table use faster?
- Does this make future safe editing easier?
- Does this remove confusing or obsolete behaviour?

If not, do not do it yet.
