import { CORE_CLASS_NAMES, deriveCharacterSnapshot } from './deriveCharacterSnapshot';
import { DEMO_CHARACTER_FIXTURES } from './demoCharacterFixtures';
import {
  classHasSpellcasting,
  getMaxSpellLevel,
  getMulticlassSpellSlots,
  getSpellsForClass,
  SPELLCASTING_CLASSES,
} from './spellDatabase';

const normalizeKey = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const hasKeys = (value = {}) => Object.keys(value || {}).length > 0;

const SPELLCASTER_SUBCLASS_FIXTURES = {
  Fighter: 'Eldritch Knight',
  Rogue: 'Arcane Trickster',
};

const ABILITY_BASELINE = {
  strength: 12,
  dexterity: 14,
  constitution: 14,
  intelligence: 12,
  wisdom: 12,
  charisma: 12,
};

export function getSavedSpells(character = {}) {
  return [
    ...toArray(character.cantrips_known || character.cantrips).map((spell) => ({ ...spell, field: 'cantrips_known' })),
    ...toArray(character.spells_known || character.known_spells).map((spell) => ({ ...spell, field: 'spells_known' })),
    ...toArray(character.spellbook).map((spell) => ({ ...spell, field: 'spellbook' })),
    ...toArray(character.spells_prepared || character.prepared_spells).map((spell) => ({ ...spell, field: 'spells_prepared' })),
  ];
}

export function getEquippedItems(character = {}) {
  return Object.entries(character.equipped || {})
    .filter(([, item]) => Boolean(item))
    .map(([slot, item]) => ({ slot, item }));
}

export function makeAuditCharacter(className, level, overrides = {}) {
  const subclass = overrides.subclass ?? SPELLCASTER_SUBCLASS_FIXTURES[className] ?? '';
  const casterInfo = SPELLCASTING_CLASSES[className];
  const isCasterAtLevel = Boolean(casterInfo) && classHasSpellcasting({ character_class: className, subclass, level }, className);
  const spellSlots = isCasterAtLevel ? getMulticlassSpellSlots({ [className]: level }, { character_class: className, subclass, level }) : null;

  return {
    name: `Audit ${className} L${level}`,
    character_class: className,
    subclass,
    level,
    race: 'Human',
    background: 'Soldier',
    rules_edition: '2014',
    ruleset_id: 'dnd5e_2014',
    ...ABILITY_BASELINE,
    max_hit_points: Math.max(1, 8 + level * 4),
    current_hit_points: Math.max(1, 8 + level * 4),
    armor_class: 12,
    speed: 30,
    proficiency_bonus: 2 + Math.floor((Math.max(1, level) - 1) / 4),
    equipped: {
      mainHand: {
        name: 'Audit Weapon',
        type: 'Weapon',
        damage_dice: '1d6',
        damage_type: 'bludgeoning',
        equip_slot: 'mainHand',
        equipped: true,
      },
    },
    inventory: [{ name: 'Audit Pack', type: 'Gear', quantity: 1 }],
    spell_slots: spellSlots?.slots || (spellSlots?.pactMagic ? { [spellSlots.pactMagic.level]: spellSlots.pactMagic.slots } : {}),
    spell_slots_remaining: spellSlots?.slots || (spellSlots?.pactMagic ? { [spellSlots.pactMagic.level]: spellSlots.pactMagic.slots } : {}),
    ...overrides,
  };
}

export function auditCharacter(character = {}, label = character.name || 'Unnamed character') {
  const problems = [];
  const snapshot = deriveCharacterSnapshot(character);
  const className = snapshot.identity.primaryClass;
  const level = Number(snapshot.identity.level || character.level || 1);
  const spellcasting = snapshot.spellcasting || {};
  const caster = classHasSpellcasting(character, className);
  const savedSpells = getSavedSpells(character);
  const equippedItems = getEquippedItems(character);

  if (!snapshot.identity.name) problems.push(`${label}: missing character name.`);
  if (!CORE_CLASS_NAMES.includes(className)) problems.push(`${label}: ${className} is not a supported core class.`);
  if (level < 1 || level > 20) problems.push(`${label}: level ${level} is outside 1-20.`);
  if (!snapshot.features?.length) problems.push(`${label}: no class features derived.`);
  if (!Number.isFinite(snapshot.proficiencyBonus) || snapshot.proficiencyBonus < 2) problems.push(`${label}: proficiency bonus is missing or too low.`);
  if (Number(character.max_hit_points || character.max_hp || 0) <= 0) problems.push(`${label}: max HP is missing.`);
  if (Number(character.current_hit_points ?? character.hp ?? 0) < 0) problems.push(`${label}: current HP is negative.`);
  if (Number(character.armor_class || 0) <= 0) problems.push(`${label}: armour class is missing.`);

  snapshot.warnings?.forEach((warning) => {
    if (/No playable class|not one of the 12 core|No class features/i.test(warning)) {
      problems.push(`${label}: ${warning}`);
    }
  });

  if (caster) {
    const maxSpellLevel = getMaxSpellLevel(className, level);
    const classSpellList = getSpellsForClass(className);
    const hasClassSpells = Boolean(classSpellList.cantrips?.length || Object.values(classSpellList).some((value) => Array.isArray(value) && value.length));
    const hasSlots = hasKeys(character.spell_slots) || hasKeys(character.spell_slots_remaining) || hasKeys(spellcasting.multiclass?.slots) || Boolean(spellcasting.multiclass?.pactMagic);

    if (!spellcasting.blocks?.length) problems.push(`${label}: expected spellcasting block but none was derived.`);
    if (!hasClassSpells) problems.push(`${label}: no class spell library entries found for ${className}.`);
    if (maxSpellLevel > 0 && !hasSlots) problems.push(`${label}: caster has no spell slot data.`);
    if (savedSpells.length === 0 && level > 0) problems.push(`${label}: caster has no saved spells/cantrips.`);
  } else {
    if (spellcasting.blocks?.length) problems.push(`${label}: non-caster derived spellcasting blocks.`);
  }

  savedSpells.forEach((spell) => {
    const name = typeof spell === 'string' ? spell : spell.name || spell.spell_name;
    if (!name) problems.push(`${label}: saved spell in ${spell.field || 'spell list'} is missing a name.`);
    const spellLevel = Number(spell.level ?? spell.spell_level ?? 0);
    if (spellLevel < 0 || spellLevel > 9) problems.push(`${label}: spell ${name || 'Unknown'} has invalid level ${spellLevel}.`);
  });

  if (!equippedItems.length) problems.push(`${label}: no equipped items found.`);
  equippedItems.forEach(({ slot, item }) => {
    const name = typeof item === 'string' ? item : item?.name || item?.item_name;
    if (!name) problems.push(`${label}: equipped ${slot} item is missing a name.`);
    if (slot === 'mainHand' && typeof item !== 'string') {
      const attackLike = item.damage_dice || item.damage || normalizeKey(item.type).includes('weapon');
      if (!attackLike) problems.push(`${label}: main hand item ${name || 'Unknown'} does not look attackable.`);
    }
  });

  return { label, character, snapshot, problems };
}

export function auditDemoCharacters(fixtures = DEMO_CHARACTER_FIXTURES) {
  return fixtures.map((fixture) => auditCharacter(fixture.character, fixture.slug));
}

export function auditClassProgression(classNames = CORE_CLASS_NAMES, levels = Array.from({ length: 20 }, (_, index) => index + 1)) {
  return classNames.flatMap((className) => levels.map((level) => {
    const character = makeAuditCharacter(className, level);
    return auditCharacter(character, `${className} L${level}`);
  }));
}

export function buildCharacterAuditReport(results = []) {
  const failures = results.filter((result) => result.problems.length > 0);
  const lines = [
    `Character audit checked ${results.length} case${results.length === 1 ? '' : 's'}.`,
    failures.length ? `${failures.length} case${failures.length === 1 ? '' : 's'} need attention.` : 'No character audit problems found.',
  ];

  failures.forEach((failure) => {
    lines.push(`\n${failure.label}`);
    failure.problems.forEach((problem) => lines.push(`- ${problem}`));
  });

  return {
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures,
    text: lines.join('\n'),
  };
}

export function runCharacterAuditSuite() {
  const demoResults = auditDemoCharacters();
  const progressionResults = auditClassProgression();
  const report = buildCharacterAuditReport([...demoResults, ...progressionResults]);

  return {
    demoResults,
    progressionResults,
    report,
  };
}
