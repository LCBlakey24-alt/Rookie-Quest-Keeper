import { CLASSES, RACES, BACKGROUNDS, HIT_DICE, getProficiencyBonus } from './characterRules5e';
import { SPELLCASTING_CLASSES, getSpellSlotsForCaster, getSpellsForClass } from './spellDatabase';

const ABILITIES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const choiceText = value => String(value || '').toLowerCase().includes('choice') || String(value || '').toLowerCase().includes('additional');
const mod = score => Math.floor((Number(score || 10) - 10) / 2);
const toFeature = (name, description = '') => ({ name: String(name), description: description || `${name}` });
const toSpell = spell => typeof spell === 'string' ? { name: spell } : spell;
const spellName = spell => String(toSpell(spell).name || '').toLowerCase();

const ARMOUR_RULES = {
  padded: { name: 'Padded Armor', base: 11, type: 'light' },
  leather: { name: 'Leather Armor', base: 11, type: 'light' },
  studded_leather: { name: 'Studded Leather Armor', base: 12, type: 'light' },
  hide: { name: 'Hide Armor', base: 12, type: 'medium' },
  chain_shirt: { name: 'Chain Shirt', base: 13, type: 'medium' },
  scale_mail: { name: 'Scale Mail', base: 14, type: 'medium' },
  breastplate: { name: 'Breastplate', base: 14, type: 'medium' },
  half_plate: { name: 'Half Plate', base: 15, type: 'medium' },
  ring_mail: { name: 'Ring Mail', base: 14, type: 'heavy' },
  chain_mail: { name: 'Chain Mail', base: 16, type: 'heavy' },
  splint: { name: 'Splint Armor', base: 17, type: 'heavy' },
  plate: { name: 'Plate Armor', base: 18, type: 'heavy' },
};

const EQUIPMENT_PICK_PRESETS = {
  chain_mail: { armor: 'chain_mail', shield: true, items: ['Chain Mail', 'Shield', 'Longsword'] },
  sword_and_board: { armor: 'chain_mail', shield: true, items: ['Chain Mail', 'Shield', 'Longsword'] },
  leather: { armor: 'leather', shield: false, items: ['Leather Armor', 'Dagger'] },
  studded_leather: { armor: 'studded_leather', shield: false, items: ['Studded Leather Armor', 'Shortsword'] },
};

export function calculateAbilityModifier(score = 10) {
  return mod(score);
}

export function calculateLevelOneHp(className = '', constitution = 10) {
  return Math.max(1, (HIT_DICE[className] || CLASSES[className]?.hitDie || 8) + mod(constitution));
}

export function calculateArmorClass({ dexterity = 10, wisdom = 10, constitution = 10, className = '', armorKey = '', shield = false, fightingStyle = '' } = {}) {
  const dexMod = mod(dexterity);
  const armour = ARMOUR_RULES[armorKey];
  let ac = 10 + dexMod;

  if (armour) {
    if (armour.type === 'light') ac = armour.base + dexMod;
    else if (armour.type === 'medium') ac = armour.base + Math.min(2, dexMod);
    else ac = armour.base;
  } else if (className === 'Monk') {
    ac = 10 + dexMod + mod(wisdom);
  } else if (className === 'Barbarian') {
    ac = 10 + dexMod + mod(constitution);
  }

  if (shield) ac += 2;
  if (armorKey && String(fightingStyle).toLowerCase() === 'defense') ac += 1;
  return ac;
}

function deriveLanguages(raceData = {}, backgroundData = {}) {
  const languages = new Set((raceData.languages || []).filter(language => !choiceText(language)));
  const choiceCount = (raceData.languages || []).filter(choiceText).length + (Number(backgroundData.languages || 0) || 0);
  const fallback = ['Common', 'Elvish', 'Dwarvish', 'Halfling', 'Draconic'];
  fallback.forEach(language => {
    if (languages.size < Math.max(1, choiceCount + (languages.has('Common') ? 0 : 1))) languages.add(language);
  });
  return Array.from(languages);
}

function deriveTraits(raceData = {}, subrace = '') {
  const traits = [...(raceData.traits || []), ...(raceData.subraces?.[subrace]?.traits || [])];
  return traits.map(trait => ({ name: String(trait).split(' (')[0], description: String(trait) }));
}

function deriveClassFeatures(classData = {}, className = '', level = 1, template = {}) {
  const features = [];
  for (let current = 1; current <= Number(level || 1); current += 1) {
    (classData.features?.[current] || []).filter(name => name && name !== '---').forEach(name => {
      features.push(toFeature(name, `${className} feature gained at level ${current}.`));
    });
  }
  if (template.fighting_style) features.push(toFeature(`Fighting Style: ${template.fighting_style}`, 'Fighting style selected by this premade hero.'));
  if (template.expertise?.length) features.push(toFeature('Expertise', `Expertise in ${template.expertise.join(', ')}.`));
  return features;
}

function deriveEquipment(template = {}, classData = {}, backgroundData = {}) {
  const pick = EQUIPMENT_PICK_PRESETS[template.equipment_pick] || {};
  const starting = [...(pick.items || []), ...(template.starting_equipment || []), ...(classData.startingEquipment || []), ...(backgroundData.equipment || [])];
  const deduped = Array.from(new Set(starting.filter(Boolean)));
  const equipment = deduped.map(name => ({ name, equipped: pick.items?.includes(name) || false }));
  const equipped = {
    armor: pick.armor ? { name: ARMOUR_RULES[pick.armor]?.name || pick.armor, key: pick.armor } : null,
    shield: pick.shield ? { name: 'Shield', equipped: true } : null,
    mainHand: pick.items?.find(item => !String(item).toLowerCase().includes('armor') && item !== 'Shield') || null,
    offHand: pick.shield ? 'Shield' : null,
  };
  return { armorKey: pick.armor || '', shield: Boolean(pick.shield), starting_equipment: deduped, equipment, inventory: equipment, equipped };
}

function uniqueSpells(spells = []) {
  const seen = new Set();
  return spells
    .map(toSpell)
    .filter(spell => {
      const key = spellName(spell);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function classifySpellPlanRole(spell = {}) {
  const text = `${spell.name || ''} ${spell.description || ''} ${spell.school || ''}`.toLowerCase();
  if (/heal|cure|restore|restoration|berry|spare/.test(text)) return 'healing';
  if (/bolt|blast|burn|fire|flame|thunder|lightning|ray|wound|damage|missile|smite/.test(text)) return 'power';
  if (/bless|faith|shield|protect|ward|detect|identify|charm|command|fog|entangle|faerie|sleep|sanctuary/.test(text)) return 'support';
  return 'support';
}

function spellPoolForPreparedCaster(className = '', level = 1, template = {}) {
  const slots = getSpellSlotsForCaster(SPELLCASTING_CLASSES[className], Number(level || 1));
  const maxSpellLevel = Math.max(0, ...Object.keys(slots || {}).map(Number));
  const templatePool = uniqueSpells([...(template.spells_prepared || []), ...(template.spells_known || [])]);
  if (templatePool.length) return templatePool;
  if (!maxSpellLevel) return [];

  const spellsByLevel = getSpellsForClass(className);
  const spells = [];
  for (let spellLevel = 1; spellLevel <= maxSpellLevel; spellLevel += 1) {
    spells.push(...(spellsByLevel[spellLevel] || []));
  }
  return uniqueSpells(spells);
}

function preparedSpellLimit(className = '', level = 1, abilities = {}) {
  const classInfo = SPELLCASTING_CLASSES[className];
  if (!classInfo || classInfo.type !== 'prepared') return 0;
  if (classInfo.halfCaster && Number(level || 1) < 2) return 0;
  const ability = classInfo.ability;
  return Math.max(1, Number(level || 1) + mod(abilities[ability]));
}

function fillSpellPlan(primary = [], fallback = [], target = 1) {
  return uniqueSpells([...primary, ...fallback]).slice(0, Math.max(1, target));
}

export function buildRookSpellLoadoutsForTemplate(template = {}) {
  const className = template.character_class || '';
  const classInfo = SPELLCASTING_CLASSES[className];
  if (!classInfo || classInfo.type !== 'prepared') return [];

  const level = Number(template.level || 1);
  const abilities = ABILITIES.reduce((scores, ability) => ({ ...scores, [ability]: template.ability_scores?.[ability] ?? 10 }), {});
  const target = preparedSpellLimit(className, level, abilities);
  if (!target) return [];

  const pool = spellPoolForPreparedCaster(className, level, template);
  if (!pool.length) return [];

  const byRole = pool.reduce((roles, spell) => {
    const role = classifySpellPlanRole(spell);
    return { ...roles, [role]: [...(roles[role] || []), spell] };
  }, { healing: [], power: [], support: [] });

  const balanced = [];
  const queues = [byRole.healing, byRole.power, byRole.support].map(queue => [...queue]);
  let queueIndex = 0;
  while (balanced.length < target && queues.some(queue => queue.length)) {
    const queue = queues[queueIndex % queues.length];
    if (queue.length) balanced.push(queue.shift());
    queueIndex += 1;
  }

  return [
    {
      id: 'rook-balanced',
      label: 'Balanced',
      description: 'A natural Rook mix of healing, power, and support for a first adventuring day.',
      spells: fillSpellPlan(balanced, pool, target),
    },
    {
      id: 'rook-healing',
      label: 'Healing',
      description: 'Keeps allies standing first, then fills gaps with useful support.',
      spells: fillSpellPlan(byRole.healing, [...byRole.support, ...byRole.power, ...pool], target),
    },
    {
      id: 'rook-power',
      label: 'Power',
      description: 'Prioritises direct impact and combat pressure with backup utility.',
      spells: fillSpellPlan(byRole.power, [...byRole.support, ...byRole.healing, ...pool], target),
    },
    {
      id: 'rook-support',
      label: 'Support',
      description: 'Focuses on buffs, protection, information, and control.',
      spells: fillSpellPlan(byRole.support, [...byRole.healing, ...byRole.power, ...pool], target),
    },
  ].filter(loadout => loadout.spells.length);
}

function resolvePreparedSpells(className = '', level = 1, abilities = {}, template = {}, options = {}) {
  if (options.customPreparedSpells?.length) return uniqueSpells(options.customPreparedSpells);
  if (options.spellLoadoutId === 'prepare-later') return [];
  const templatePrepared = uniqueSpells(template.spells_prepared || []);
  if (templatePrepared.length) return templatePrepared;
  const loadouts = buildRookSpellLoadoutsForTemplate(template);
  const selected = loadouts.find(loadout => loadout.id === options.spellLoadoutId) || loadouts[0];
  return selected?.spells || [];
}

function deriveSpellFields(className = '', level = 1, abilities = {}, template = {}, options = {}) {
  const classInfo = SPELLCASTING_CLASSES[className];
  const cantrips = (template.cantrips_known || []).map(toSpell);
  const templateKnown = (template.spells_known || []).map(toSpell);
  const preparedSpells = resolvePreparedSpells(className, level, abilities, template, options);
  if (!classInfo && !cantrips.length && !templateKnown.length && !preparedSpells.length) return {};

  const ability = classInfo?.ability || '';
  const abilityMod = ability ? mod(abilities[ability]) : 0;
  const proficiency = getProficiencyBonus(level || 1);
  const slots = classInfo ? getSpellSlotsForCaster(classInfo, Number(level || 1)) : {};

  return {
    spellcasting_ability: ability,
    spell_save_dc: ability ? 8 + proficiency + abilityMod : 0,
    spell_attack_bonus: ability ? proficiency + abilityMod : 0,
    spell_slots: slots,
    spell_slots_remaining: slots,
    cantrips_known: cantrips,
    spells_known: templateKnown,
    spells_prepared: preparedSpells,
    spell_preparation_loadout: options.spellLoadoutId || (preparedSpells.length ? 'rook-balanced' : ''),
  };
}

export function buildCharacterCreationPayloadFromTemplate(template = {}, { name = '', edition = '2014', rulesetId = '', spellLoadoutId = '', customPreparedSpells = [] } = {}) {
  const className = template.character_class || '';
  const raceName = template.race || '';
  const backgroundName = template.background || '';
  const level = Number(template.level || 1);
  const classData = CLASSES[className] || {};
  const raceData = RACES[raceName] || {};
  const backgroundData = BACKGROUNDS[backgroundName] || {};
  const abilities = ABILITIES.reduce((scores, ability) => ({ ...scores, [ability]: template.ability_scores?.[ability] ?? 10 }), {});
  const equipment = deriveEquipment(template, classData, backgroundData);
  const maxHp = template.max_hit_points || template.hit_points || calculateLevelOneHp(className, abilities.constitution);
  const armorClass = template.armor_class || calculateArmorClass({ ...abilities, className, armorKey: equipment.armorKey, shield: equipment.shield, fightingStyle: template.fighting_style });
  const spellFields = deriveSpellFields(className, level, abilities, template, { spellLoadoutId, customPreparedSpells });

  return {
    name: name.trim(),
    creation_mode: 'premade',
    race: raceName,
    subrace: template.subrace || '',
    character_class: className,
    subclass: template.subclass || '',
    background: backgroundName,
    level,
    alignment: template.alignment || 'Neutral',
    edition,
    ruleset_id: rulesetId || template.ruleset_id || (edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014'),
    ...abilities,
    max_hit_points: maxHp,
    current_hit_points: maxHp,
    armor_class: armorClass,
    speed: raceData.subraces?.[template.subrace]?.speed || raceData.speed || 30,
    proficiency_bonus: getProficiencyBonus(level),
    skill_proficiencies: Array.from(new Set([...(backgroundData.skillProficiencies || []), ...(template.skill_proficiencies || [])])),
    saving_throw_proficiencies: classData.savingThrows || [],
    armor_proficiencies: classData.armorProficiencies || [],
    weapon_proficiencies: classData.weaponProficiencies || [],
    tool_proficiencies: backgroundData.toolProficiencies || [],
    languages: template.languages || deriveLanguages(raceData, backgroundData),
    racial_traits: template.racial_traits || deriveTraits(raceData, template.subrace || ''),
    class_features: template.class_features || deriveClassFeatures(classData, className, level, template),
    fighting_style: template.fighting_style || '',
    equipment_choice: template.equipment_pick || template.equipment_choice || '',
    starting_equipment: equipment.starting_equipment,
    equipment: equipment.equipment,
    inventory: equipment.inventory,
    equipped: equipment.equipped,
    currency: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
    conditions: [],
    inspiration: false,
    ...spellFields,
  };
}

export function getCharacterCreationPayloadWarnings(payload = {}) {
  const warnings = [];
  if (!payload.armor_class || payload.armor_class <= 10) warnings.push('Armor Class could not be fully derived; review armour/shield choices.');
  if (!payload.max_hit_points) warnings.push('Hit points could not be derived.');
  if (!payload.starting_equipment?.length) warnings.push('Starting equipment is missing.');
  if (!payload.languages?.length) warnings.push('Languages are missing.');
  if (!payload.racial_traits?.length) warnings.push('Species traits are missing.');
  if (!payload.class_features?.length) warnings.push('Class features are missing.');
  if (!payload.saving_throw_proficiencies?.length) warnings.push('Saving throw proficiencies are missing.');
  return warnings;
}
