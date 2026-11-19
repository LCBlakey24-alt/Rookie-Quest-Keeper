/**
 * The dice tower designs, as plain data: names, words and colours. Menus and
 * preferences read this; it imports nothing heavy, so choosing a design
 * never pulls three.js into the main bundle. towerSkins.js adds the 3D
 * builder for each id.
 *
 * `collection` describes where a design comes from. Every design here is
 * in the core set and open to everyone; nothing checks an account or plan.
 */
export const TOWER_SKIN_CATALOG = [
  {
    id: 'midnight-spire',
    name: 'Midnight Spire',
    blurb: 'Navy glass, magenta edges and a hexagon crown.',
    collection: 'core',
    panel: { color: '#141032', roughness: 0.38, metalness: 0.15 },
    plank: { color: '#24184f', roughness: 0.45, metalness: 0.1 },
    glass: { color: '#a8b8ff', opacity: 0.12 },
    edge: '#ff4f9a',
    accent: '#ff1976',
  },
  {
    id: 'gilded-reliquary',
    name: 'Gilded Reliquary',
    blurb: 'Ivory panels in a gold frame, with an arched top.',
    collection: 'core',
    panel: { color: '#e9e0cf', roughness: 0.55, metalness: 0.0 },
    plank: { color: '#c9a45a', roughness: 0.3, metalness: 0.8 },
    glass: { color: '#fff3d6', opacity: 0.1 },
    edge: '#ffd27a',
    accent: '#d9a441',
  },
  {
    id: 'ember-forge',
    name: 'Ember Forge',
    blurb: 'Riveted iron with glowing vents and a chimney.',
    collection: 'core',
    panel: { color: '#2a2a30', roughness: 0.7, metalness: 0.6 },
    plank: { color: '#3a3a42', roughness: 0.6, metalness: 0.7 },
    glass: { color: '#ffb48a', opacity: 0.1 },
    edge: '#ff7a3d',
    accent: '#ff5a1f',
  },
];

export const DEFAULT_TOWER_SKIN_ID = TOWER_SKIN_CATALOG[0].id;

/** A design by id; anything unknown gets the default. */
export function getTowerSkinInfo(id) {
  return TOWER_SKIN_CATALOG.find((skin) => skin.id === id) || TOWER_SKIN_CATALOG[0];
}
