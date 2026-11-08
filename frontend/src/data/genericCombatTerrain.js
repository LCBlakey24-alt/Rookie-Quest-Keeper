/**
 * Public, deterministic generic terrain when an encounter has no saved map.
 * Shared by the GM canvas and the player display so both screens agree.
 * Never treat arbitrary campaign text as a CSS value or terrain identifier.
 */
export const GENERIC_COMBAT_TERRAINS = Object.freeze([
  { id: 'stone', label: 'Stone floor' },
  { id: 'cobblestone', label: 'Cobblestones' },
  { id: 'grass', label: 'Grass' },
  { id: 'dirt', label: 'Dirt' },
  { id: 'sand', label: 'Sand' },
  { id: 'wood', label: 'Wooden floor' },
  { id: 'water', label: 'Water' },
]);

const VALID_TERRAINS = new Set(GENERIC_COMBAT_TERRAINS.map(item => item.id));

export function normaliseCombatTerrain(value) {
  const candidate = String(value || '').trim().toLowerCase();
  return VALID_TERRAINS.has(candidate) ? candidate : 'stone';
}

/** A map consumable by the existing MapCanvas, not a second map engine. */
export function createGenericCombatMap(value = 'stone') {
  const terrain = normaliseCombatTerrain(value);
  const label = GENERIC_COMBAT_TERRAINS.find(item => item.id === terrain).label;
  return {
    id: `generic-${terrain}`,
    name: `Generic ${label}`,
    width: 30,
    height: 20,
    terrain: Array.from({ length: 20 }, () => Array(30).fill(terrain)),
    walls: [],
    doors: [],
    objects: [],
    tokens: [],
    generated: true,
  };
}

// Procedural fallback art is intentionally flat, seamless and lightweight.
// A subtle square grid stays visible for tactical positioning at TV/table size.
const BACKDROPS = {
  stone: { color: '#555866', texture: 'radial-gradient(circle at 35% 38%, rgba(255,255,255,.09), transparent 65%)' },
  cobblestone: { color: '#66666a', texture: 'repeating-linear-gradient(0deg, transparent 0px, transparent 38px, rgba(18,22,30,.36) 39px, rgba(18,22,30,.36) 42px), repeating-linear-gradient(90deg, transparent 0px, transparent 58px, rgba(18,22,30,.30) 59px, rgba(18,22,30,.30) 62px)' },
  grass: { color: '#426848', texture: 'radial-gradient(circle at 22% 34%, rgba(137,176,103,.24), transparent 48%)' },
  dirt: { color: '#705843', texture: 'radial-gradient(circle at 75% 45%, rgba(31,18,10,.22), transparent 55%)' },
  sand: { color: '#a99465', texture: 'radial-gradient(circle at 30% 30%, rgba(236,218,171,.22), transparent 48%)' },
  wood: { color: '#6a4732', texture: 'repeating-linear-gradient(0deg, transparent 0px, transparent 44px, rgba(25,15,10,.38) 45px, rgba(25,15,10,.38) 48px)' },
  water: { color: '#28546b', texture: 'radial-gradient(ellipse at 22% 20%, rgba(110,189,212,.18), transparent 45%)' },
};

export function genericCombatBackdropStyle(value = 'stone') {
  const selected = BACKDROPS[normaliseCombatTerrain(value)];
  return {
    backgroundColor: selected.color,
    backgroundImage: [
      'linear-gradient(to right, rgba(10,18,25,.25) 1px, transparent 1px)',
      'linear-gradient(to bottom, rgba(10,18,25,.25) 1px, transparent 1px)',
      selected.texture,
    ].join(', '),
    backgroundSize: '40px 40px, 40px 40px, 100% 100%',
    backgroundPosition: '0 0',
  };
}
