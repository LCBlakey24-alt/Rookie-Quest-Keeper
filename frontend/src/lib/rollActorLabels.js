/**
 * Disambiguate rare identically named characters on recap screens.
 * IDs are already public in the campaign party list, but only reveal a
 * shortened suffix when names collide. Never use account IDs in UI labels.
 */
export function rollActorDisplayName(item, actors = []) {
  const name = String(item?.name || 'Player');
  const sameName = (Array.isArray(actors) ? actors : []).filter(actor => actor?.name === name);
  if (sameName.length < 2) return name;
  const characterId = String(item?.character_id || '');
  if (!characterId) return name;
  const known = sameName.some(actor => String(actor?.character_id || '') === characterId);
  if (!known) return name;
  let length = Math.min(6, characterId.length);
  while (length < characterId.length && sameName.some(actor =>
    actor !== item && String(actor?.character_id || '') !== characterId
      && String(actor?.character_id || '').endsWith(characterId.slice(-length)))) {
    length = Math.min(length + 4, characterId.length);
  }
  return name + ' (' + characterId.slice(-length) + ')';
}
