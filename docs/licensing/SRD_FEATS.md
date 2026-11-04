# Feats: what Rookie Quest Keeper is licensed to ship

Rookie ships only feats covered by Wizards of the Coast's System Reference
Document. Everything else a table wants is homebrew, uploaded per account.

## The licences

| Document | Licence | What it means here |
| --- | --- | --- |
| SRD 5.1 (2014 rules) | CC-BY-4.0 | Attribution required. **Not** public domain. |
| SRD 5.2 (2024 rules) | CC-BY-4.0 | Attribution required. **Not** public domain. |

Both SRDs are released under Creative Commons Attribution 4.0, so the content
may be shipped and shared commercially, but the attribution notice must travel
with it. Neither document is in the public domain, and the PHB feats that the
SRD leaves out are not licensed to us at all.

## Feats the SRD licenses

SRD 5.2 licenses **17** feats. SRD 5.1 licenses **1** (Grappler).

### Origin feats (SRD 5.2, 2024 only)

- Alert
- Magic Initiate
- Savage Attacker
- Skilled

### General feats (SRD 5.2)

- Ability Score Improvement
- Grappler — also in SRD 5.1, so this is the one feat the 2014 rules can offer.
  Its 2014 wording is kept separately via `descriptionByEdition`.

### Fighting Style feats (SRD 5.2)

- Archery
- Defense
- Great Weapon Fighting
- Two-Weapon Fighting

These are handled as class fighting styles rather than feat-picker entries
(`FIGHTER_FIGHTING_STYLES`, `PALADIN_FIGHTING_STYLES`,
`FIGHTING_STYLE_OPTIONS`), so they are not in the `FEATS` catalogue and this
change did not touch them.

Note that those class lists also offer **Dueling** and **Protection**.
Neither appears in SRD 5.2. Whether SRD 5.1 licenses them has not been
checked yet -- see Open items.

### Epic Boon feats (SRD 5.2, level 19+)

- Boon of Combat Prowess
- Boon of Dimensional Travel
- Boon of Fate
- Boon of Irresistible Offense
- Boon of Spell Recall
- Boon of the Night Spirit
- Boon of Truesight

2014 has no Origin or Epic Boon category at all, which is why the 2014 lists
here are short.

## What moved to homebrew

40 feats that previously shipped are not SRD-licensed. They were exported to
`legacy-feats-homebrew-pack.json` as a private homebrew pack
(`is_public: false`) so they can be re-added to a single account rather than
shipped to everyone. The export keeps each feat's `category`,
`categoryByEdition`, `descriptionByEdition` and `aliases`, so re-importing one
restores its original per-edition behaviour.

Among them: Athlete, Crafter, Healer, Lucky, Musician, Tavern Brawler, Tough,
War Caster and Boon of Fortitude.

## Existing characters are unaffected

Removing a feat from the catalogue does not touch a saved character:

- `backend/routes/characters.py` persists a feat's `name` and `description`
  onto the character when it is taken, so the sheet has its own copy.
- `frontend/src/components/clean-sheet/CleanSheetFeatsTab.js` renders from
  that saved copy, not from the catalogue.
- The builder's feat `<select>` fields always start at `None` and are never
  seeded from saved data, so no saved choice is silently rewritten.

Feats that were renamed keep an `aliases` entry for the old name (the former
`"<name> (Origin)"` duplicates and the `"<name> (Epic)"` boon suffix), so a
sheet saved under the old name still resolves through the feat registry.

## Attribution

Shipped SRD content must carry its notice. The bestiary already does this in
`frontend/src/components/.../MonstersTab.js` and `SRD_5_1_ATTRIBUTION.md`;
SRD 5.2 content needs the equivalent 5.2 notice.

## Adding content

Before adding a feat, spell, monster or item to a shipped catalogue, confirm it
appears in SRD 5.1 or SRD 5.2. If it does not, it belongs in a homebrew pack.
The test suites enforce this:

- `frontend/src/data/rules/feats/featEditionCategories.test.js`
- `backend/tests/test_feat_edition_categories.py`

## Open items

- **Fighting style options.** `Dueling` and `Protection` are offered by the
  Fighter and Paladin builders but are not in SRD 5.2. Check them against
  SRD 5.1 before the next content pass; if they are not licensed there
  either, they belong in homebrew alongside the legacy feats.
- **SRD 5.2 attribution.** The bestiary carries an SRD 5.1 notice. Shipping
  5.2 feats means the 5.2 notice has to appear too.
- **Spells, magic items and equipment.** Still to audit against both SRDs.
