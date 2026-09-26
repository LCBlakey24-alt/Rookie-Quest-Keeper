# Site visual review guide

Use this guide to verify the current professional Keeper interface. Retired red, neon-pink, sunset/twilight, velvet and glow-heavy variants are not valid visual references.

## Visual baseline

- Background: deep navy `#071522`.
- Deep navigation: `#050E18`.
- Panels: `#0C2234`.
- Raised cards: `#112A40`.
- Primary action/accent: antique gold `#D6A84F`.
- Supporting UI/focus: blue `#79BCE8`.
- Main text: warm cream `#F7F1E7`, with explicit secondary and muted tiers.
- Danger red is reserved for destructive/error states.
- No neon pink, decorative gradients, fantasy glows, parchment, coffee, velvet or sunset borders.
- Page geometry belongs to the page/device layout, not to the global theme.

## Required device lanes

Review all important routes in these lanes. Tablet portrait and landscape are deliberately separate because they have different usable workspace widths.

| Lane | Reference size | What to verify |
| --- | --- | --- |
| Mobile portrait | `390 × 844` | Single-task flow, large tap targets, no horizontal scroll, bottom/compact navigation, no desktop floating windows off-screen. |
| Tablet portrait | `768 × 1024` | Compact navigation, mostly single-column content, no wide desktop rail stealing the workspace. |
| Tablet landscape | `1024 × 768` | 1–2 columns only when the actual content area fits them; touch controls remain comfortable. |
| Desktop | `1440 × 900` | Permanent navigation, deliberate multi-panel workspace, no content hidden outside the viewport. |

## Route coverage

Review production routes first:

1. `/`
2. `/auth`
3. `/home`
4. `/characters`
5. `/characters/new`
6. `/characters/import`
7. `/characters/:characterId`
8. `/characters/:characterId/edit`
9. `/campaigns`
10. `/campaign/:campaignId`
11. `/gm-screen/:campaignId`
12. `/gm-second-screen/:campaignId`
13. `/player-display/:campaignId`
14. `/mobile/:campaignId`
15. `/combat/:campaignId`
16. `/homebrew`
17. `/uploads`
18. `/admin`
19. `/account`

Prototype routes were retired and should not be reviewed or reintroduced.

## Review checklist

- No retired red/neon-pink theme colours or decorative gradients are visible.
- No card, panel, modal or floating tool extends outside its usable workspace.
- Desktop does not inherit mobile/tablet geometry and vice versa.
- Tablet portrait does not receive a desktop-width sidebar.
- Text does not shrink below comfortable reading/touch sizes to make a layout fit.
- Inputs are at least 16px on phone where browser zoom behaviour matters.
- Controls have practical touch targets on mobile/tablet.
- Empty/loading/error states use the same navy system.
- A failed refresh visibly reports stale/unavailable data instead of showing a believable empty state.
- The dice roller uses the compact flat result experience; there is no cinematic 3D renderer.
- Primary actions use antique gold; destructive actions use semantic danger red; warning amber and info blue keep their own meaning.

## Screenshots

The checked-in Playwright screenshot tooling can be used where appropriate:

```bash
cd tests
npm install
npm run install:browsers
npm run screenshots:site
```

To target a deployment:

```bash
ROOK_SCREENSHOT_BASE_URL=https://your-preview-url.example npm run screenshots:site
```

To focus routes:

```bash
ROOK_SCREENSHOT_ROUTES=/auth,/home,/characters,/campaigns npm run screenshots:site
```

Do not commit generated screenshots unless they are intentionally part of review documentation.
