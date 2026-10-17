# Offline SRD 5.1 bestiary credits

The bundled `frontend/src/data/srd5eMonsters.generated.json` contains
**334 SRD 5.1 creatures (87 beasts)**, with open rules information
from the 2014-style Fifth Edition rules. It is packaged locally with the
Windows desktop and USB editions, so browsing and building encounters do not
require an internet connection.

The SRD data was normalized from the 5e-bits/5e-database English 2014 source,
release `v5.12.0`, file `src/2014/en/5e-SRD-Monsters.json`.
Source dataset: https://github.com/5e-bits/5e-database
Copyright/license for repository code: MIT; underlying rules content:
System Reference Document 5.1, Creative Commons Attribution 4.0.

**Required SRD attribution:**

This work includes material taken from the System Reference Document 5.1
(“SRD 5.1”) by Wizards of the Coast LLC and available at
https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is
licensed under the Creative Commons Attribution 4.0 International License
available at https://creativecommons.org/licenses/by/4.0/legalcode.

**Modifications:** Data records were reformatted for Rookie Quest Keeper's
offline bestiary: the original SRD monster names, challenge ratings, AC/HP,
abilities, traits, actions, resistances, and other relevant stat-block fields
were normalized into the app's JSON format. Reference URLs and externally
hosted monster artwork were not copied into the installed app.

This is an **SRD bestiary, not an archive of all paid D&D books**. Creatures
only available in separately purchased Monster Manuals, adventure books, or
other non-open sources are not included. Game-masters may add their own
independent homebrew and optionally manually enter stats they lawfully have.

The existing `monsterDatabase.js` non-SRD fallback entries are labelled
`legacy-reference`; some of those were historically approximate. For
verified encounter stats, choose the *SRD 5.1 (verified)* source.
