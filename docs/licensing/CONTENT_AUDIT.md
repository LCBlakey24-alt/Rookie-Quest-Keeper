# Built-in rules content: what is outside the SRD (12 November 2026)

Rookie Quest Keeper may ship rules content that appears in Wizards of the
Coast's System Reference Documents, **SRD 5.1** (2014 rules) and **SRD 5.2**
(2024 rules). Both are licensed under Creative Commons Attribution 4.0
(CC BY 4.0): the content may be used, including commercially, as long as the
attribution notice is shown. Everything else is the table's own homebrew,
uploaded per account. `SRD_FEATS.md` set this rule for feats; this audit
applies it to the rest of the built-in content.

This is an engineering check, not legal advice. Before launch, have someone
qualified review the final list.

## Method

The app's built-in catalogues were exported (`RACES`, `CLASSES[*].subclasses`,
`BACKGROUNDS`, `FEATS`, `SPELL_DATABASE`, `ITEMS_DATABASE`,
`MONSTER_DATABASE`) and compared by name with the open SRD lists in the
5e-bits 5e-database (`src/2014/en` for SRD 5.1, `src/2024/en` for SRD 5.2) —
the same source the bundled bestiary already uses. A name match is not proof
that the *text* is SRD text, and a few mismatches below are only naming
differences; each move should be checked against the SRD documents
themselves.

## Already compliant

- **Feats** — only SRD feats ship (see `SRD_FEATS.md`).
- **Bestiary (SRD records)** — 334 creatures from SRD 5.1, with attribution.
- **Classes** — all 12 classes are in both SRDs.
- **Races in the SRD** — Dragonborn, Dwarf, Elf, Gnome, Half-Elf, Half-Orc,
  Halfling, Human and Tiefling (SRD 5.1); Goliath and Orc (SRD 5.2). These are
  safe to keep with attribution. Tiefling is fine.

## Attribution (done in this change)

A **Credits & licences** page (`/credits`) now carries the SRD 5.1 and SRD 5.2
notices in Wizards of the Coast's requested wording, plus an
unofficial-product and trademark notice. It is linked from the landing page
footer and Account settings.

## Outside the SRD: to move to homebrew packs

Each group below will be exported to a private homebrew pack in this folder
(as was done for feats) and removed from the built-in catalogue, in its own
pull request. Saved characters keep their own copy of names and text, so
existing sheets are not changed; the account owner can re-add any pack to
their own account.

### Subclasses — 92 of 104

The SRD has one subclass per class: Path of the Berserker, College of Lore,
Life Domain, Circle of the Land, Champion, Way/Warrior of the Open Hand, Oath
of Devotion, Hunter, Thief, Draconic Bloodline/Sorcery, The Fiend/Fiend
Patron, School of Evocation/Evoker. Everything else is from the Player's
Handbook or other paid books:

- **Barbarian**: Path of the Totem Warrior, Path of the Ancestral Guardian, Path of the Storm Herald, Path of the Zealot, Path of the Beast, Path of Wild Magic
- **Bard**: College of Valor, College of Glamour, College of Swords, College of Whispers, College of Creation, College of Eloquence
- **Cleric**: Knowledge, Light, Nature, Tempest, Trickery, War, Death, Forge, Grave, Order, Peace and Twilight Domains
- **Druid**: Circle of the Moon, Circle of Dreams, Circle of the Shepherd, Circle of Spores, Circle of Stars, Circle of Wildfire
- **Fighter**: Battle Master, Eldritch Knight, Arcane Archer, Cavalier, Samurai, Echo Knight, Psi Warrior, Rune Knight
- **Monk**: Way of Shadow, Way of the Four Elements, Way of the Drunken Master, Way of the Kensei, Way of the Sun Soul, Way of Mercy, Way of the Astral Self
- **Paladin**: Oath of the Ancients, Oath of Vengeance, Oath of Conquest, Oath of Redemption, Oath of Glory, Oath of the Watchers, Oathbreaker
- **Ranger**: Beast Master, Gloom Stalker, Horizon Walker, Monster Slayer, Fey Wanderer, Swarmkeeper, Drakewarden
- **Rogue**: Assassin, Arcane Trickster, Inquisitive, Mastermind, Scout, Swashbuckler, Phantom, Soulknife
- **Sorcerer**: Wild Magic, Divine Soul, Shadow Magic, Storm Sorcery, Aberrant Mind, Clockwork Soul
- **Warlock**: The Archfey, The Great Old One, The Celestial, The Hexblade, The Fathomless, The Genie, The Undead
- **Wizard**: the seven other schools, Bladesinging, War Magic, Chronurgy Magic, Graviturgy Magic, Order of Scribes

The per-class feature files (`*Subclasses.js`) hold these subclasses'
feature text and move with them.

### Spells — 24 of 168

Witch Bolt, Arms of Hadar, Tasha's Hideous Laughter, Armor of Agathys,
Compelled Duel, Thunderous Smite, Wrathful Smite, Hail of Thorns, Absorb
Elements, Crown of Madness, Hunger of Hadar, Elemental Weapon, Aura of
Vitality, Staggering Smite, Find Greater Steed, Holy Weapon, Destructive Wave,
Banishing Smite, Synaptic Static, Blade Ward, Friends, Toll the Dead, Word of
Radiance, Thorn Whip.

*Tasha's Hideous Laughter* is in the SRD as **Hideous Laughter**: rename it
(with an alias for saved characters) rather than remove it. Check Blade Ward
and the smite spells against the SRD 5.2 document before removing them; the
open dataset may name or include them differently.

### Backgrounds — 8 of 19 (plus 6 to confirm)

Not in either SRD: Entertainer, Folk Hero, Guild Artisan, Hermit, Noble,
Outlander, Sailor, Urchin. The SRD has Acolyte (5.1) and Acolyte, Criminal,
Sage, Soldier (5.2).

Adventurer, Apprentice, Healer, Performer, Scholar, Wanderer and Custom
Background appear to be the app's own generic backgrounds
(`starterOrigins5e.js`). Keep them if their text is original.

### Races — 1 to move, 4 to confirm

- **Aasimar** is not in either SRD: move to homebrew.
- **Custom Lineage** is a name from *Tasha's Cauldron of Everything*: rename to
  an original name (for example *Custom Origin*) with an alias, and check its
  rules are generic.
- **Beastfolk, Fey-Touched, Constructed** are the app's own generic starter
  species (`starterOrigins5e.js`). Keep them if their text is original; note
  *Fey Touched* is also a non-SRD feat name, so consider renaming.

### Monsters — the 47 `legacy-reference` entries

`monsterDatabase.js` holds 47 non-SRD fallback entries alongside the SRD
bestiary. Several are among Wizards of the Coast's most protected creatures
(Intellect Devourer, Spectator, Nothic, Death Knight, Demilich, the
yugoloths). Remove all 47 from the built-in list. A few (Werewolf, Wererat,
Wereboar, Weretiger, Werebear, Vampire) have SRD equivalents under SRD names;
use those instead.

### Magic items

All 92 match the SRD or are naming variants of SRD items (Spell Scroll, Potion
of Giant Strength, Belt of Hill Giant Strength). Check *Potion of Fire Breath*
and *Stone of Good Luck* against the SRD text.

## Also to check

- **Fighting styles**: Dueling and Protection (open item in `SRD_FEATS.md`).
- **Class feature text** in `classFeatures.js` and the per-class files: keep
  wording to the SRD's or the app's own summaries, never copied book text.
- **Trademarks in the interface**: say "compatible with fifth edition" or
  "import from D&D Beyond" (factual use), never use Wizards of the Coast
  logos, and keep the unofficial notice on `/credits`.
