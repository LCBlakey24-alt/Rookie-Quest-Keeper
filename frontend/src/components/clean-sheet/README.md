# Clean Character Sheet split

This folder contains smaller pieces extracted from `CleanCharacterSheet.js`.

Current split:

- `cleanSheetUtils.js` — sheet constants, math helpers, roll helpers, and formatting helpers.
- `CleanSheetCommon.js` — tiny shared UI pieces used by the sheet.
- `CleanSheetHeader.js` — character identity/header actions.
- `CleanSheetVitals.js` — HP, temp HP, AC, initiative, proficiency, and speed cards.
- `CleanSheetTableFocus.js` — at-the-table shortcut buttons.
- `CleanSheetPlayTools.js` — roll mode, rests, passives, hit dice, concentration, conditions, death saves, and roll history.
- `CleanSheetTabs.js` — sheet tab navigation.
- `CleanSheetOverviewTab.js` — overview tab panels for abilities, saves, skills, class features, and proficiencies.

Keep future edits focused: change the smallest component that owns the UI or logic you are touching, and avoid pushing unrelated sheet behaviour back into `CleanCharacterSheet.js`.
