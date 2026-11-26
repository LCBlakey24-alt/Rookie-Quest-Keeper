# Built-in content licensing inventory

Generated 2026-11-20 for the content policy of 19 November 2026. Every name the app ships as built-in content, with where it is licensed from.

**Statuses** (from the policy): `srd_5_1`, `srd_5_2_1`, `original_rqk`, `user_original`, `third_party_licensed`, `manual_external_reference`, `unverified_restricted`.

**Method.** Names were taken from the app's own data modules and matched against the SRD 5.1 and SRD 5.2.1 content (the open 5e-bits SRD datasets), then every doubtful name was checked by hand against the text of the official SRD PDFs (`SRD_CC_v5.1.pdf`, `SRD_CC_v5.2.1.pdf`). A name matching is not proof the *wording* matches the SRD; descriptions still need a wording review (see the end).

`unverified_restricted` means: not found in either SRD. It must not be offered as built-in content without a licence. It is **not** a claim that anyone's existing character is wrong; see the plan.

## Classes
All 12 core classes are in both SRDs. No Artificer is built in.

| Name | Status |
| --- | --- |
| Barbarian | srd_5_1, srd_5_2_1 |
| Bard | srd_5_1, srd_5_2_1 |
| Cleric | srd_5_1, srd_5_2_1 |
| Druid | srd_5_1, srd_5_2_1 |
| Fighter | srd_5_1, srd_5_2_1 |
| Monk | srd_5_1, srd_5_2_1 |
| Paladin | srd_5_1, srd_5_2_1 |
| Ranger | srd_5_1, srd_5_2_1 |
| Rogue | srd_5_1, srd_5_2_1 |
| Sorcerer | srd_5_1, srd_5_2_1 |
| Warlock | srd_5_1, srd_5_2_1 |
| Wizard | srd_5_1, srd_5_2_1 |

## Species / races (the creator's list: `characterRules5e.RACES`)

| Name | Status |
| --- | --- |
| Human | srd_5_1, srd_5_2_1 |
| Elf | srd_5_1, srd_5_2_1 |
| Dwarf | srd_5_1, srd_5_2_1 |
| Halfling | srd_5_1, srd_5_2_1 |
| Gnome | srd_5_1, srd_5_2_1 |
| Half-Orc | srd_5_1 |
| Half-Elf | srd_5_1 |
| Tiefling | srd_5_1, srd_5_2_1 |
| Aasimar | unverified_restricted |
| Goliath | srd_5_2_1 |
| Orc | srd_5_2_1 |

## Original starter species (`starterOrigins5e.STARTER_SPECIES`)

| Name | Status |
| --- | --- |
| Dragonborn | srd_5_1, srd_5_2_1 |
| Beastfolk | original_rqk |
| Fey-Touched | original_rqk |
| Constructed | original_rqk |
| Custom Lineage | original_rqk |

Note: `editionRules.SRD_RACES_2024` labels **Aasimar** as SRD. It is not in SRD 5.2.1 (checked against the PDF); the label is wrong.

## Backgrounds (`characterRules5e.BACKGROUNDS`, shown in the creator)

| Name | Status |
| --- | --- |
| Acolyte | srd_5_1, srd_5_2_1 |
| Criminal | srd_5_2_1 |
| Entertainer | unverified_restricted |
| Folk Hero | unverified_restricted |
| Guild Artisan | unverified_restricted |
| Hermit | unverified_restricted |
| Noble | unverified_restricted |
| Outlander | unverified_restricted |
| Sage | srd_5_2_1 |
| Sailor | unverified_restricted |
| Soldier | srd_5_2_1 |
| Urchin | unverified_restricted |

## 'Test' backgrounds (`testBackgrounds5e.TEST_BACKGROUNDS`)
Shown in the creator only when the build sets `REACT_APP_SHOW_TEST_BACKGROUNDS=true` (nothing in this repository does), but their text is imported, so it ships in the site's JavaScript either way.

| Name | Status |
| --- | --- |
| Anthropologist | unverified_restricted |
| Archaeologist | unverified_restricted |
| Athlete | unverified_restricted |
| Courtier | unverified_restricted |
| Faction Agent | unverified_restricted |
| Far Traveler | unverified_restricted |
| Gambler | unverified_restricted |
| Gladiator | unverified_restricted |
| Investigator | unverified_restricted |
| Mercenary | unverified_restricted |
| City Watch | unverified_restricted |
| Urban Bounty Hunter | unverified_restricted |
| Smuggler | unverified_restricted |
| Pirate | unverified_restricted |
| Haunted One | unverified_restricted |
| Clan Crafter | unverified_restricted |
| Inheritor | unverified_restricted |
| Knight of the Order | unverified_restricted |
| Spy | unverified_restricted |

## Original starter backgrounds (`starterOrigins5e.STARTER_BACKGROUNDS`)

| Name | Status |
| --- | --- |
| Adventurer | original_rqk |
| Apprentice | original_rqk |
| Healer | original_rqk |
| Performer | original_rqk |
| Scholar | original_rqk |
| Wanderer | original_rqk |
| Custom Background | original_rqk |

Note: `editionRules.SRD_BACKGROUNDS` labels Criminal, Folk Hero and Noble as SRD for 2014. SRD 5.1 has only Acolyte; SRD 5.2.1 has Acolyte, Criminal, Sage and Soldier.

## Subclasses offered by the creator (`characterRules5e.CLASSES[*].subclasses`)
Each SRD has exactly one subclass per class.

| Name | Status |
| --- | --- |
| Barbarian: Path of the Berserker | srd_5_1, srd_5_2_1 |
| Barbarian: Path of the Totem Warrior | unverified_restricted |
| Barbarian: Path of the Ancestral Guardian | unverified_restricted |
| Barbarian: Path of the Storm Herald | unverified_restricted |
| Barbarian: Path of the Zealot | unverified_restricted |
| Barbarian: Path of the Beast | unverified_restricted |
| Barbarian: Path of Wild Magic | unverified_restricted |
| Bard: College of Lore | srd_5_1, srd_5_2_1 |
| Bard: College of Valor | unverified_restricted |
| Bard: College of Glamour | unverified_restricted |
| Bard: College of Swords | unverified_restricted |
| Bard: College of Whispers | unverified_restricted |
| Bard: College of Creation | unverified_restricted |
| Bard: College of Eloquence | unverified_restricted |
| Cleric: Knowledge Domain | unverified_restricted |
| Cleric: Life Domain | srd_5_1, srd_5_2_1 |
| Cleric: Light Domain | unverified_restricted |
| Cleric: Nature Domain | unverified_restricted |
| Cleric: Tempest Domain | unverified_restricted |
| Cleric: Trickery Domain | unverified_restricted |
| Cleric: War Domain | unverified_restricted |
| Cleric: Death Domain | unverified_restricted |
| Cleric: Forge Domain | unverified_restricted |
| Cleric: Grave Domain | unverified_restricted |
| Cleric: Order Domain | unverified_restricted |
| Cleric: Peace Domain | unverified_restricted |
| Cleric: Twilight Domain | unverified_restricted |
| Druid: Circle of the Land | srd_5_1, srd_5_2_1 |
| Druid: Circle of the Moon | unverified_restricted |
| Druid: Circle of Dreams | unverified_restricted |
| Druid: Circle of the Shepherd | unverified_restricted |
| Druid: Circle of Spores | unverified_restricted |
| Druid: Circle of Stars | unverified_restricted |
| Druid: Circle of Wildfire | unverified_restricted |
| Fighter: Champion | srd_5_1, srd_5_2_1 |
| Fighter: Battle Master | unverified_restricted |
| Fighter: Eldritch Knight | unverified_restricted |
| Fighter: Arcane Archer | unverified_restricted |
| Fighter: Cavalier | unverified_restricted |
| Fighter: Samurai | unverified_restricted |
| Fighter: Echo Knight | unverified_restricted |
| Fighter: Psi Warrior | unverified_restricted |
| Fighter: Rune Knight | unverified_restricted |
| Monk: Way of the Open Hand | srd_5_1 |
| Monk: Way of Shadow | unverified_restricted |
| Monk: Way of the Four Elements | unverified_restricted |
| Monk: Way of the Drunken Master | unverified_restricted |
| Monk: Way of the Kensei | unverified_restricted |
| Monk: Way of the Sun Soul | unverified_restricted |
| Monk: Way of Mercy | unverified_restricted |
| Monk: Way of the Astral Self | unverified_restricted |
| Paladin: Oath of Devotion | srd_5_1, srd_5_2_1 |
| Paladin: Oath of the Ancients | unverified_restricted |
| Paladin: Oath of Vengeance | unverified_restricted |
| Paladin: Oath of Conquest | unverified_restricted |
| Paladin: Oath of Redemption | unverified_restricted |
| Paladin: Oath of Glory | unverified_restricted |
| Paladin: Oath of the Watchers | unverified_restricted |
| Paladin: Oathbreaker | unverified_restricted |
| Ranger: Hunter | srd_5_1, srd_5_2_1 |
| Ranger: Beast Master | unverified_restricted |
| Ranger: Gloom Stalker | unverified_restricted |
| Ranger: Horizon Walker | unverified_restricted |
| Ranger: Monster Slayer | unverified_restricted |
| Ranger: Fey Wanderer | unverified_restricted |
| Ranger: Swarmkeeper | unverified_restricted |
| Ranger: Drakewarden | unverified_restricted |
| Rogue: Thief | srd_5_1, srd_5_2_1 |
| Rogue: Assassin | unverified_restricted |
| Rogue: Arcane Trickster | unverified_restricted |
| Rogue: Inquisitive | unverified_restricted |
| Rogue: Mastermind | unverified_restricted |
| Rogue: Scout | unverified_restricted |
| Rogue: Swashbuckler | unverified_restricted |
| Rogue: Phantom | unverified_restricted |
| Rogue: Soulknife | unverified_restricted |
| Sorcerer: Draconic Bloodline | srd_5_1, srd_5_2_1 |
| Sorcerer: Wild Magic | unverified_restricted |
| Sorcerer: Divine Soul | unverified_restricted |
| Sorcerer: Shadow Magic | unverified_restricted |
| Sorcerer: Storm Sorcery | unverified_restricted |
| Sorcerer: Aberrant Mind | unverified_restricted |
| Sorcerer: Clockwork Soul | unverified_restricted |
| Warlock: The Archfey | unverified_restricted |
| Warlock: The Fiend | srd_5_1, srd_5_2_1 |
| Warlock: The Great Old One | unverified_restricted |
| Warlock: The Celestial | unverified_restricted |
| Warlock: The Hexblade | unverified_restricted |
| Warlock: The Fathomless | unverified_restricted |
| Warlock: The Genie | unverified_restricted |
| Warlock: The Undead | unverified_restricted |
| Wizard: School of Abjuration | unverified_restricted |
| Wizard: School of Conjuration | unverified_restricted |
| Wizard: School of Divination | unverified_restricted |
| Wizard: School of Enchantment | unverified_restricted |
| Wizard: School of Evocation | srd_5_1, srd_5_2_1 |
| Wizard: School of Illusion | unverified_restricted |
| Wizard: School of Necromancy | unverified_restricted |
| Wizard: School of Transmutation | unverified_restricted |
| Wizard: Bladesinging | unverified_restricted |
| Wizard: War Magic | unverified_restricted |
| Wizard: Chronurgy Magic | unverified_restricted |
| Wizard: Graviturgy Magic | unverified_restricted |
| Wizard: Order of Scribes | unverified_restricted |

## Subclass rules modules (feature data used by the builder and sheet)

| Name | Status |
| --- | --- |
| barbarianSubclasses: berserker | srd_5_1, srd_5_2_1 |
| barbarianSubclasses: wild_heart | unverified_restricted |
| barbarianSubclasses: world_tree | unverified_restricted |
| barbarianSubclasses: zealot | unverified_restricted |
| barbarianSubclasses: custom_barbarian_subclass | user_original (custom slot) |
| bardSubclasses: College of Lore [2014/2024] | srd_5_1, srd_5_2_1 |
| bardSubclasses: Custom / user-added subclass [2014/2024] | user_original (custom slot) |
| clericSubclasses: Life Domain [2014/2024] | srd_5_1, srd_5_2_1 |
| clericSubclasses: Custom / user-added subclass [2014/2024] | user_original (custom slot) |
| druidSubclasses: Circle of the Land [2014/2024] | srd_5_1, srd_5_2_1 |
| druidSubclasses: Custom / user-added subclass [2014/2024] | user_original (custom slot) |
| monkSubclasses: Way of the Open Hand [2014] | srd_5_1 |
| monkSubclasses: Warrior of the Open Hand [2024] | srd_5_2_1 |
| monkSubclasses: Custom / user-added subclass [2014/2024] | user_original (custom slot) |
| rangerSubclasses: Hunter [2014/2024] | srd_5_1, srd_5_2_1 |
| rangerSubclasses: Beast Master [2014/2024] | unverified_restricted |
| rangerSubclasses: Gloom Stalker [2014/2024] | unverified_restricted |
| rangerSubclasses: Fey Wanderer [2024] | unverified_restricted |
| rangerSubclasses: Horizon Walker [2014] | unverified_restricted |
| rangerSubclasses: Monster Slayer [2014] | unverified_restricted |
| rangerSubclasses: Swarmkeeper [2014] | unverified_restricted |
| rangerSubclasses: Drakewarden [2014] | unverified_restricted |
| sorcererSubclasses: Draconic Bloodline [2014/2024] | srd_5_1, srd_5_2_1 |
| sorcererSubclasses: Wild Magic [2014/2024] | unverified_restricted |
| sorcererSubclasses: Aberrant Mind [2014/2024] | unverified_restricted |
| sorcererSubclasses: Clockwork Soul [2014/2024] | unverified_restricted |
| sorcererSubclasses: Divine Soul [2014] | unverified_restricted |
| sorcererSubclasses: Shadow Magic [2014] | unverified_restricted |
| sorcererSubclasses: Storm Sorcery [2014] | unverified_restricted |
| warlockSubclasses: Archfey Patron [2014/2024] | unverified_restricted |
| warlockSubclasses: Fiend Patron [2014/2024] | srd_5_1, srd_5_2_1 |
| warlockSubclasses: Great Old One Patron [2014/2024] | unverified_restricted |
| warlockSubclasses: Celestial Patron [2014/2024] | unverified_restricted |
| warlockSubclasses: Hexblade Patron [2014] | unverified_restricted |
| warlockSubclasses: Fathomless Patron [2014] | unverified_restricted |
| warlockSubclasses: Genie Patron [2014] | unverified_restricted |
| warlockSubclasses: Undead Patron [2014] | unverified_restricted |
| wizardSubclasses: School of Abjuration [2014/2024] | unverified_restricted |
| wizardSubclasses: School of Divination [2014/2024] | unverified_restricted |
| wizardSubclasses: School of Evocation [2014/2024] | srd_5_1, srd_5_2_1 |
| wizardSubclasses: School of Illusion [2014/2024] | unverified_restricted |
| wizardSubclasses: School of Conjuration [2014] | unverified_restricted |
| wizardSubclasses: School of Enchantment [2014] | unverified_restricted |
| wizardSubclasses: School of Necromancy [2014] | unverified_restricted |
| wizardSubclasses: School of Transmutation [2014] | unverified_restricted |

## Feats (`levelUpData.FEATS`, via `rules/feats/featRegistry`)

| Name | Status |
| --- | --- |
| Alert | srd_5_2_1 |
| Magic Initiate | srd_5_2_1 |
| Savage Attacker | srd_5_2_1 |
| Skilled | srd_5_2_1 |
| Ability Score Improvement | srd_5_2_1 |
| Grappler | srd_5_1, srd_5_2_1 |
| Boon of Combat Prowess | srd_5_2_1 |
| Boon of Dimensional Travel | srd_5_2_1 |
| Boon of Fate | srd_5_2_1 |
| Boon of Irresistible Offense | srd_5_2_1 |
| Boon of Spell Recall | srd_5_2_1 |
| Boon of the Night Spirit | srd_5_2_1 |
| Boon of Truesight | srd_5_2_1 |

## Fighting styles, 2014

| Name | Status |
| --- | --- |
| Archery | srd_5_1 |
| Defense | srd_5_1 |
| Dueling | srd_5_1 |
| Great Weapon Fighting | srd_5_1 |
| Protection | srd_5_1 |
| Two-Weapon Fighting | srd_5_1 |

## Fighting styles, 2024 (feats in SRD 5.2.1)

| Name | Status |
| --- | --- |
| Archery | srd_5_2_1 |
| Blind Fighting | unverified_restricted |
| Defense | srd_5_2_1 |
| Dueling | unverified_restricted |
| Great Weapon Fighting | srd_5_2_1 |
| Interception | unverified_restricted |
| Protection | unverified_restricted |
| Thrown Weapon Fighting | unverified_restricted |
| Two-Weapon Fighting | srd_5_2_1 |
| Unarmed Fighting | unverified_restricted |

## Spells (`spellDatabase.SPELL_DATABASE`)

168 built-in spells. 144 are in SRD 5.1 and/or 5.2.1. These 24 are in neither (each checked as a heading in both PDFs):

- Witch Bolt — `unverified_restricted`
- Arms of Hadar — `unverified_restricted`
- Tasha's Hideous Laughter — `unverified_restricted`
- Armor of Agathys — `unverified_restricted`
- Compelled Duel — `unverified_restricted`
- Thunderous Smite — `unverified_restricted`
- Wrathful Smite — `unverified_restricted`
- Hail of Thorns — `unverified_restricted`
- Absorb Elements — `unverified_restricted`
- Crown of Madness — `unverified_restricted`
- Hunger of Hadar — `unverified_restricted`
- Elemental Weapon — `unverified_restricted`
- Aura of Vitality — `unverified_restricted`
- Staggering Smite — `unverified_restricted`
- Find Greater Steed — `unverified_restricted`
- Holy Weapon — `unverified_restricted`
- Destructive Wave — `unverified_restricted`
- Banishing Smite — `unverified_restricted`
- Synaptic Static — `unverified_restricted`
- Blade Ward — `unverified_restricted`
- Friends — `unverified_restricted`
- Toll the Dead — `unverified_restricted`
- Word of Radiance — `unverified_restricted`
- Thorn Whip — `unverified_restricted`

## Magic items (`itemsDatabase`)

92 built-in items. Giant Strength potions/belts, Spell Scrolls and Stone of Good Luck are SRD entries under slightly different names. Not in either SRD:

- Potion of Fire Breath — `unverified_restricted`

## Monsters (`monsterDatabase`)

All 334 built-in monsters are SRD 5.1 stat blocks (tagged `srd-5.1` in the data). Earlier non-SRD creatures were moved to `docs/licensing/legacy-monsters-homebrew-pack.json`. Status: `srd_5_1`.

## Policy checks beyond the built-in lists

| Policy item | Finding |
| --- | --- |
| 7. Edition separation | Classes, spell slots, subclass levels, feats and fighting styles are kept per edition (2014 / 2024). The species and background lists are shared between editions, so the 2024 creator offers 2014-only options (and the reverse). |
| 8. Source and licence records | Monsters carry `source: srd-5.1`. Other built-in records have no source field: feats default to `app-data`, spells to `SRD` (wrong for the 24 above). |
| 9. Homebrew shared with campaigns | Yes. Homebrew is private by default, with `private`, `campaign`, `shared_copy` and `public` visibility. Every record records its `content_source` (`original`, `free_licence`, `published_book`), and the backend refuses to make `published_book` content public or shareable beyond the owner's own campaign. |
| 10. Campaign homebrew in creation and level-up | Yes: linked players see the GM's campaign homebrew (classes, subclasses, species, items) in the creator and on the sheet (PRs #972, #980, #981). |
| 11. Uploads exposed publicly | No public URLs found for uploads; maps, handouts and the campaign workbook are campaign-scoped. **Gap:** no "I own this or have permission" confirmation on uploads (campaign document import, maps, handouts). |
| 12. Rook importer | The campaign workbook import (`/campaign-workbook/preview`, `/import`) is draft-first and campaign-private. It does not refuse book text. **Gap:** no rights confirmation and no warning against pasting rulebook chapters. |
| 13. Exports and attribution | `/credits` carries the exact SRD 5.1 and SRD 5.2 attribution, a modification note and an independent-product notice. Character PDF export is not live (draft PR #911); it must carry the attribution when it ships. |
| 16. Public library (Community Creations) | Publishing is an explicit action and published-book content cannot be made public. **Gap:** no report or takedown route. |

Not yet reviewed: the *wording* of built-in descriptions (species traits, class features, spell text). Names being SRD does not prove the text is the SRD's, or a fair rewording of it. This needs a pass per data module.

## Proposed plan (small PRs)

1. **This document**, plus fixing the two wrong labels (`SRD_RACES_2024` includes Aasimar; `SRD_BACKGROUNDS` includes Criminal, Folk Hero and Noble for 2014).
2. **Done (subclasses #993, species and backgrounds #994, fighting styles, spells and Potion of Fire Breath in the follow-up PR).** **Stop offering non-SRD options as built-in choices** in the creator and level-up: subclasses, species (Aasimar), backgrounds (PHB and "test" backgrounds), 2024 fighting styles, the 24 spells and Potion of Fire Breath. Keep the SRD option, the original starter options, "Custom / user-added" and campaign homebrew. "Tasha's Hideous Laughter" is offered under its SRD name, Hideous Laughter. **Existing characters keep what they have**: a saved non-SRD choice still loads and shows its name, marked as a manual / external reference, never deleted.
3. **Done (owner approved 26 Nov 2026).** **Remove the feature *text* of non-SRD subclasses** from the built-in rules modules, so stored characters show their own notes instead. Owner review first, because it changes what existing characters display.
4. **Guard test done (#995, `srdGuard.test.js`); source fields still to do.** **Source fields** on built-in records (`srd_5_1`, `srd_5_2_1`, `original_rqk`), checked by a test so a non-SRD name can't be added as built-in again.
5. **Done (#996).** **Rights confirmation** on uploads and the campaign import, with plain-English "don't upload whole books" guidance.
6. **Report button and takedown handling** for Community Creations.
7. **Wording review** of built-in descriptions, module by module.

This is engineering guidance, not legal advice. Professional UK IP review is still needed before commercial launch (policy section 16).
