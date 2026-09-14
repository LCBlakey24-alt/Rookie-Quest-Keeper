"""Pure gear helpers shared by inventory grant flows.

Kept separate from the route package so focused route tests can import Grant
logic without importing every application router and optional integration.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid


def safe_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def ability_modifier(score: Any) -> int:
    return (safe_int(score, 10) - 10) // 2


def character_armor_class_with_equipped(character: Dict[str, Any], equipped: Dict[str, Any]) -> int:
    dex_mod = ability_modifier(character.get('dexterity', 10))
    armor = equipped.get('armor') or equipped.get('armour')
    shield = equipped.get('shield')
    base = 10 + dex_mod

    armor_text = f"{str((armor or {}).get('name', '') if isinstance(armor, dict) else armor)} {str((armor or {}).get('type', '') if isinstance(armor, dict) else '')}".lower()
    if armor:
        if 'plate' in armor_text and 'breast' not in armor_text and 'half' not in armor_text:
            base = 18
        elif 'splint' in armor_text:
            base = 17
        elif 'chain mail' in armor_text:
            base = 16
        elif 'scale' in armor_text or 'breastplate' in armor_text:
            base = 14 + min(dex_mod, 2)
        elif 'half plate' in armor_text:
            base = 15 + min(dex_mod, 2)
        elif 'hide' in armor_text:
            base = 12 + min(dex_mod, 2)
        elif 'leather' in armor_text:
            base = 11 + dex_mod
        ac_bonus = safe_int(armor.get('ac_bonus'), 0) if isinstance(armor, dict) else 0
        if ac_bonus and base == 10 + dex_mod:
            base += ac_bonus
    if shield:
        shield_bonus = safe_int(shield.get('ac_bonus'), 0) if isinstance(shield, dict) else 0
        base += max(shield_bonus, 2)
    return base


def infer_equip_slot(item: Dict[str, Any]) -> str:
    explicit_slot = str(item.get('equip_slot') or item.get('equipped_slot') or '').strip()
    if explicit_slot:
        return explicit_slot

    item_type = str(item.get('item_type') or item.get('type') or '').strip().lower()
    name = str(item.get('name') or '').strip().lower()
    text = f"{item_type} {name}"

    if 'shield' in text:
        return 'shield'
    if item_type in {'armor', 'armour'} or any(word in text for word in ['armour', 'armor', 'mail', 'plate', 'leather', 'scale', 'chain', 'hide']):
        return 'armor'
    if any(word in text for word in ['off hand', 'offhand']):
        return 'offHand'
    if item_type in {'weapon', 'magic_item'} or item.get('damage_dice') or item.get('attack_bonus') or any(word in text for word in ['sword', 'bow', 'crossbow', 'axe', 'mace', 'staff', 'dagger', 'spear', 'lance', 'hammer', 'rapier', 'club', 'flail', 'halberd', 'pike', 'trident', 'whip']):
        return 'mainHand'
    if item.get('ac_bonus'):
        return 'armor'
    return ''


def equipped_aliases(slot: str) -> List[str]:
    if slot == 'mainHand':
        return ['mainHand', 'main_hand', 'weapon']
    if slot == 'offHand':
        return ['offHand', 'off_hand']
    if slot == 'armor':
        return ['armor', 'armour']
    if slot:
        return [slot]
    return []


def item_inventory_entry(item: Dict[str, Any], recipient_name: str = '', auto_attune: bool = False, auto_equip: bool = False) -> Dict[str, Any]:
    requires_attunement = bool(item.get('attunement_required', False) or item.get('requires_attunement', False))
    equipped_slot = infer_equip_slot(item) if auto_equip else ''
    return {
        'id': str(uuid.uuid4()),
        'name': item.get('name', 'Unknown Item'),
        'quantity': item.get('quantity', 1),
        'item_type': item.get('item_type', 'misc'),
        'type': item.get('item_type', 'misc'),
        'description': item.get('description', ''),
        'value': item.get('value', ''),
        'weight': item.get('weight', 0),
        'is_magical': item.get('is_magical', False),
        'attunement_required': requires_attunement,
        'requires_attunement': requires_attunement,
        'attuned': bool(auto_attune and requires_attunement),
        'attuned_to': recipient_name if auto_attune and requires_attunement else '',
        'equipped': bool(equipped_slot),
        'is_equipped': bool(equipped_slot),
        'equipped_slot': equipped_slot,
        'ready_to_use': bool(equipped_slot or (auto_attune and requires_attunement)),
        'notes': item.get('notes', ''),
        'attack_bonus': item.get('attack_bonus', 0),
        'ac_bonus': item.get('ac_bonus', 0),
        'damage_dice': item.get('damage_dice', ''),
        'damage_type': item.get('damage_type', ''),
        'properties': item.get('properties', []),
        'equip_slot': equipped_slot or item.get('equip_slot', ''),
        'image_url': item.get('image_url', ''),
        'granted_from_party': True,
        'granted_at': datetime.now(timezone.utc).isoformat(),
        'equipped_at': datetime.now(timezone.utc).isoformat() if equipped_slot else '',
    }


def build_npc_attack_from_item(item: Dict[str, Any], npc: Dict[str, Any]) -> Optional[Dict[str, str]]:
    damage_dice = str(item.get('damage_dice') or '').strip()
    damage_type = str(item.get('damage_type') or '').strip()
    item_type = str(item.get('item_type') or item.get('type') or '').strip().lower()
    if not damage_dice and item_type not in {'weapon', 'magic_item'}:
        return None

    attack_bonus = safe_int(item.get('attack_bonus'), safe_int(npc.get('proficiency_bonus'), 2))
    damage = damage_dice or '1d4'
    if damage_type:
        damage = f"{damage} {damage_type}"

    notes = []
    if item.get('notes'):
        notes.append(str(item.get('notes')))
    if item.get('description'):
        notes.append(str(item.get('description')))
    if item.get('is_magical'):
        notes.append('Magical weapon')

    return {
        'name': item.get('name', 'Equipped Weapon'),
        'bonus': f"+{attack_bonus}" if attack_bonus >= 0 else str(attack_bonus),
        'damage': damage,
        'notes': ' · '.join(notes)[:300],
    }


def merge_npc_attack(attacks: List[Dict[str, Any]], new_attack: Optional[Dict[str, str]]) -> List[Dict[str, Any]]:
    if not new_attack:
        return attacks
    filtered = [
        attack for attack in attacks
        if str(attack.get('name', '')).lower() != str(new_attack.get('name', '')).lower()
    ]
    return [new_attack, *filtered]
