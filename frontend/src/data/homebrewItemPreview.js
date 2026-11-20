/**
 * "How it looks on your sheet": puts a homebrew item on a sample character
 * and asks the sheet's own derivations for the attack row and AC, so the
 * preview cannot drift from what the real sheet shows.
 */
import { getEquippedWeaponAttack } from '@/components/clean-sheet/cleanCombatTabUtils';
import { deriveArmorClass } from '@/data/characterCombatDerivations';
import { sheetEffectLines } from '@/data/homebrewItemModel';

export const DEFAULT_SAMPLE = { strength: 16, dexterity: 14, proficiencyBonus: 2 };

const mod = score => Math.floor(((Number(score) || 10) - 10) / 2);
const signed = n => (n >= 0 ? `+${n}` : `${n}`);

export function sampleCharacter(item, sample = DEFAULT_SAMPLE) {
  const kind = item?.homebrew_kind;
  const equipped = {};
  if (kind === 'weapon') equipped.mainHand = { ...item, equipped: true, proficient: true };
  if (kind === 'armour') equipped.armor = { ...item, equipped: true };
  if (kind === 'shield') equipped.offHand = { ...item, equipped: true };
  return {
    name: 'Sample hero',
    strength: Number(sample.strength) || 10,
    dexterity: Number(sample.dexterity) || 10,
    constitution: 12,
    character_class: 'Fighter',
    level: 1,
    equipped,
    inventory: kind === 'wearable' ? [{ ...item, equipped: true, attuned: true }] : [],
  };
}

export function previewItemOnSheet(item, sample = DEFAULT_SAMPLE) {
  const character = sampleCharacter(item, sample);
  const pb = Number(sample.proficiencyBonus) || 2;
  const str = mod(character.strength);
  const dex = mod(character.dexterity);
  const attack = item?.homebrew_kind === 'weapon'
    ? getEquippedWeaponAttack(character, 'mainHand', str, dex, Math.max(str, dex), pb)
    : null;
  const showsAc = ['armour', 'shield', 'wearable'].includes(item?.homebrew_kind);
  const ac = showsAc ? deriveArmorClass(character, { ignoreStoredAc: true }) : null;
  const acValue = typeof ac === 'object' && ac !== null ? (ac.value ?? ac.ac ?? ac.total) : ac;
  return {
    attack: attack && {
      ...attack,
      toHitText: signed(attack.attackMod),
      toHitNotation: `1d20${attack.attackMod ? signed(attack.attackMod) : ''}`,
      damageNotation: damageNotation(attack.damage),
      versatileNotation: attack.versatileDamage ? damageNotation(attack.versatileDamage) : '',
    },
    armourClass: acValue ?? null,
    unarmouredAc: 10 + dex,
    effects: sheetEffectLines(item),
  };
}

export function damageNotation(damage) {
  if (!damage) return '';
  const base = damage.sides === 1 ? `${damage.count}` : `${damage.count}d${damage.sides}`;
  return damage.modifier ? `${base}${signed(damage.modifier)}` : base;
}
