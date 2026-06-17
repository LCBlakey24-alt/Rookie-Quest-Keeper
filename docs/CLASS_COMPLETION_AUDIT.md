# Class Completion Audit

This audit checks whether the classes marked `100%` have code-level support for the completion checklist, not just documentation labels.

## Audit result

The completed classes currently supported by concrete package exports are:

- Fighter
- Barbarian
- Rogue
- Monk
- Paladin
- Ranger
- Bard
- Cleric

Each completed class has helper coverage for character detection, progression summary, builder options, builder readiness, sheet summary, subclass options/summary support, final status, and package exports. The audit is enforced by `frontend/src/data/classCompletionAudit.test.js` so future dashboard changes must stay aligned with real code exports.

## Remaining classes

Druid remains the next class to complete, followed by Wizard, Warlock, and Sorcerer.

## Merge note

This document reflects the Cleric completion package and should be merged after the Cleric package/status PR.
