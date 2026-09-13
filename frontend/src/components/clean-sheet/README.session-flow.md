# Player session regression scope

This branch hardens two core table-use paths in the clean character sheet:

- A saved character at exactly 0 HP must remain at 0 HP so death saves and unconscious-state UI can activate correctly.
- The sheet d20 roller must honour normal / advantage / disadvantage mode and apply the manual roll bonus on top of the normal modifier.

The focused Jest coverage for these paths lives in `cleanSheetUtils.test.js` and `cleanSheetSessionFlow.test.js` and is included in the character-polish GitHub Actions job.
