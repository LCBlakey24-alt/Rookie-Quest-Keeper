# Repo Cleanup Audit

## Purpose

This file tracks repo-cleanup decisions so future AI assistants and developers do not accidentally revive abandoned generated files.

## 2026-05-14 cleanup pass

A scan found several React component files sitting at the repository root instead of inside the active frontend app structure under `frontend/src`.

These root-level files appeared to be abandoned/generated prototype files rather than active app code:

- `AdminPage.js`
- `QuickSwitcher.js`
- `DesktopSidebar.js`
- `DesktopStatHeader.js`
- `DesktopCharacterLayout.js`
- `OverviewTabDashboard.js`
- `CombatTabRefactored.js`
- `CenteredDiceResultOverlay.js`

Reasons they were treated as cleanup candidates:

- They were outside `frontend/src`, which is where the React app is built from.
- Several contained dummy data or placeholder comments.
- Some referenced each other using root-level relative imports.
- Active app routes use components under `frontend/src/components`, not these root files.
- Keeping duplicate component names at root can mislead future AI/code edits.

If any future work needs one of these old ideas, recover it from Git history rather than recreating root-level component files.

## Cleanup rule going forward

New React source files should live inside `frontend/src`, usually one of:

- `frontend/src/components`
- `frontend/src/components/gm`
- `frontend/src/components/tabs`
- `frontend/src/components/clean-sheet`
- `frontend/src/components/builder`
- `frontend/src/lib`
- `frontend/src/hooks`

Do not place app component files at repository root.
