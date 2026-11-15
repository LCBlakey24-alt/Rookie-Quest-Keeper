# Rookie Quest Keeper — character-sheet V7 handoff

**Archived:** 15 November 2026. **Status:** reviewed, editable A4 prototype; **NOT** wired into live Keeper. All files in this directory are actual checked-in GitHub files, including PDF binaries. Do not treat them as existing production UI or as automatic rules calculators.

## Direct files

- [2024 colour PDF](./artifacts/RQK_Character_Sheet_V7_2024_Colour_Editable.pdf)
- [2024 black-and-white PDF](./artifacts/RQK_Character_Sheet_V7_2024_BW_Editable.pdf)
- [2014 colour PDF](./artifacts/RQK_Character_Sheet_V7_2014_Colour_Editable.pdf)
- [2014 black-and-white PDF](./artifacts/RQK_Character_Sheet_V7_2014_BW_Editable.pdf)
- [2024 filled sample](./examples/RQK_Character_Sheet_V7_2024_Colour_Filled_Example.pdf)
- [All-page preview](./previews/RQK_Character_Sheet_V7_2024_All_Pages.jpg), [page 1](./previews/RQK_Character_Sheet_V7_2024_Page_1.png), [page 2](./previews/RQK_Character_Sheet_V7_2024_Page_2.png)
- [Exact supplied full-colour logo](./assets/RQK_Official_Logo_Print_Optimized.png) and [greyscale logo](./assets/RQK_Official_Logo_Mono_Print_Optimized.png)
- [2014 field map](./field-maps/RQK_Character_Sheet_V7_2014_Field_Map.json), [2024 field map](./field-maps/RQK_Character_Sheet_V7_2024_Field_Map.json)
- [V7 page authoring source](./source/build_rqk_fillable_v7.py), dependencies [V6 generator](./source/build_rqk_fillable_v6.py) and [V3 drawing helpers](./source/build_rqk_sheet_v3.py), [QA script](./source/test_rqk_v7.py)
- [Detailed rules and real-play audit](./PLAYTABLE_AUDIT.md), [QA results](./qa/RQK_V7_QA_Results.json), [text overlap audit](./qa/RQK_V7_Layout_Text_Overlap_Audit.json)

The original authoring scripts have local absolute paths under `/mnt/data` and reference local fonts. They are preserved as **historical design/reproduction sources**, not drop-in production builders. Codex should adapt them to repo-relative inputs and approved license-compatible libraries if used; do not commit or redistribute separate font files.

## Verified template contract

- **Four variant PDFs:** D&D 5e **2014 / 2024** × **colour / greyscale**, all **8 A4 pages** and **504 uniquely named editable AcroForm widgets**.
- Widgets by page for both editions: **P1 138** (83 text + 55 checkboxes), **P2 82**, **P3 73**, **P4 99**, **P5 80**, **P6 24**, **P7 8**, **P8 0** (static rules reference).
- **Page 1** = identity, stats and saves, all skills, AC, initiative, **base** Speed, proficiency, inspiration, passive Perception/Insight, HP and Hit Dice remaining, death saves, six exhaustion hexes, active conditions, 5 quick attacks, active concentration/resistance hints. It must work as a quick play page.
- **Page 2** = 6 Actions, 4 Bonus Actions, 4 Reactions, edition-appropriate common action list, 3 quick resource rows. No tiny actions/bonus/reaction panel remains on Page 1.
- **Page 3** = 10 expanded attack rows, 6 longer resource rows, resistances/immunities/vulnerabilities, special senses, passive Investigation, multiclass Hit Dice by type, defensive effects and notes.
- **Page 4** = spellcasting, normal spell slots 1–9, 24 spell rows, distinct Pact Magic.
- **Page 5** = inventory (17 rows), attunement, currency and treasure.
- **Page 6** = features/feats, appearance/portrait reference, traits/backstory.
- **Page 7** = journal/quests/session notes.
- **Page 8** = **edition-specific exhaustion and conditions reference** with SRD 5.1/5.2.1 CC-BY-4.0 attribution.

The audit found no printed label ↔ form-field or field ↔ field collisions in the tested outputs, and filled text + hex checkboxes persisted after save/reopen. Cross-device physical printing, accessibility, full rules-engine derived exports and long-content expansion are **not yet proven**. The PDFs **do not recalculate modifiers** when a reader changes a typed ability score.

## Critical difference from existing code

Draft [PR #911](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/pull/911) still assumes the previous **V6 7-page / 422-field** schema and will reject these files. Do **not** merge it as-is. Refactor its core/extended mappers and form writer using the two checked-in V7 field maps. The actual V7 writer must verify **8 pages, 504 fields and V7 metadata**. New fields include:

```
actions.action.*; actions.bonus.*; actions.reaction.*; actions.resources.*
combat.concentration_summary; combat.defences_summary
combat.hit_dice.breakdown; combat.passive_investigation
```

Also review changed/moved V6 fields rather than only appending names. Use authoritative rule calculations already used by Keeper, not a parallel rules engine. Ensure **2014 vs 2024 differences**, spellbook/known/prepared/always-prepared distinctions, Pact Magic, multiclass Hit Dice, condition effects, equipment/weapon stats and at-rest recovery are respected. Never silently discard overflow: repeat the appropriate continuation sheet(s). No cross-account, GM-only or secret data in player exports.

## Integration and legal guardrails

1. Authenticate and authorise character access **server-side** before returning data; a client-supplied character ID is not proof of ownership. No character state mutation during export.
2. Offer a **blank** template without needing a character, and a **current character filled export** scoped to the account; colour/greyscale and 2014/2024 selection, plus editable vs explicitly flattened print option.
3. Prefer an appropriately licensed, tested client-side PDF library such as **MIT-licensed pdf-lib**. Authoring QA scripts use **PyMuPDF (AGPL/commercial dual licence)**; do not embed it in proprietary production code without legal review.
4. Provide a licensed, embedded Unicode-compatible appearance font for names outside WinAnsi. Do not distribute standalone font files. Player-owned portrait optional, permission-checked.
5. Use repeatable spell, equipment, action and feature pages for overflow. Long content must not be cut off or silently omitted.
6. Confirm **actual PDF bytes** work in a browser, Android/iPad PDF editors and print at 100% A4; US Letter can be a later explicit task.
7. Enforce the repo's usual Build, Character Audit, Homebrew Regression, browser smoke and account isolation checks. Keep PR #911 draft until all gates pass.
8. Keep current design tokens and exact supplied logo; avoid brand drift or replacing V7 with the earlier mockup image.
9. Complete publication/licensing/attribution and PDF accessibility review before selling or publishing the sheet broadly.

## Product context

Primary implementation tracker: [#906](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/906). Related [PDF integration handoff](../../docs/CHARACTER_PDF_EXPORT_HANDOFF.md), [master staged roadmap](../../docs/ROOKIE_QUEST_PRODUCT_ROADMAP.md), [spell presets #907](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/907), [level-up wheel #908](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/908), [membership vision #909](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/909), [creator collaboration #910](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/910). Future ideas do not authorise automatic implementation or billing.
