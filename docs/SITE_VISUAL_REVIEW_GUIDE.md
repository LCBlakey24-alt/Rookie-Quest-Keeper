# Site visual review guide

Use this guide when asking Codex or another coding agent to verify the sunset rebrand visually.

## What is already visible in source

- The global CSS palette in `frontend/src/App.css` now uses a sunset tabletop base: espresso backgrounds, warm brown panels, parchment text, gold/copper actions, and restrained square radii.
- The older standalone design guideline files have been updated to point at the sunset tabletop direction instead of the previous cyber/neon direction.

## What still needs review

Because many pages include component-level styles, the rebrand should be checked route by route instead of assuming the global tokens fixed everything.

Recommended first routes:

1. `/` or the signed-in home route.
2. `/characters/new`.
3. `/characters/new/full`.
4. `/characters/new/basic`.
5. `/characters/new/premade`.
6. `/characters/new/kids`.
7. `/characters/:characterId`.
8. Campaign dashboard and live-play routes.

For each route, check desktop around `1440px` wide and mobile around `390px` wide.

## How to give Codex visual access

Pick one of these approaches:

### Option A: Add screenshots to the task

Attach screenshots for the exact routes and screen widths you want reviewed. This is fastest for quick feedback.

Include:

- Route name.
- Screen width.
- Whether the user is logged in.
- What state is shown, such as loading, empty, populated, or error.

### Option B: Provide a temporary preview URL

Share a preview deployment URL that Codex can access without private credentials. If login is required, create a temporary test account with no real user data.

Do not share production admin credentials, real customer data, API secrets, database URLs, or long-lived tokens.

### Option C: Add a screenshot script

Add a Playwright script that starts the frontend, opens important routes, and writes screenshots to a ignored local folder such as `tmp/screenshots/`.

Suggested output names:

```text
tmp/screenshots/home-desktop.png
tmp/screenshots/home-mobile.png
tmp/screenshots-character-new-desktop.png
tmp/screenshots-character-new-mobile.png
```

Keep generated screenshots out of commits unless they are intentionally part of review documentation.

## Review checklist

- Backgrounds are espresso/charcoal, not blue, purple, white, or neon.
- Cards feel warm and tabletop-like, with subtle copper/gold borders.
- Primary actions are gold/copper and have clear hover/focus states.
- Destructive actions remain red and are not confused with primary CTAs.
- Text is cream/parchment and readable on dark surfaces.
- Empty, loading, and error states match the sunset shell.
- Mobile spacing remains usable and does not hide primary actions.
- No user-facing copy describes a path as best, default, or recommended.

## Suggested prompt for a future visual pass

```text
Please visually review the sunset rebrand using these screenshots or this preview URL. Check the listed routes at desktop and mobile widths. Identify anything still using old blue, purple, neon, or white styling, then make one small focused fix and commit it.
```
