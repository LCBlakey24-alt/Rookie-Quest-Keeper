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
    blurb: 'Honeycomb-inlaid midnight lacquer, magenta light and a hexagon crown.',
    collection: 'core',
    shape: 'classic',
    surface: { panel: 'lacquer', plank: 'lacquer', roof: 'shingle' },
    outline: 0.45,
    panel: { color: '#1b1340' },
    plank: { color: '#2c1d5e' },
    roof: { color: '#3a1f6a' },
    glass: { color: '#a8b8ff', opacity: 0.12 },
    edge: '#ff4f9a',
    accent: '#ff1976',
  },
  {
    id: 'gilded-reliquary',
    name: 'Gilded Reliquary',
    blurb: 'Veined marble in an engraved gold frame, with turned columns and an arched top.',
    collection: 'core',
    shape: 'classic',
    surface: { panel: 'marble', plank: 'gold', roof: 'gold' },
    outline: 0,
    panel: { color: '#ece4d4' },
    plank: { color: '#c9a045' },
    roof: { color: '#c9a045' },
    glass: { color: '#fff3d6', opacity: 0.1 },
    edge: '#ffd27a',
    accent: '#d9a441',
  },
  {
    id: 'ember-forge',
    name: 'Ember Forge',
    blurb: 'Hammered, rust-touched iron with riveted straps, glowing vents and a chimney.',
    collection: 'core',
    shape: 'classic',
    surface: { panel: 'iron', plank: 'iron', roof: 'iron' },
    outline: 0,
    panel: { color: '#5b5b66' },
    plank: { color: '#7c7c88' },
    roof: { color: '#4a4a54' },
    glass: { color: '#ffb48a', opacity: 0.1 },
    edge: '#ff7a3d',
    accent: '#ff5a1f',
  },
  {
    id: 'spiral-glass',
    name: 'Spiral Glass',
    blurb: 'A stone turret with a tiled roof, round a glass tube and a winding ramp.',
    collection: 'core',
    shape: 'spiral',
    surface: { panel: 'stone', plank: 'lacquer', roof: 'shingle' },
    outline: 0,
    panel: { color: '#7d778c' },
    plank: { color: '#3b2a7a' },
    roof: { color: '#5a3f8a' },
    glass: { color: '#c9b8ff', opacity: 0.1 },
    edge: '#b56cff',
    accent: '#c99bff',
  },
  {
    id: 'funnel-chute',
    name: 'Funnel Chute',
    blurb: 'A walnut cabinet with turned posts; dice swirl round a bronze funnel.',
    collection: 'core',
    shape: 'funnel',
    surface: { panel: 'wood', plank: 'gold', roof: 'wood' },
    outline: 0,
    panel: { color: '#4a2d18' },
    plank: { color: '#b07a3a' },
    roof: { color: '#5a3820' },
    glass: { color: '#ffe0b0', opacity: 0.1 },
    edge: '#ffb45c',
    accent: '#ffc867',
  },
  {
    id: 'peg-drop',
    name: 'Peg Drop',
    blurb: 'A warm oak board; dice bounce off rows of brass bars all the way down.',
    collection: 'core',
    shape: 'pegs',
    surface: { panel: 'wood', plank: 'gold', roof: 'wood' },
    outline: 0,
    panel: { color: '#8a5a30' },
    plank: { color: '#d2a44c' },
    roof: { color: '#6e4424' },
    glass: { color: '#fff0cf', opacity: 0.1 },
    edge: '#ffcf7a',
    accent: '#ffb347',
  },
];

export const DEFAULT_TOWER_SKIN_ID = TOWER_SKIN_CATALOG[0].id;

/** A design by id; anything unknown gets the default. */
export function getTowerSkinInfo(id) {
  return TOWER_SKIN_CATALOG.find((skin) => skin.id === id) || TOWER_SKIN_CATALOG[0];
}
