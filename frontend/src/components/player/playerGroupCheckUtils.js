const SKILL_ABILITIES = {
  acrobatics: 'dexterity',
  'animal handling': 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  'sleight of hand': 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

const ABILITY_ALIASES = {
  strength: 'strength', str: 'strength',
  dexterity: 'dexterity', dex: 'dexterity',
  constitution: 'constitution', con: 'constitution',
  intelligence: 'intelligence', int: 'intelligence',
  wisdom: 'wisdom', wis: 'wisdom',
  charisma: 'charisma', cha: 'charisma',
};

const clean = value => String(value || '').trim().toLowerCase();
const list = value => Array.isArray(value) ? value.filter(Boolean) : [];

export function groupCheckIdentityKeys(value = {}) {
  return new Set([
    value.id,
    value.character_id,
    value.characterId,
    value.player_id,
    value.playerId,
    value.user_id,
    value.userId,
    value.name,
    value.character_name,
    value.characterName,
    value.display_name,
    value.displayName,
    value.player_name,
    value.playerName,
    value.actor,
  ].map(clean).filter(Boolean));
}

export function groupCheckIdentitiesOverlap(left = {}, right = {}) {
  const leftKeys = groupCheckIdentityKeys(left);
  const rightKeys = groupCheckIdentityKeys(right);
  for (const key of leftKeys) if (rightKeys.has(key)) return true;
  return false;
}

export function findTargetedCharacter(characters = [], payload = {}) {
  const party = list(payload.party);
  if (!party.length) return null;
  return list(characters).find(character => party.some(target => groupCheckIdentitiesOverlap(character, target))) || null;
}

export function findGroupCheckResult(character, payload = {}) {
  if (!character) return null;
  return list(payload.results).find(result => groupCheckIdentitiesOverlap(character, result)) || null;
}

export function proficiencyBonus(character = {}) {
  const explicit = Number(character.proficiency_bonus);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return 2 + Math.floor((Math.max(1, Number(character.level) || 1) - 1) / 4);
}

export function abilityKeyForCheck(payload = {}) {
  const check = clean(payload.check_name || payload.title).replace(/\s+check$/, '');
  if (SKILL_ABILITIES[check]) return SKILL_ABILITIES[check];
  const ability = clean(payload.ability);
  return ABILITY_ALIASES[ability] || ABILITY_ALIASES[ability.slice(0, 3)] || '';
}

function abilityScore(character = {}, ability = '') {
  if (!ability) return 10;
  const direct = Number(character[ability]);
  if (Number.isFinite(direct)) return direct;
  const nested = Number(character.stats?.[ability] ?? character.abilities?.[ability]?.score ?? character.abilities?.[ability]);
  return Number.isFinite(nested) ? nested : 10;
}

function hasNamedChoice(values, name) {
  const target = clean(name);
  return list(values).some(value => clean(typeof value === 'string' ? value : value?.name || value?.skill) === target);
}

export function modifierForGroupCheck(character = {}, payload = {}) {
  const ability = abilityKeyForCheck(payload);
  const base = Math.floor((abilityScore(character, ability) - 10) / 2);
  const checkName = clean(payload.check_name || payload.title).replace(/\s+check$/, '');
  if (!SKILL_ABILITIES[checkName]) return { ability, modifier: base, proficient: false, expertise: false };

  const proficient = hasNamedChoice(character.skill_proficiencies || character.skills_proficient || character.proficiencies?.skills, checkName);
  const expertise = hasNamedChoice(character.expertise || character.expertise_choices, checkName);
  const proficiency = proficiencyBonus(character);
  const modifier = base + (proficient ? proficiency : 0) + (expertise ? proficiency : 0);
  return { ability, modifier, proficient, expertise };
}

export function formatSigned(value = 0) {
  const numeric = Number(value) || 0;
  return numeric >= 0 ? `+${numeric}` : `${numeric}`;
}
