# Rookie Quest Keeper — Character Sheet V7
## Rules, mathematics, layout and play-table QA (15 November 2026)

**Scope:** Eight-page A4 editable PDF; separate 2014 and 2024 5e editions; colour and genuinely grayscale, ink-friendly designs. This report audits the actual V7 PDFs, not the earlier image mockups.

**Result:** Suitable as a functional blank printable/editable *prototype* for normal play. No PDF widget collisions or label/widget intersections were found, and example values survive saving/reopening. It is **not** yet a fully automatic character calculator, live Keeper export or unlimited-content PDF system.

### Page-by-page layout and field coverage

| Page | Use | Finding |
| --- | --- | --- |
| 1 | Character/play: identity, six ability scores/modifiers/saves, skills, proficiencies, AC, initiative, **base** Speed, inspiration, passive Perception and Insight, spell DC/attack, HP/Hit Dice/death saves, exhaustion/conditions, 5 attacks, concentration and defence notes | Core turn-to-turn information fits without a separate Actions panel; save-proficiency hexes are adjacent to the saving throw row |
| 2 | Custom Actions (6), Bonus Actions (4), Reactions (4), resource uses (3) and edition-correct common action names | Reaction triggers have wider, multiline fields; action cost/uses is one flexible field rather than two narrow boxes |
| 3 | 10 expanded attacks, 6 class resource trackers, resistances/immunities/vulnerabilities, senses, passive Investigation, mixed Hit Dice breakdown and situational modifiers | Retains advanced information that would otherwise have been lost when moving actions to page 2 |
| 4 | Spellcasting ability, attack bonus, save DC, slots level 1–9, 24 known/prepared spell entries, concentration and Pact Magic | Pact slots distinct from regular spell slots; extra spellbook/known lists may need continuation |
| 5 | 17 inventory rows, currency, attunement, carrying/storage and treasure | Weights, counts and notes have independent fields |
| 6 | Appearance/portrait reference, 7 features/feats, traits, ideals, bonds, flaws, backstory and allies | Fixed overlapping portrait-image label |
| 7 | Session notes, quests and follow-ups | Large multiline fields; designed for both writing by hand and typing |
| 8 | 2014 or 2024 exhaustion, 14 conditions, common calculations and SRD CC-BY-4.0 attribution | Edition-specific wording; corrected the 2014 Prone ranged-attack note and the 2024 Petrified / Poisoned distinction from V6 |

### Mathematics and edition checks

- **Ability modifiers:** floor((score − 10) ÷ 2). Examples: STR 12 → +1; DEX 14 → +2; WIS 18 → +4.
- **Proficiency bonus:** +2 at character levels 1–4, +3 at 5–8, +4 at 9–12, +5 at 13–16, +6 at 17–20 (standard player progression).
- **Saving throws:** WIS 18 with proficient save and PB +3 → +7 before circumstantial bonuses/penalties. Expertise, class features, feats, magic or temporary effects can change actual results; the sheet has separate editable final modifiers rather than forcing a simplistic universal formula.
- **Skill bonus:** For a proficient Perception check using WIS 18/PB +3: +7; passive Perception normally 17. Unproficient passive Insight for WIS 18: 14. Bard Jack of All Trades, Rogue/Bard Expertise, additional bonuses and situational effects require the correct character engine.
- **Weapon example:** Proficient mace attack by STR 12, PB +3 → +4 to hit; standard mace damage 1d6+1 bludgeoning. Magic weapons and special abilities can change this.
- **Spellcasting example:** WIS 18/PB +3 → Spell Save DC 15 and spell attack +7 before other bonuses.
- **HP example:** Level 5 Cleric with CON 16 and fixed HP increases could have 8+3 at level 1, then 4×(5+3) = **43 HP**. Rolled HP and other features may produce a different valid total.
- **2024 exhaustion:** cumulative −2 to D20 Tests and −5 feet to Speed *per exhaustion level*, death at 6. At level 2: −4 on D20 Tests, −10 ft from base Speed. Page 1 labels Speed as **base**, not automatically adjusted.
- **2014 exhaustion:** cumulative level effects: disadvantage on ability checks (1), half Speed (2), disadvantage attack rolls and saving throws (3), half maximum HP (4), Speed 0 (5), death (6).
- **Death saves:** three successes/three failures tracked. Actual natural 1 and natural 20 effects remain part of the game rules; PDF fields do not roll death saves automatically.
- **Concentration:** a Constitution save when damaged, with DC 10 or half the damage taken (rounding down), whichever is greater, unless other features override.
- **Multiclass Hit Dice:** page 1 has type/remaining/total; page 3 now provides a separate editable type-breakdown field so classes with different hit dice need not be misleadingly shown as only d8.
- **2014 vs 2024 action glossary:** 2014 has Cast a Spell and Use an Object; 2024 uses Magic and Utilize, alongside other actions such as Influence and Study. The PDF's common-action list changes with edition.

### Structural and visual tests

- **4 actual PDF files produced**, one for each 2014/2024 × colour/greyscale variant.
- **8 A4 pages and 504 uniquely named AcroForm text/checkbox widgets** in each PDF.
- **0 field/field overlaps**, **0 printed text/field collisions** and every field inside its page bounds in geometric checks.
- Verified typed text, exhaustion/proficiency checkbox selection and save/reopen persistence for four populated examples.
- Rendered filled pages in **PyMuPDF/PDFium and Poppler** for visual inspection, including the revised Page 1, Actions Page 2, Features Page 6 and Reference Page 8.
- Full-colour PDF uses the **user-provided production logo** (optimised PNG); black/white uses a greyscale version of the same logo.

### Real-table constraints and what remains

1. **No live arithmetic:** editing an ability score in the PDF does not automatically recompute every dependent field. For a Keeper website export, populate final validated values using the site's existing rules engine. A standalone PDF calculator, if desired, needs separate design and device-compatibility testing.
2. **Overflow:** the printed fields have finite capacity (5 quick attacks, 10 expanded attacks, 24 spells, 17 inventory rows, 7 feature rows). Long descriptions, names and multiclass data may require repeatable continuation sheets; don't silently omit them during a future export.
3. **Known vs prepared spells:** the generic spell table is currently a list, not an edition/class-sensitive live spell-preparation manager. A future export should mark which spells are prepared, always prepared, known or in the spellbook, and keep Pact Magic separate.
4. **Resources:** Action costs and current class-resource totals are editable text; checks against class limits and refresh timing must come from the live rules engine. Long/short rests themselves deliberately are **not** tracked as counts on page 1.
5. **Portrait:** the portrait area is usable for drawing; the typed 'portrait image reference' field is not an automatic image embedding control. A website export should place a player-owned authorised portrait when enabled.
6. **Accessibility and devices:** A4 print safe margins were reviewed. The PDFs were tested locally with two renderers but not physically on every tablet application/Android/iPad PDF editor, nor tested for all screen-reader accessibility features. Full PDF/UA accessibility needs separate remediation/testing.
7. **Licensing:** the reference page contains visible SRD 5.1 or SRD 5.2.1 Creative Commons attribution. Commercial publication still requires a final font/logo/content-rights and quality review.
8. **Site integration:** the current draft GitHub PR #911 targets the previous V6 field schema (7 pages, 422 fields). **It must be updated to V7's 8-page/504-field contract** before it can be merged or support these templates. No website export has been deployed.

### Recommended final improvements (before feature lock)

- Add a **prepared/known/spellbook status marker** to the spell table without overcrowding it; this requires precise class/edition-specific behavior in exports.
- Support **optional repeatable continuation sheets** for spells, advanced attacks, features and inventory (not a fixed hard eight-page cap for complex characters).
- Offer **print-only flattened** and **tablet-editable** versions, plus a live-character export workflow with ownership checks.
- Have two real players test a printed sheet at an actual session: one martial PC and one complex multiclass spellcaster, especially pencil space, readability and quick page turning.

**Rules and layout reference sources:** [SRD 5.1 (CC-BY-4.0)](https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf); [SRD 5.2.1 (CC-BY-4.0)](https://www.dndbeyond.com/srd); official D&D Beyond character-sheet examples for standard field grouping (no art/branding copied). These are concise original summaries, not a replacement for full game rules.