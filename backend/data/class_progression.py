"""
SRD class progression reference — used by `/level-up-options` to return the FULL
legal option set (subclasses, spells/cantrips gained, feats) so the LevelUpWizard
can render only valid choices instead of computing them client-side.

The 2014 spells-known tables stay separate from 2024 prepared-spell capacity so
revised casters are never accidentally treated as legacy known-spells casters.
Wizard spellbook growth remains a separate permanent-learning path in both
editions.
"""
from typing import List, Dict, Any

# Subclasses per class (SRD-friendly only). Editions matter — 2024 dropped a few.
_CLASS_SUBCLASSES: Dict[str, List[str]] = {
    'Barbarian': ['Path of the Berserker', 'Path of the Wild Heart', 'Path of the World Tree', 'Path of the Zealot'],
    'Bard':      ['College of Lore', 'College of Valor', 'College of Glamour', 'College of Swords', 'College of Whispers'],
    'Cleric':    ['Life Domain', 'Light Domain', 'Trickery Domain', 'War Domain', 'Knowledge Domain', 'Nature Domain', 'Tempest Domain'],
    'Druid':     ['Circle of the Land', 'Circle of the Moon', 'Circle of the Sea', 'Circle of the Stars'],
    'Fighter':   ['Champion', 'Battle Master', 'Eldritch Knight', 'Psi Warrior'],
    'Monk':      ['Warrior of the Open Hand', 'Warrior of Shadow', 'Warrior of the Elements', 'Warrior of Mercy'],
    'Paladin':   ['Oath of Devotion', 'Oath of the Ancients', 'Oath of Vengeance', 'Oath of Glory'],
    'Ranger':    ['Hunter', 'Beast Master', 'Gloom Stalker', 'Fey Wanderer'],
    'Rogue':     ['Thief', 'Assassin', 'Arcane Trickster', 'Soulknife', 'Swashbuckler'],
    'Sorcerer':  ['Draconic Sorcery', 'Wild Magic', 'Aberrant Sorcery', 'Clockwork Sorcery'],
    'Warlock':   ['Fiend Patron', 'Archfey Patron', 'Great Old One Patron', 'Celestial Patron'],
    'Wizard':    ['Abjurer', 'Diviner', 'Evoker', 'Illusionist'],
}

# 2014 spells known at each level (for "spells known" casters: Bard / Ranger / Sorcerer / Warlock).
# Wizard entries represent cumulative spellbook size from class progression alone:
# six spells at Wizard 1, then two additional spells for every Wizard level gained.
_SPELLS_KNOWN_PROGRESSION: Dict[str, Dict[int, int]] = {
    'Bard':     {1:4,2:5,3:6,4:7,5:8,6:9,7:10,8:11,9:12,10:14,11:15,12:15,13:16,14:18,15:19,16:19,17:20,18:22,19:22,20:22},
    'Ranger':   {2:2,3:3,4:3,5:4,6:4,7:5,8:5,9:6,10:6,11:7,12:7,13:8,14:8,15:9,16:9,17:10,18:10,19:11,20:11},
    'Sorcerer': {1:2,2:3,3:4,4:5,5:6,6:7,7:8,8:9,9:10,10:11,11:12,12:12,13:13,14:13,15:14,16:14,17:15,18:15,19:15,20:15},
    'Warlock':  {1:2,2:3,3:4,4:5,5:6,6:7,7:8,8:9,9:10,10:10,11:11,12:11,13:12,14:12,15:13,16:13,17:14,18:14,19:15,20:15},
    'Wizard':   {1:6,2:8,3:10,4:12,5:14,6:16,7:18,8:20,9:22,10:24,11:26,12:28,13:30,14:32,15:34,16:36,17:38,18:40,19:42,20:44},
}

# 2024 Prepared Spells columns. Unlike the 2014 prepared-caster formula, these
# are fixed class-table values and therefore must not be derived from ability
# modifiers. Wizard still learns two spellbook spells per class level; this table
# controls only how many of those spellbook spells can be prepared at once.
_FULL_PREPARED_2024: Dict[int, int] = {
    1:4,2:5,3:6,4:7,5:9,6:10,7:11,8:12,9:14,10:15,
    11:16,12:16,13:17,14:17,15:18,16:18,17:19,18:20,19:21,20:22,
}

_SORCERER_PREPARED_2024: Dict[int, int] = {
    1:2,2:4,3:6,4:7,5:9,6:10,7:11,8:12,9:14,10:15,
    11:16,12:16,13:17,14:17,15:18,16:18,17:19,18:20,19:21,20:22,
}

_WARLOCK_PREPARED_2024: Dict[int, int] = {
    1:2,2:3,3:4,4:5,5:6,6:7,7:8,8:9,9:10,10:10,
    11:11,12:11,13:12,14:12,15:13,16:13,17:14,18:14,19:15,20:15,
}

_WIZARD_PREPARED_2024: Dict[int, int] = {
    1:4,2:5,3:6,4:7,5:9,6:10,7:11,8:12,9:14,10:15,
    11:16,12:16,13:17,14:18,15:19,16:21,17:22,18:23,19:24,20:25,
}

_HALF_CASTER_PREPARED_2024: Dict[int, int] = {
    1:2,2:3,3:4,4:5,5:6,6:6,7:7,8:7,9:9,10:9,
    11:10,12:10,13:11,14:11,15:12,16:12,17:14,18:14,19:15,20:15,
}

_PREPARED_2024_BY_CLASS: Dict[str, Dict[int, int]] = {
    'Bard': _FULL_PREPARED_2024,
    'Cleric': _FULL_PREPARED_2024,
    'Druid': _FULL_PREPARED_2024,
    'Paladin': _HALF_CASTER_PREPARED_2024,
    'Ranger': _HALF_CASTER_PREPARED_2024,
    'Sorcerer': _SORCERER_PREPARED_2024,
    'Warlock': _WARLOCK_PREPARED_2024,
    'Wizard': _WIZARD_PREPARED_2024,
}

# Cantrips known at each level. These tables currently describe the shared SRD
# progression used by the existing builder; edition-specific cantrip differences
# can be split here when the remaining 2024 class audit reaches them.
_CANTRIPS_KNOWN_PROGRESSION: Dict[str, Dict[int, int]] = {
    'Bard':     {1:2,4:3,10:4},
    'Cleric':   {1:3,4:4,10:5},
    'Druid':    {1:2,4:3,10:4},
    'Sorcerer': {1:4,4:5,10:6},
    'Warlock':  {1:2,4:3,10:4},
    'Wizard':   {1:3,4:4,10:5},
}

# Origin Feats (2024 only) — picked at character creation as part of background.
_ORIGIN_FEATS_2024: List[str] = [
    'Crafter', 'Healer', 'Lucky', 'Magic Initiate', 'Musician',
    'Savage Attacker', 'Skilled', 'Tavern Brawler', 'Tough', 'Alert',
]

# General feats — most are shared 2014/2024 SRD; a handful are 2024-only or 2014-only.
_GENERAL_FEATS_BOTH: List[str] = [
    'Alert', 'Athlete', 'Charger', 'Chef', 'Crusher', 'Defensive Duelist',
    'Dual Wielder', 'Durable', 'Elemental Adept', 'Fey Touched', 'Grappler',
    'Great Weapon Master', 'Heavily Armored', 'Heavy Armor Master',
    'Inspiring Leader', 'Keen Mind', 'Lightly Armored', 'Linguist',
    'Lucky', 'Mage Slayer', 'Magic Initiate', 'Martial Adept',
    'Medium Armor Master', 'Mobile', 'Mounted Combatant', 'Observant',
    'Piercer', 'Polearm Master', 'Resilient', 'Ritual Caster',
    'Savage Attacker', 'Sentinel', 'Shadow Touched', 'Sharpshooter',
    'Shield Master', 'Skill Expert', 'Skulker', 'Slasher',
    'Spell Sniper', 'Tavern Brawler', 'Telekinetic', 'Telepathic',
    'Tough', 'War Caster', 'Weapon Master',
]
_GENERAL_FEATS_2024_ONLY: List[str] = []  # add any pure-2024 general feats here


def _edition(value: str) -> str:
    return '2024' if '2024' in str(value or '') else '2014'


def _table_value(table: Dict[int, int], level: int) -> int:
    """Return the last progression value at or before level."""
    result = 0
    for table_level in sorted(table):
        if table_level <= int(level or 0):
            result = int(table[table_level])
        else:
            break
    return result


def feats_for_edition(edition: str, category: str = 'general') -> List[str]:
    """Return the feat list for the given edition + category.
    category: 'origin' (2024 only) or 'general' (any non-origin feat) or 'all'.
    """
    if category == 'origin':
        return _ORIGIN_FEATS_2024 if _edition(edition) == '2024' else []
    if category == 'general':
        return list(_GENERAL_FEATS_BOTH) + (_GENERAL_FEATS_2024_ONLY if _edition(edition) == '2024' else [])
    return list(_GENERAL_FEATS_BOTH) + (_ORIGIN_FEATS_2024 if _edition(edition) == '2024' else []) + (_GENERAL_FEATS_2024_ONLY if _edition(edition) == '2024' else [])


def subclasses_for(class_name: str) -> List[str]:
    return list(_CLASS_SUBCLASSES.get(class_name, []))


def spell_selection_mode(class_name: str, edition: str = '2014') -> str:
    """Return the persistent spell-list model used by a class/edition.

    `known` means level-up choices permanently extend spells_known.
    `prepared` means choices belong in the active prepared list.
    `spellbook` means permanent additions belong in the Wizard spellbook and the
    prepared list is selected separately from that book.
    """
    if class_name == 'Wizard':
        return 'spellbook'
    if _edition(edition) == '2024' and class_name in _PREPARED_2024_BY_CLASS:
        return 'prepared'
    if class_name in {'Cleric', 'Druid', 'Paladin'}:
        return 'prepared'
    if class_name in {'Bard', 'Ranger', 'Sorcerer', 'Warlock'}:
        return 'known'
    return 'none'


def prepared_spell_change_rule(class_name: str, edition: str = '2014') -> Dict[str, Any]:
    """Describe how an already-prepared list can be changed in 2024 rules.

    This is metadata for the UI; it does not itself rewrite a saved loadout.
    `max_replacements=None` means any number of prepared spells may be changed.
    """
    if _edition(edition) != '2024' or class_name not in _PREPARED_2024_BY_CLASS:
        return {'cadence': 'legacy', 'max_replacements': None}
    if class_name in {'Bard', 'Sorcerer', 'Warlock'}:
        return {'cadence': 'level-up', 'max_replacements': 1}
    if class_name in {'Paladin', 'Ranger'}:
        return {'cadence': 'long-rest', 'max_replacements': 1}
    return {'cadence': 'long-rest', 'max_replacements': None}


def spells_to_learn(class_name: str, current_level: int, target_level: int, edition: str = '2014') -> int:
    """Net permanent spell-list additions for a level transition.

    2024 Bard/Sorcerer/Warlock/Ranger/Paladin and the full prepared casters use
    fixed prepared capacities rather than the old known-spell deltas. Wizard is
    the exception: it still gains two spellbook spells on each Wizard level, so
    its cumulative spellbook table remains valid in both editions.
    """
    if _edition(edition) == '2024' and class_name != 'Wizard':
        return 0
    table = _SPELLS_KNOWN_PROGRESSION.get(class_name)
    if not table:
        return 0
    cur = _table_value(table, current_level)
    nxt = _table_value(table, target_level)
    return max(0, nxt - cur)


def prepared_spell_capacity(class_name: str, level: int, edition: str = '2014') -> int:
    """Return fixed prepared capacity where the edition has a class-table value."""
    if _edition(edition) != '2024':
        return 0
    table = _PREPARED_2024_BY_CLASS.get(class_name)
    return _table_value(table, level) if table else 0


def cantrips_to_learn(class_name: str, current_level: int, target_level: int) -> int:
    table = _CANTRIPS_KNOWN_PROGRESSION.get(class_name)
    if not table:
        return 0
    return max(0, _table_value(table, target_level) - _table_value(table, current_level))


def spells_known_table(class_name: str, edition: str = '2014') -> Dict[int, int]:
    """Public accessor for permanent spells-known progression.

    Wizard is intentionally excluded because its permanent list is a spellbook,
    exposed separately by `spellbook_spells_table`.
    """
    if class_name == 'Wizard':
        return {}
    if _edition(edition) == '2024':
        return {}
    return dict(_SPELLS_KNOWN_PROGRESSION.get(class_name, {}))


def spellbook_spells_table(class_name: str, edition: str = '2014') -> Dict[int, int]:
    """Cumulative class-granted spellbook spells (Wizard only)."""
    del edition  # Wizard class-granted spellbook growth is shared here.
    return dict(_SPELLS_KNOWN_PROGRESSION['Wizard']) if class_name == 'Wizard' else {}


def cantrips_known_table(class_name: str) -> Dict[int, int]:
    """Public accessor for the cantrips-known progression table."""
    return dict(_CANTRIPS_KNOWN_PROGRESSION.get(class_name, {}))


def class_progression_summary(class_name: str, edition: str) -> Dict[str, Any]:
    """All level-up reference data for one class — frontend uses this for the wizard."""
    prepared_table = dict(_PREPARED_2024_BY_CLASS.get(class_name, {})) if _edition(edition) == '2024' else {}
    return {
        'class_name': class_name,
        'edition': _edition(edition),
        'subclasses': subclasses_for(class_name),
        'spell_selection_mode': spell_selection_mode(class_name, edition),
        'prepared_spell_change': prepared_spell_change_rule(class_name, edition),
        'spells_known_table': spells_known_table(class_name, edition),
        'spellbook_spells_table': spellbook_spells_table(class_name, edition),
        'cantrips_known_table': _CANTRIPS_KNOWN_PROGRESSION.get(class_name, {}),
        'prepared_spells_table': prepared_table,
        'origin_feats': feats_for_edition(edition, 'origin'),
        'general_feats': feats_for_edition(edition, 'general'),
    }
