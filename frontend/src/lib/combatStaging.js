const safeId = (value) => String(value || 'creature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'creature';

export function combatStagingKey(campaignId) {
  return `rqk.combat.stagedCreatures.${campaignId}`;
}

export function normaliseStagedCreature(creature = {}) {
  const name = creature.name || 'Creature';
  const id = creature.id || `staged-${safeId(name)}`;
  return {
    id,
    name,
    cr: creature.cr || creature.challenge_rating || '—',
    hp: Number(creature.hp ?? creature.hit_points ?? creature.maxHp) || 10,
    ac: Number(creature.ac ?? creature.armor_class) || 10,
    type: creature.type || 'monster',
    size: creature.size || 'Medium',
    speed: creature.speed || '',
    abilities: creature.abilities || creature.actions || '',
    description: creature.description || creature.notes || '',
    source: creature.source || 'Monster staging',
    is_staged_for_combat: true,
  };
}

export function readStagedCombatCreatures(campaignId) {
  if (!campaignId) return [];
  try {
    const raw = localStorage.getItem(combatStagingKey(campaignId));
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStagedCombatCreatures(campaignId, creatures) {
  if (!campaignId) return [];
  const next = Array.isArray(creatures) ? creatures : [];
  try { localStorage.setItem(combatStagingKey(campaignId), JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function stageCreatureForCombat(campaignId, creature) {
  const staged = normaliseStagedCreature(creature);
  const current = readStagedCombatCreatures(campaignId);
  const index = current.findIndex(item => item.id === staged.id);
  let next;
  if (index >= 0) {
    next = current.map((item, itemIndex) => itemIndex === index ? { ...item, ...staged, count: Math.max(1, Number(item.count) || 1) + 1 } : item);
  } else {
    next = [{ ...staged, count: 1 }, ...current];
  }
  return writeStagedCombatCreatures(campaignId, next);
}

export function clearStagedCombatCreatures(campaignId) {
  return writeStagedCombatCreatures(campaignId, []);
}
