"""Armour Class from equipment, the same calculation the frontend uses
(frontend/src/data/armorRules5e.js, characterCombatDerivations.deriveArmorClass
and equipmentLoadout.wornMagicAcBonus), so GM auto-equip and a player's own
equipment save give identical AC for identical equipment. SRD armour only.
"""
import re
from typing import Any, Dict, Optional

ARMOR_RULES: Dict[str, Dict[str, Any]] = {
    'Padded': {'category': 'light', 'base': 11},
    'Leather': {'category': 'light', 'base': 11},
    'StuddedLeather': {'name': 'Studded Leather', 'category': 'light', 'base': 12},
    'Hide': {'category': 'medium', 'base': 12},
    'ChainShirt': {'name': 'Chain Shirt', 'category': 'medium', 'base': 13},
    'ScaleMail': {'name': 'Scale Mail', 'category': 'medium', 'base': 14},
    'Breastplate': {'category': 'medium', 'base': 14},
    'HalfPlate': {'name': 'Half Plate', 'category': 'medium', 'base': 15},
    'RingMail': {'name': 'Ring Mail', 'category': 'heavy', 'base': 14},
    'ChainMail': {'name': 'Chain Mail', 'category': 'heavy', 'base': 16},
    'Splint': {'category': 'heavy', 'base': 17},
    'Plate': {'category': 'heavy', 'base': 18},
    'Shield': {'category': 'shield', 'bonus': 2},
}

KNOWN_AC_ITEMS = {'ring of protection': 1, 'cloak of protection': 1, 'bracers of defense': 2, 'bracers of defence': 2}
WORN_ACCESSORY_SLOTS = ['head', 'neck', 'shoulders', 'gauntlets', 'wrists', 'waist', 'boots', 'ring1', 'ring2']


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _mod(score: Any) -> int:
    return (_int(score, 10) - 10) // 2


def _norm(value: Any) -> str:
    return re.sub(r'[^a-z0-9]', '', str(value or '').lower())


def _name(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get('name') or item.get('item_name') or item.get('label') or item.get('title') or '')
    return str(item or '')


def find_armor_rule(item: Any) -> Optional[Dict[str, Any]]:
    entries = list(ARMOR_RULES.items())
    if isinstance(item, dict):
        explicit = _norm(item.get('armor_key') or item.get('armorKey') or item.get('armor_type') or item.get('armorType') or item.get('base_armor') or item.get('baseArmor'))
        if explicit:
            for key, rule in entries:
                if explicit in (_norm(key), _norm(rule.get('name', key))):
                    return {'key': key, **rule}
    name = _norm(_name(item))
    if not name:
        return None
    for key, rule in entries:
        if _norm(rule.get('name', key)) == name:
            return {'key': key, **rule}
    contained = [(key, rule) for key, rule in entries if _norm(rule.get('name', key)) in name]
    contained.sort(key=lambda pair: len(_norm(pair[1].get('name', pair[0]))), reverse=True)
    return {'key': contained[0][0], **contained[0][1]} if contained else None


def _extra_bonus(item: Any, rule: Optional[Dict[str, Any]]) -> int:
    if not isinstance(item, dict):
        return 0
    for key in ('magic_ac_bonus', 'magicAcBonus', 'enhancement_bonus', 'enhancementBonus'):
        if item.get(key) not in (None, ''):
            return _int(item.get(key), 0)
    match = re.search(r'(?:^|\s)\+(\d+)\b', _name(item))
    if match:
        return int(match.group(1))
    stored = _int(item.get('ac_bonus', item.get('acBonus', 0)), 0)
    if rule and rule.get('category') == 'shield' and stored == rule.get('bonus', 2):
        return 0
    return stored


def _is_shield(item: Any) -> bool:
    if not item:
        return False
    text = _name(item).lower()
    if isinstance(item, dict):
        text += f" {item.get('type', '')} {item.get('category', '')} {item.get('item_type', '')}".lower()
    rule = find_armor_rule(item)
    return 'shield' in text or bool(rule and rule.get('category') == 'shield')


def _class_level(character: Dict[str, Any], class_name: str) -> int:
    want = class_name.lower()
    levels = character.get('class_levels') or character.get('multiclass_levels') or {}
    if isinstance(levels, dict) and levels:
        return next((_int(level, 0) for name, level in levels.items() if str(name).lower() == want), 0)
    classes = character.get('classes') if isinstance(character.get('classes'), list) else []
    if classes:
        return next((_int(entry.get('level') or entry.get('class_level'), 0) for entry in classes
                     if isinstance(entry, dict) and str(entry.get('name') or entry.get('class_name') or '').lower() == want), 0)
    primary = str(character.get('character_class') or character.get('class_name') or '').lower()
    return max(1, _int(character.get('level'), 1)) if primary == want else 0


def _has_defense_style(character: Dict[str, Any]) -> bool:
    styles = list(character.get('fighting_styles') or []) + [character.get('fighting_style')]
    names = {str((style or {}).get('name') if isinstance(style, dict) else style or '').strip().lower() for style in styles}
    return bool(names & {'defense', 'defence'})


def worn_magic_ac_bonus(equipped: Dict[str, Any]) -> int:
    wearing_armour = bool(equipped.get('armor') or equipped.get('armour'))
    holding_shield = any(_is_shield(equipped.get(slot)) for slot in ('offHand', 'off_hand', 'shield'))
    total = 0
    for slot in WORN_ACCESSORY_SLOTS:
        item = equipped.get(slot)
        if not isinstance(item, dict):
            continue
        if (item.get('attunement_required') or item.get('requires_attunement')) and not (item.get('attuned') or item.get('is_attuned')):
            continue
        name = _name(item).lower()
        if re.search(r'bracers of defen[cs]e', name) and (wearing_armour or holding_shield):
            continue
        total += _int(item.get('ac_bonus', item.get('acBonus', KNOWN_AC_ITEMS.get(name, 0))), 0)
    return total


def armor_class_from_equipment(character: Dict[str, Any], equipped: Dict[str, Any]) -> int:
    """AC for these equipped items, ignoring any stored AC."""
    equipped = equipped or {}
    dex = _mod(character.get('dexterity', 10))
    armor = equipped.get('armor') or equipped.get('armour')
    off_hand = equipped.get('offHand') or equipped.get('off_hand')
    shield = equipped.get('shield') or (off_hand if _is_shield(off_hand) else None)

    unarmored = 10 + dex
    if _class_level(character, 'monk') > 0 and not armor and not shield:
        unarmored = max(unarmored, 10 + dex + _mod(character.get('wisdom', 10)))
    if _class_level(character, 'barbarian') > 0 and not armor:
        unarmored = max(unarmored, 10 + dex + _mod(character.get('constitution', 10)))
    defense = 1 if armor and _has_defense_style(character) else 0

    armor_rule = find_armor_rule(armor)
    shield_rule = find_armor_rule(shield)
    if not armor_rule and not shield_rule:
        armor_bonus = _int(armor.get('ac_bonus', 0), 0) if isinstance(armor, dict) else 0
        shield_bonus = max(_int(shield.get('ac_bonus', 0), 0), 2) if isinstance(shield, dict) else 0
        return unarmored + armor_bonus + shield_bonus + defense + worn_magic_ac_bonus(equipped)

    ac = unarmored
    category = (armor_rule or {}).get('category')
    if category == 'light':
        ac = armor_rule['base'] + dex
    elif category == 'medium':
        ac = armor_rule['base'] + min(2, dex)
    elif category == 'heavy':
        ac = armor_rule['base']
    if shield_rule and shield_rule.get('category') == 'shield':
        ac += shield_rule.get('bonus', 2)
    ac += _extra_bonus(armor, armor_rule) + _extra_bonus(shield, shield_rule)
    return ac + defense + worn_magic_ac_bonus(equipped)
