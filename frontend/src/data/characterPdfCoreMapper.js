/**
 * Page-1 field values for Rookie Quest Keeper's editable character PDFs.
 * Draft, not routed into the live application (#906).
 *
 * The caller MUST already have checked access to this character.
 * Attack profiles are passed in from the site's existing combat rules;
 * this mapper must not independently invent weapon modifiers.
 */
import { mod, fmt, parseHitDie, getMaxHp, getCurrentHp, getTempHp } from '@/components/clean-sheet/cleanSheetUtils';
import { deriveArmorClass, deriveWalkingSpeed } from '@/data/characterCombatDerivations';
import { getInitiativeModifier } from '@/data/initiativeRules';
import { skillModifier, passiveScore } from '@/data/skillModifiers';

const ABILITIES = [
  ['str', 'strength'], ['dex', 'dexterity'], ['con', 'constitution'],
  ['int', 'intelligence'], ['wis', 'wisdom'], ['cha', 'charisma'],
];
const SKILLS = [
  ['acrobatics', 'Acrobatics', 'dexterity'], ['animal_handling', 'Animal Handling', 'wisdom'],
  ['arcana', 'Arcana', 'intelligence'], ['athletics', 'Athletics', 'strength'],
  ['deception', 'Deception', 'charisma'], ['history', 'History', 'intelligence'],
  ['insight', 'Insight', 'wisdom'], ['intimidation', 'Intimidation', 'charisma'],
  ['investigation', 'Investigation', 'intelligence'], ['medicine', 'Medicine', 'wisdom'],
  ['nature', 'Nature', 'intelligence'], ['perception', 'Perception', 'wisdom'],
  ['performance', 'Performance', 'charisma'], ['persuasion', 'Persuasion', 'charisma'],
  ['religion', 'Religion', 'intelligence'], ['sleight_of_hand', 'Sleight of Hand', 'dexterity'],
  ['stealth', 'Stealth', 'dexterity'], ['survival', 'Survival', 'wisdom'],
];
const asArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const nameOf = (value) => typeof value === 'string'
  ? value : String(value?.name || value?.title || '');
const includesName = (values, name) => asArray(values).some(
  (entry) => nameOf(entry).trim().toLowerCase() === name.toLowerCase(),
);
const nonempty = (value) => value !== null && value !== undefined && value !== '';
const editionOf = (character) => String(
  character.rules_edition || character.edition || character.ruleset_id || '',
).includes('2024') ? '2024' : '2014';
const maxCharacters = (key) => {
  if (key === 'identity.name') return 36;
  if (key === 'identity.class') return 33;
  if (/^attacks\.\d+\.name$/.test(key)) return 28;
  if (/^attacks\.\d+\.damage$/.test(key)) return 26;
  if (/^attacks\.\d+\.range$/.test(key)) return 14;
  return 55;
};
const asText = (value) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()
  : String(value);
const bonus = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? fmt(number) : String(value);
};

/**
 * @param {object} character Already-authorised character record.
 * @param {object} options { edition, playerName, attacks, quickActions }
 * @returns {{edition:string, values:object, overflow:Array, warnings:Array, exportReady:boolean}}
 */
export function mapCharacterPageOne(character, options = {}) {
  if (!character || typeof character !== 'object' || Array.isArray(character)) {
    throw new TypeError('A character object is required');
  }
  const edition = editionOf(character);
  if (options.edition && options.edition !== edition) {
    throw new Error('Character edition does not match chosen PDF edition');
  }
  const values = {}, overflow = [], warnings = [];
  const put = (key, value) => {
    if (!nonempty(value)) return;
    if (typeof value === 'boolean') { values[key] = value; return; }
    const clean = asText(value);
    if (clean.length > maxCharacters(key)) {
      overflow.push({ field: key, value: clean });
      return;
    }
    values[key] = clean;
  };
  put('identity.name', character.name);
  put('identity.class', [
    character.character_class || character.class_name || '',
    character.subclass || '',
  ].filter(Boolean).join(' / '));
  put('identity.level', character.level);
  put('identity.player', options.playerName ?? character.player_name);
  put('identity.species', character.species || character.race);
  put('identity.background', nameOf(character.background));
  put('identity.alignment', character.alignment);
  put('identity.xp', character.experience_points ?? character.xp);
  put('identity.languages', asArray(character.languages).map(nameOf).join(', '));
  put('identity.training', asArray(character.tool_proficiencies).map(nameOf).join(', '));

  const level = Number(character.level);
  const prof = Number(character.proficiency_bonus)
    || (Number.isFinite(level) && level >= 1 ? 2 + Math.floor((level - 1) / 4) : null);
  const saveProfs = character.saving_throw_proficiencies;
  ABILITIES.forEach(([abbr, full]) => {
    const score = character[full];
    if (!nonempty(score) || !Number.isFinite(Number(score))) return;
    const modifier = mod(score);
    const proficient = includesName(saveProfs, full) || includesName(saveProfs, abbr);
    put('abilities.' + abbr + '.score', score);
    put('abilities.' + abbr + '.modifier', fmt(modifier));
    put('abilities.' + abbr + '.save_bonus', bonus(modifier + (proficient && prof ? prof : 0)));
    if (proficient) put('abilities.' + abbr + '.save_proficient', true);
  });
  if (prof !== null) put('combat.proficiency_bonus', fmt(prof));

  SKILLS.forEach(([key, label, ability]) => {
    if (!nonempty(character[ability]) || prof === null) return;
    const result = skillModifier(character, label, ability, prof);
    put('skills.' + key + '.bonus', bonus(result.modifier));
    if (result.proficient) put('skills.' + key + '.proficient', true);
    if (result.expertise) put('skills.' + key + '.expertise', true);
  });
  if (prof !== null) {
    put('combat.passive_perception', passiveScore(character, 'Perception', 'wisdom', prof));
    put('combat.passive_insight', passiveScore(character, 'Insight', 'wisdom', prof));
  }

  // Existing live rules helpers, not guessed AC, Speed or Initiative values.
  put('combat.ac', deriveArmorClass(character));
  put('combat.speed', deriveWalkingSpeed(character));
  put('combat.initiative', bonus(getInitiativeModifier(character)));
  put('combat.max_hp', getMaxHp(character));
  put('combat.current_hp', getCurrentHp(character));
  put('combat.temp_hp', getTempHp(character));
  put('combat.spell_save_dc', character.spell_save_dc);
  if (nonempty(character.spell_attack_bonus)) {
    put('combat.spell_attack_bonus', bonus(character.spell_attack_bonus));
  }

  // A single type on page 1 is insufficient for multiple class Hit Die types.
  const rawDice = String(character.hit_dice || '');
  const groups = [...rawDice.matchAll(/(\d+)d(\d+)/gi)];
  if (groups.length > 1) {
    warnings.push('Multiclass Hit Dice require a per-die-type continuation.');
    overflow.push({ field: 'combat.hit_dice.type', value: rawDice });
  } else if (groups.length === 1) {
    const parsed = parseHitDie(rawDice);
    put('combat.hit_dice.type', 'd' + parsed.sides);
    put('combat.hit_dice.total', parsed.total);
  } else {
    warnings.push('Hit Die type is not set; do not assume d8.');
  }
  put('combat.hit_dice.remaining', character.hit_dice_remaining);
  ['success', 'failure'].forEach((kind) => {
    const count = Math.max(0, Math.min(3, Number(character[
      kind === 'success' ? 'death_saves_successes' : 'death_saves_failures'
    ]) || 0));
    for (let n = 1; n <= count; n += 1) {
      put('combat.death_saves.' + kind + '.' + n, true);
    }
  });
  const exhaustion = Math.max(0, Math.min(6, Number(character.exhaustion_level) || 0));
  for (let n = 1; n <= exhaustion; n += 1) {
    put('combat.exhaustion.level.' + n, true);
  }
  if (character.inspiration || character.has_inspiration) put('combat.inspiration', true);
  put('combat.conditions', asArray(character.conditions).map(nameOf).join(', '));

  // Attack values must come from gatherEquippedWeapons or the current combat
  // engine; a raw inventory item's dice is not an authoritative attack profile.
  const attacks = asArray(options.attacks);
  attacks.slice(0, 5).forEach((attack, i) => {
    const prefix = 'attacks.' + (i + 1) + '.';
    put(prefix + 'name', attack.title || attack.name);
    if (nonempty(attack.attackMod)) put(prefix + 'attack_bonus', bonus(attack.attackMod));
    put(prefix + 'damage', attack.damageText);
    put(prefix + 'range', attack.range);
  });
  if (attacks.length > 5) {
    overflow.push({ field: 'attacks', value: attacks.slice(5) });
  }
  if (!attacks.length) warnings.push('No validated attack profiles supplied.');
  for (const key of ['action', 'bonus_action', 'reaction']) {
    put('combat.quick.' + key, options.quickActions?.[key]);
  }
  return { edition, values, overflow, warnings, exportReady: overflow.length === 0 };
}
