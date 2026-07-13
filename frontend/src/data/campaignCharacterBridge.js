const arr = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const num = (...values) => {
  const value = first(...values);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function getCharacterId(value = {}) {
  return value.character_id || value.characterId || value.character?.id || value.id || null;
}

export function getPlayerDisplayName(player = {}) {
  return player.username || player.player_name || player.playerName || player.name || player.email || 'Player';
}

export function getCharacterDisplayName(value = {}) {
  const character = value.character || value;
  return character.name || character.character_name || value.characterName || 'Unnamed Character';
}

export function getCharacterPortrait(value = {}) {
  const character = value.character || value.raw?.character || value.raw || value;
  return first(
    character.image_url,
    character.avatar_url,
    character.portrait_url,
    character.character_image,
    character.character_portrait,
    character.token_url,
    character.thumbnail_url,
    value.image_url,
    value.avatar_url,
    value.portrait_url,
    value.character_image,
    value.character_portrait,
    value.token_url
  ) || '';
}

export function isLinkedCampaignCharacter(value = {}) {
  return Boolean(value.character_id || value.characterId || value.character?.id || value.linked_character_id);
}

export function normalizeCampaignCharacter(value = {}) {
  const character = value.character || value;
  const characterClass = first(character.character_class, character.class_name, character.class, character.characterClass, value.character_class, value.className, value.class) || '';
  const level = num(character.level, value.level, 1) || 1;
  const maxHp = num(character.max_hit_points, character.max_hp, character.hp_max, character.maxHp, value.max_hit_points, value.max_hp, value.hp_max, value.maxHp, character.hp, value.hp);
  const currentHp = num(character.current_hit_points, character.current_hp, character.hp_current, character.currentHp, value.current_hit_points, value.current_hp, value.hp_current, value.currentHp, value.hp, character.hp, maxHp);
  const tempHp = num(character.temporary_hit_points, character.temp_hp, character.tempHp, value.temporary_hit_points, value.temp_hp, value.tempHp);
  const armorClass = num(character.armor_class, character.ac, character.armorClass, value.armor_class, value.ac, value.armorClass);
  const speed = num(character.speed, character.walking_speed, character.movement_speed, value.speed, value.walking_speed, value.movement_speed, 30) || 30;
  const initiative = num(character.initiative_bonus, character.initiative, character.init, value.initiative_bonus, value.initiative, value.init);
  const passivePerception = num(character.passive_perception, character.passivePerception, character.senses?.passive_perception, value.passive_perception, value.passivePerception, 10) || 10;
  const hpPercent = maxHp ? clamp(Math.round((currentHp / maxHp) * 100), 0, 100) : 0;
  const hpStatus = maxHp && currentHp <= 0 ? 'down' : hpPercent <= 33 ? 'bloodied' : hpPercent <= 66 ? 'hurt' : 'healthy';
  const portraitUrl = getCharacterPortrait({ ...value, character });

  return {
    id: getCharacterId(value),
    playerId: value.player_id || value.playerId || value.user_id || value.userId || null,
    playerName: getPlayerDisplayName(value),
    name: getCharacterDisplayName(value),
    className: characterClass || 'Class',
    subclass: character.subclass || character.sub_class || value.subclass || value.sub_class || '',
    level,
    race: character.race || value.race || '',
    armorClass,
    ac: armorClass,
    currentHp,
    hp: currentHp,
    maxHp,
    tempHp,
    hpPercent,
    hpStatus,
    speed,
    initiative,
    initiativeLabel: initiative >= 0 ? `+${initiative}` : `${initiative}`,
    passivePerception,
    portraitUrl,
    imageUrl: portraitUrl,
    spellcasting: Boolean(
      arr(character.cantrips_known || character.cantrips).length ||
      arr(character.spells_known || character.known_spells).length ||
      arr(character.spellbook).length ||
      arr(character.spells_prepared || character.prepared_spells).length ||
      Object.keys(character.spell_slots || {}).length
    ),
    linked: isLinkedCampaignCharacter(value),
    raw: value,
  };
}

export function normalizeCampaignParty(players = [], characters = []) {
  const linkedById = new Map(arr(characters).map((character) => [String(character.id), character]));
  return arr(players).map((player) => {
    const linkedId = player.character_id || player.characterId || player.linked_character_id;
    const linkedCharacter = linkedId ? linkedById.get(String(linkedId)) : null;
    return normalizeCampaignCharacter({ ...player, character: player.character || linkedCharacter || player.character });
  });
}

export function getCampaignPartyStats(party = []) {
  const normalized = arr(party).map(normalizeCampaignCharacter);
  const linked = normalized.filter((member) => member.linked).length;
  const spellcasters = normalized.filter((member) => member.spellcasting).length;
  const totalMaxHp = normalized.reduce((sum, member) => sum + Number(member.maxHp || 0), 0);
  const totalCurrentHp = normalized.reduce((sum, member) => sum + Number(member.currentHp || 0), 0);
  const bloodied = normalized.filter((member) => member.hpStatus === 'bloodied').length;
  const down = normalized.filter((member) => member.hpStatus === 'down').length;

  return {
    total: normalized.length,
    linked,
    unlinked: normalized.length - linked,
    spellcasters,
    bloodied,
    down,
    totalMaxHp,
    totalCurrentHp,
    averageLevel: normalized.length ? Number((normalized.reduce((sum, member) => sum + member.level, 0) / normalized.length).toFixed(1)) : 0,
  };
}

export function filterCampaignParty(party = [], search = '') {
  const needle = normalize(search);
  if (!needle) return arr(party).map(normalizeCampaignCharacter);
  return arr(party)
    .map(normalizeCampaignCharacter)
    .filter((member) => normalize(`${member.name} ${member.playerName} ${member.className} ${member.subclass} ${member.race}`).includes(needle));
}

export function buildCampaignCharacterLinkPayload(character = {}) {
  const id = getCharacterId(character);
  if (!id) return null;
  return {
    character_id: id,
    character_name: getCharacterDisplayName(character),
    character_class: character.character_class || character.className || character.class || '',
    level: Number(character.level || 1) || 1,
  };
}
