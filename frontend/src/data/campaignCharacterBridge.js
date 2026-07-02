const arr = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

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

export function isLinkedCampaignCharacter(value = {}) {
  return Boolean(value.character_id || value.characterId || value.character?.id || value.linked_character_id);
}

export function normalizeCampaignCharacter(value = {}) {
  const character = value.character || value;
  const characterClass = character.character_class || character.class_name || character.class || character.characterClass || '';
  const level = Number(character.level || value.level || 1) || 1;
  const maxHp = Number(character.max_hit_points || character.max_hp || character.hp_max || character.maxHp || 0) || 0;
  const currentHp = Number(character.current_hit_points ?? character.current_hp ?? character.hp ?? character.currentHp ?? maxHp) || 0;
  const tempHp = Number(character.temporary_hit_points ?? character.temp_hp ?? character.tempHp ?? 0) || 0;

  return {
    id: getCharacterId(value),
    playerId: value.player_id || value.playerId || value.user_id || value.userId || null,
    playerName: getPlayerDisplayName(value),
    name: getCharacterDisplayName(value),
    className: characterClass || 'Class',
    subclass: character.subclass || character.sub_class || '',
    level,
    race: character.race || value.race || '',
    armorClass: Number(character.armor_class || character.ac || 0) || 0,
    currentHp,
    maxHp,
    tempHp,
    speed: Number(character.speed || 30) || 30,
    initiative: Number(character.initiative_bonus ?? character.initiative ?? 0) || 0,
    passivePerception: Number(character.passive_perception || character.passivePerception || 10) || 10,
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

  return {
    total: normalized.length,
    linked,
    unlinked: normalized.length - linked,
    spellcasters,
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
