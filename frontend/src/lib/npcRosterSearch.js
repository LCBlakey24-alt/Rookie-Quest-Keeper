/**
 * A GM needs to find characters by lore, motivation and skills, not just name.
 * Search operates only on records already fetched for the active campaign.
 */
export function matchesNpcSearch(npc, searchTerm) {
  const term = String(searchTerm || '').trim().toLowerCase();
  if (!term) return true;
  if (!npc || typeof npc !== 'object') return false;

  const values = [
    npc.name, npc.role, npc.occupation, npc.location, npc.description,
    npc.backstory, npc.notes, npc.appearance, npc.personality,
    npc.race, npc.class_name, npc.mechanics_status,
    ...(Array.isArray(npc.skills) ? npc.skills : []),
    ...(Array.isArray(npc.saving_throws) ? npc.saving_throws : []),
  ];

  return values.some(value => String(value ?? '').toLowerCase().includes(term));
}
