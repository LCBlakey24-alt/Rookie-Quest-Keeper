# Character PDF export — developer handoff

**Status (15 Nov 2026):** Prototype PDFs produced outside the website. **No live character-to-PDF export has been deployed.** Implementation tracked by [#906](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/906). This document records design/engineering intent, not a fully approved live schema.

## Prototype structure

- **D&D 2014 and 2024** separated by edition; seven A4 pages, colour and print-friendly black-and-white.
- Each PDF has **422 AcroForm fields** (text and checkbox widgets, not images placed over blank boxes).
- Six pages: (1) essential play sheet, (2) extra combat/resources, (3) spellcasting/spells, (4) equipment/inventory, (5) traits/character story, (6) adventure journal. (7) edition-specific exhaustion and conditions reference.
- Page 1 is sufficient for routine play without page turning for ability bonuses, saves, skills, HP, Hit Dice, death saves, exhaustion, conditions, attacks to-hit/damage/range and action summaries.
- PDF fields can be populated externally and then saved as still-editable PDFs. A flattened copy should be a **separate print-only option**, not the only export.

## Named-field families (proposed contract)

| Field family | Examples | Notes |
|---|---|---|
| `identity.*` | `identity.name`, `identity.class`, `identity.level`, `identity.player`, `identity.species` | Scoped to authorised character |
| `abilities.<abbr>.*` | `abilities.dex.score`, `abilities.dex.modifier`, `abilities.dex.save_bonus`, `abilities.dex.save_proficient` | STR DEX CON INT WIS CHA |
| `skills.<key>.*` | `skills.perception.bonus`, `skills.perception.proficient`, `skills.perception.expertise` | Store actual final modifier incl. expertise/other bonuses |
| `combat.*` | `combat.ac`, `combat.current_hp`, `combat.hit_dice.remaining`, `combat.spell_attack_bonus` | Edition- and feature-aware calculations |
| `combat.death_saves.*` | `combat.death_saves.success.1` | Independent yes/off checkboxes |
| `combat.exhaustion.level.*` | `combat.exhaustion.level.1` through `.6` | Fill 1..N cumulatively; do not treat as six independent conditions |
| `attacks.<n>.*` | `attacks.1.name`, `attacks.1.attack_bonus`, `attacks.1.damage`, `attacks.1.range` | Five quick rows on page 1; range added in V5 |
| `combat.details.attacks.<n>.*` | attack details, type, properties | Page 2 expanded list |
| `resources.<n>.*` | name/current/maximum/recharge | Avoid generic rest counter on page 1 |
| `magic.*` | `magic.save_dc`, `magic.slots.1.total`, `magic.spells.1.name`, `magic.pact.remaining` | Pact Magic separate; don't confuse spell slots with spell preparation |
| `inventory.*` and `currency.*` | `inventory.items.1.name`, `currency.gp` | Extra pages needed for long inventories |
| `features.*`, `story.*`, `journal.*` | `features.1.effect`, `journal.notes.1` | Long text must overflow to continuation pages |

Actual field maps were generated alongside each prototype; copy an **approved, versioned schema file** into the implementation repo before coding. These names are **not yet guaranteed** to be permanent. Binary PDFs and local JSON field maps have not been added to GitHub in this issue.

## Functional requirements for website integration

1. User selects **blank** or **from my character**, rules edition (from character record for filled), colour or BW, A4 or US Letter when supported, editable vs flat printing.
2. Read **only authorised character data** for the signed-in user/campaign context. Never look up another account's character by accepting an arbitrary ID without an ownership check. Default new users to empty libraries.
3. Normalize the canonical character model and class/edition data once, server-side, including ability modifiers, derived skill/save bonuses, attack calculations, spell save DC and bonuses, condition/exhaustion, class and Pact Magic resources.
4. Place values by named fields into the PDF; select the matching checkboxes' actual `on_state`, rather than drawing a decorative tick that isn't part of the form.
5. If any value does not fit a field, **do not shrink to unreadable text or silently truncate**. Add continuation page(s) with repeating headings and clear references. Check worst-case level 20 characters, multiclass Hit Dice types, many attacks/spells, rich features and long names.
6. Escape arbitrary character names and user text safely; prefer PDF-standard fonts/embedded font subsets and permitted images. Treat input descriptions as untrusted text.
7. Create an editable PDF for tablet filling, with a separate flat snapshot if requested. The PDF's values are independent of the live account after export; do **not** silently sync edits back into Keeper without an explicit, reviewed import feature.
8. Include edition-aware rules/glossary summaries; do not rely on a generic one-size-fits-all rule sheet.
9. Offer simple preview and download, clear file names, printer margins, optional extra spell/inventory/notes pages and accessible headings/tab order where achievable.

## Verification checklist

- [ ] All editions and monochrome/colour variants open, can be filled, saved and reopened in **at least two PDF viewers** where available.
- [ ] All sample values and tick boxes remain visible when printed; text never collides or is clipped.
- [ ] Print at 100% A4; UK home-printer safe margins and US Letter separately tested.
- [ ] Page 1 covers routine gameplay; long data flows onto extra pages.
- [ ] Rules calculations checked with 2014/2024 source data and multiple classes/multiclass.
- [ ] Account-ownership and GM-secret exclusion tests; data export audit.
- [ ] Website data changes and PDF template upgrades versioned; older exports remain readable.
- [ ] CC-BY source attribution and commercial redistribution review before public launch.

## Licensing caution

Official 5e SRD 5.1 and 5.2.1 are licensable under CC-BY-4.0 with attribution, but **D&D Beyond Basic Rules text itself is not a general publishing licence**. Write original reference summaries from correctly licensed SRD content, include required attribution and confirm image/font rights. See https://www.dndbeyond.com/srd and https://www.dndbeyond.com/creator-faq.

## Related

- Printable character sheets [#906](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/906)
- Spell loadouts [#907](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/907)
- Level-up progression wheel [#908](https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/issues/908)
- Staged roadmap [ROOKIE_QUEST_PRODUCT_ROADMAP.md](./ROOKIE_QUEST_PRODUCT_ROADMAP.md)
