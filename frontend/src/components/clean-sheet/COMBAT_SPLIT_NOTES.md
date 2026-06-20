# Clean Combat Tab split

This folder now keeps the player combat tab split into smaller editing targets.

Current combat-tab split:

- `CleanCombatTab.js` — state, resource updates, roll wiring, and tab layout.
- `cleanCombatTabUtils.js` — dice helpers, fighter helpers, weapon/consumable detection, equipped weapon profiles, and potion healing rules.
- `CleanCombatTabCards.js` — reusable combat action cards, simple action cards, action sections, and fighter focus panel.

Keep future combat-tab edits focused: change helpers when the rule/math changes, card components when the UI changes, and `CleanCombatTab.js` only when the wiring or state flow changes.
