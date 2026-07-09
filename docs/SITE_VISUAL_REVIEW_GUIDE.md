# Site visual review guide

Use this guide when asking Codex or another coding agent to verify the sunset-gradient rebrand visually.

## What is already visible in source

- The intended global UI direction is now a very dark blue-purple base with deep indigo panels, white readable text, subtle pale borders, and purple-pink-orange sunset-gradient actions.
- The active design guideline files should point at the sunset-gradient direction rather than coffee, velvet, espresso, leather, parchment, brown-tabletop, or rustic wording.
- The signed-in rail is the main selected/unselected pattern: quiet unselected links, sunset-gradient selected icon fill, a thin selected marker, and a short gradient label underline when labels are visible.
- The first cleanup pass has converted the main theme bridges and high-specificity app-page polish files. Visual QA should now focus on screenshots rather than more blind CSS rewriting.

## What still needs review

Because many pages include component-level styles, the rebrand should be checked route by route instead of assuming the global tokens fixed everything.

Recommended first routes:

1. `/auth`.
2. `/home`.
3. `/characters`.
4. `/characters/create/full`.
5. `/characters/:characterId`.
6. `/campaigns`.
7. `/campaign/:campaignId`.
8. `/gm-screen/:campaignId`.
9. `/homebrew`.
10. `/uploads`.
11. `/admin`.

For each route, check mobile around `390px`, tablet around `768px`, and desktop around `1440px` wide.

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

### Option C: Run the checked-in screenshot script

Use the Playwright script in the `tests/` workspace to start the frontend, open the important routes, and write desktop/mobile screenshots to `tests/test-results/site-screenshots/`.

```bash
cd tests
npm install
npm run install:browsers
npm run screenshots:site
```

To capture a preview deployment instead of starting the local frontend, pass a base URL:

```bash
cd tests
ROOK_SCREENSHOT_BASE_URL=https://your-preview-url.example npm run screenshots:site
```

To limit routes during a focused review, pass a comma-separated route list:

```bash
cd tests
ROOK_SCREENSHOT_ROUTES=/auth,/home,/characters,/campaigns npm run screenshots:site
```

Generated screenshots are ignored by git. Do not commit them unless they are intentionally part of review documentation.

## Review checklist

- Backgrounds are very dark blue-purple, not brown, white, parchment, or coffee-styled.
- Cards use deep indigo/purple surfaces with subtle pale or sunset borders.
- Primary actions use the sunset gradient and have clear hover/focus states.
- Unselected rail and tabs stay quiet; selected rail and tabs use the gradient marker/fill language.
- Destructive actions remain red and are not confused with primary CTAs.
- Text is white or soft-white and readable on dark surfaces.
- Empty, loading, and error states match the dark sunset shell.
- Mobile spacing remains usable and does not hide primary actions.
- No user-facing copy describes a path as best, default, or recommended.

## Suggested prompt for a future visual pass

```text
Please visually review the sunset-gradient rebrand using these screenshots or this preview URL. Check the listed routes at mobile, tablet, and desktop widths. Identify anything still using coffee, velvet, espresso, leather, parchment, brown-tabletop, white-page, or one-off styling, then make one small focused fix and commit it.
```
