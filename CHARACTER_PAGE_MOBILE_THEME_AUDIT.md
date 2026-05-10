# Character Page Mobile + Black/Red/White Theme Audit (May 10, 2026)

## High-priority issues

1. **Mobile layout fix relies on broad `:has()` + inline-style substring selectors**
   - `characterSheetMobileFix.css` targets elements like `div[style*="width: 1100"]` and global wrappers via `.App:has(.character-sheet-header)`.
   - This is fragile: any formatting change in inline styles can silently break mobile behavior.
   - It also increases style recalculation cost and makes debugging difficult.
   - Suggested fix: replace selector-matching of inline styles with explicit utility classes/data attributes owned by the character page container.

2. **Excessive cascade forcing (`!important`) in the character page stack**
   - `professionalCharacterSheet.css` and `characterSheetMobileFix.css` together contain **100+ `!important` declarations**.
   - This makes future fixes expensive and can cause random regressions when component-level styles evolve.
   - Suggested fix: scope the character page under a single root class and progressively remove `!important` by increasing selector quality instead of force.

3. **Theme implementation is split across CSS and hardcoded inline values**
   - The character page still includes many inline style literals (hex colors and ad-hoc surfaces) in component JSX and adjacent tabs.
   - This undermines the black/red/white redesign because some UI pieces won’t track palette changes.
   - Suggested fix: move all core colors to shared CSS variables or `theme.js` tokens and use semantic names (`--color-bg`, `--color-accent`, `--color-text`).

## Medium-priority issues

4. **Global overflow constraints may clip overlays on touch devices**
   - Mobile fix sets `html`, `body`, `#root`, `.App` to `overflow-x: hidden !important` and also constrains multiple structural tags.
   - Risk: dialogs, toasts, or popovers near viewport edges can be clipped unexpectedly.
   - Suggested fix: limit overflow rules to a character-page wrapper only (not `html/body`), and verify modals/tooltips.

5. **Potential visual inconsistency in page ecosystem**
   - Other major pages still carry legacy/non-red palettes (example: combat area comments indicate a different theme system).
   - Users navigating between pages may see abrupt style shifts despite the redesign intent.
   - Suggested fix: centralize brand theme tokens and apply through shared variables at app/root level.

6. **Selector strategy couples styles to DOM shape**
   - Rules target descendant tags (`div`, `span`, `p`) and fixed child structures (`> div`, `div:last-child`).
   - Refactors in component markup can unintentionally break styling.
   - Suggested fix: convert brittle structural selectors to class-based hooks for key UI atoms.

## Quick wins (do now)

- Add a **single root class** to the character page (e.g., `.character-page-v2`) and re-scope all character-specific CSS under it.
- Replace inline-style substring selectors with explicit class hooks.
- Introduce a shared token set for black/red/white and remove duplicate hardcoded values.
- Add one smoke test pass for narrow widths (375px and 430px) to catch horizontal overflow regressions.

## Suggested order of execution

1. Root container class + scoping pass.
2. Tokenization of colors (black/red/white).
3. Remove brittle selectors and reduce `!important` usage.
4. Mobile QA sweep (tabs, vitals grid, action buttons, overlays).
