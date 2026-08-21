# Character Creation Architecture

## Product decision

Rookie Quest Keeper has **one new-character creation flow**.

The user-facing action is simply **Create Character**.

Do not reintroduce separate Basic, Kids, Premade, Matchmaker, or other creation modes as parallel routes unless the product decision is explicitly changed later.

## Canonical routes

- `/characters/new` — create a new character with the full current builder.
- `/characters/import` — import an existing character/sheet. This is intentionally separate because it is an import workflow, not another creator mode.
- `/characters/:characterId` — open a saved character sheet.
- `/characters/:characterId/edit` — edit an existing character through the same full builder system.

## Legacy-route compatibility

Old creator URLs may remain as redirects to `/characters/new` so bookmarks, cached PWAs, and older in-app links do not break.

Examples include:

- `/characters/create`
- `/characters/create/full`
- `/characters/create/basic`
- `/characters/create/premade`
- `/characters/create/kids`
- `/characters/create/rook`
- `/characters/new/full`
- `/characters/new/basic`
- `/characters/new/premade`
- `/characters/new/kids`
- `/characters/new/matchmaker`

These are compatibility aliases only. New UI must not link to them.

## UX rule

A player who wants a new character should not first be asked which type of creator they want.

The expected path is:

**My Characters → Create Character → Build → Review → Save → Character Sheet**

Keep the builder itself beginner-friendly through clear wording, progressive disclosure, Rook help, sensible defaults, and responsive design rather than maintaining multiple separate creator products.

## Code cleanup

Some old mode-specific component files may remain temporarily as dormant code while the launch-readiness work is stabilised. They are not part of the active product surface and can be removed in small, tested cleanup PRs.

When touching character creation, prefer improving the canonical builder instead of wiring those dormant components back into routing.
