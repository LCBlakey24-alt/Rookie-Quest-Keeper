# Responsive Sunset Layout Plan

This is the working layout contract for Rookie Quest Keeper as the app changes across other chats and branches. Every page review should compare the current code against this file, `design_guidelines.md`, `docs/UI_DESIGN_SYSTEM.md`, and the active CSS stack before changing layout.

## Shared theme lock

All app pages should stay inside the Rookie Quest sunset-gradient identity:

- Very dark blue-purple page backgrounds.
- Deep indigo/purple panels and cards.
- White or soft-lilac readable text on dark surfaces.
- Sunset-gradient primary actions, active states, icon fills, and selected navigation.
- Orange/pink/purple glow used lightly for hover, focus, and emphasis.
- Green only for success, ready, imported, saved, or safe creation.
- Red only for destructive actions and real errors.
- No coffee, velvet, espresso, leather, brown-tabletop, parchment, or candlelit theme language in new UI work.

The page can feel different through layout, copy, density, icons, and information hierarchy. It should not feel different by becoming a separate colour theme.

## Breakpoints

Use these three layout plans when reviewing or building pages.

| Device plan | Width guide | Main layout rule |
| --- | ---: | --- |
| Mobile | up to `719px` | One-column, thumb-friendly, low-density, no trapped scroll. |
| Tablet | `720px` to `1179px` | Labelled app rail, two-column cards where useful, stacked tools when dense. |
| Desktop | `1180px+` | Full workspace with clear nav, 2–3 column content, max-width controlled. |

These match the current app shell direction: compact/icon navigation on smaller mobile widths, labelled rail from tablet upwards, and wider desktop workspace after `1180px`.

## Rail and selected-state pattern

The rail is the main visual rule for the whole signed-in app.

- Unselected items stay flat, dark, and quiet: transparent or deep panel background, white text/icons, no heavy glow.
- Hover/focus uses a subtle pale/sunset border and a small movement only.
- Selected items use the sunset-gradient icon fill, a thin sunset marker line, and a short gradient underline on the label where labels are visible.
- Mobile keeps the rail compact and icon-led.
- Tablet and desktop show labels, but labels should not feel sticky, bulky, or boxed-in.
- Other tab sets should follow the same selected/unselected language where practical.

## Current cleanup progress in this PR

The first pass of this PR sets the shared direction and converts the main high-risk theme bridges:

- `frontend/src/styles/responsiveSunsetLayouts.css`: final token lock, responsive helpers, older-class guardrails, and auth guardrails.
- `frontend/src/styles/appShellRail.css`: app rail selected/unselected behaviour.
- `frontend/src/styles/siteVelvetTheme.css`: legacy import path retained, contents moved to sunset-gradient tokens.
- `frontend/src/styles/blueEclipseTheme.css`: legacy import path retained, contents moved away from gold/cream block styling.
- `frontend/src/styles/gmBlueEclipseTheme.css`: GM dashboard, sidebar, active workspace, assets, and live play moved to the shared rail language.
- `frontend/src/styles/twilightKeeperTheme.css`: high-specificity `#root` theme rules moved away from brown/espresso styling.
- `frontend/src/styles/twilightKeeperPolish.css`: selected icons, chips, loading details, and box language flattened.
- `frontend/src/styles/twilightKeeperScreens.css`: loading, public/auth shell, character mode, creator steps, and sheet screen polish flattened.
- `frontend/src/styles/twilightKeeperAppPages.css`: logged-in dashboards, libraries, uploads, homebrew, admin, modals, and feedback flattened.
- `frontend/src/components/AuthPage.css`: auth route directly converted so it does not rely only on late overrides.
- `frontend/src/App.js`: preserved the current lazy-route/Rook assistant structure and imports `responsiveSunsetLayouts.css` after the existing polish stack.

Continue future cleanup by replacing route CSS directly where possible, then using late guardrails only as protection for hard-to-reach legacy classes.

## Mobile plan

Mobile should feel like a quick character/campaign companion, not a squeezed desktop app.

- Keep content in one vertical column.
- Use compact hero sections: title, short helper line, then action buttons.
- Put the most common action near the top and repeat it near the bottom only on long flows.
- Use cards as clean sections, not tiny multi-column dashboards.
- Let pages scroll vertically. Avoid `height: 100vh` plus `overflow: hidden` unless the inner panel has its own scroll.
- Touch targets should stay at least `44px` high.
- Horizontal tables, stat blocks, and tab rows need either wrapping or an `overflow-x: auto` wrapper.
- Hide non-critical supporting copy before shrinking core controls.

Mobile page order should usually be:

1. Page identity / hero.
2. Primary action.
3. Current state or next-step summary.
4. Main cards/tools.
5. Secondary/helpful actions.

## Tablet plan

Tablet should be the bridge between phone and desktop. It can show more structure, but it should not become crowded.

- Keep the labelled rail visible.
- Use two-column grids for cards and summary panels.
- Keep forms mostly one column unless fields are short and clearly paired.
- Place preview panels below editors for complex creators, unless there is enough horizontal space.
- Let tab groups wrap instead of shrinking labels into unreadable text.
- Use sticky or near-top actions only when the page is long.
- Avoid three-column layouts unless each card remains readable without wrapping every line.

Tablet page order should usually be:

1. Hero with action cluster.
2. Two-column summary/action cards.
3. Main workspace.
4. Preview, activity, or helper panel.

## Desktop plan

Desktop should feel like the professional command centre.

- Use the full labelled rail and a centred/max-width workspace.
- Player pages should stay flatter: compact hero, top tabs, low-friction cards.
- GM pages can use sidebar + workspace layouts.
- Dashboards can use 2–3 columns, but avoid tiny card spam.
- Put persistent context panels on the right only when they genuinely help.
- Long tools should scroll the page or the tool body, not trap the whole viewport.
- Keep visual weight focused on the current task, not decorative chrome.

Desktop page order should usually be:

1. Hero / page command bar.
2. Primary workspace.
3. Supporting side panel or secondary cards.
4. Activity/history/reference content.

## Page-specific layout expectations

| Route area | Mobile | Tablet | Desktop |
| --- | --- | --- | --- |
| `/auth` | Single-column form first, benefits below. | Form and benefits stacked or balanced if roomy. | Hero + auth card split layout with clear focus. |
| `/home` dashboard | Single-column hub with next actions first. | Two-column hub cards. | Professional hub with hero, quick actions, and tidy grouped cards. |
| `/characters` | Search/actions first, character cards stacked. | Two-column library cards. | Compact library grid with filters/actions visible. |
| `/characters/create/full` | Step-by-step single column, preview below. | Stepper + form, preview below or side only if roomy. | Builder workspace with navigation, editor, and preview balanced. |
| `/characters/:id` | Play-first sheet, tabs/cards stacked, fast dice actions. | Wider tab/card layout with important stats visible. | Full sheet workspace with compact top rail and dense but readable panels. |
| `/campaigns` | Campaign cards stacked with create/join obvious. | Two-column cards. | Campaign library with grouped cards and clear GM/player status. |
| `/campaign/:id` | GM tools stacked by priority. | Tool cards grouped into two columns. | Sidebar + content workspace for GM flow. |
| `/homebrew` | Creation/import actions first, library stacked. | Two-column creation/library cards. | Workshop-style layout with creation, library, and review panels. |
| `/uploads` | Dropzone/action first, helper cards below. | Dropzone plus two-column helper cards. | Full upload workspace with next steps visible. |
| `/admin` | Critical controls only, stacked. | Grouped admin panels. | Dense but cautious admin dashboard. |

## Review loop for constant code changes

Before every design pass:

1. Re-read `frontend/src/App.js` to confirm active routes and CSS import order.
2. Re-read the touched component and its directly imported styles.
3. Search for legacy theme clues: `coffee`, `velvet`, `espresso`, `leather`, `parchment`, `brown`, `tabletop`, `candlelit`, old one-off colour themes, and hard-coded colours that ignore `--rq-sunset-gradient`.
4. Check the page at mobile, tablet, and desktop assumptions using the layout plans above.
5. Make the smallest safe change that improves theme consistency or layout clarity.
6. Record anything risky or unfinished in the final note rather than hiding it.

## Acceptance checklist

A reviewed page is acceptable when:

- It uses the dark blue-purple sunset-gradient palette.
- It has a deliberate mobile, tablet, and desktop layout.
- It has no unreadable text on dark surfaces.
- It has no accidental coffee, velvet, espresso, brown-tabletop, or parchment styling.
- It can scroll on mobile and tablet.
- It keeps key actions obvious without flooding the page.
- It uses cards, rails, tabs, and buttons consistently with the shared selected/unselected rail language.
- It does not introduce a new one-off visual language.
