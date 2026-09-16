export const FORGE_STANDARD = {
  version: '0.1 prototype',
  gridLabel: '1 in tabletop grid',
  connector: 'Base-ridge connector',
  connectorRule: 'Two connection points per grid square along each joining edge',
  stacking: 'Frames are designed to nest for compact storage',
  elevation: 'Raised platforms use stackable grid extenders with a frame-compatible top',
};

export const PRINTER_PROFILES = [
  {
    id: 'all',
    name: 'Show all printers',
    manufacturer: 'Any',
    bedX: null,
    bedY: null,
    notes: 'Browse the full Forge catalogue without filtering by build plate.',
  },
  {
    id: 'elegoo-neptune-3-pro',
    name: 'Elegoo Neptune 3 Pro',
    manufacturer: 'Elegoo',
    bedX: 225,
    bedY: 225,
    notes: 'Core Forge parts are being prototyped around this printer first.',
  },
  {
    id: '220-square',
    name: '220 × 220 mm class',
    manufacturer: 'Generic',
    bedX: 220,
    bedY: 220,
    notes: 'Typical Ender-style build plate class.',
  },
  {
    id: '180-square',
    name: '180 × 180 mm compact',
    manufacturer: 'Generic',
    bedX: 180,
    bedY: 180,
    notes: 'Compact printer profile for smaller frames and split packs.',
  },
];

export const FORGE_PACKS = [
  {
    id: 'starter-core',
    name: 'Forge Starter Set',
    eyebrow: 'Core system',
    status: 'Prototype',
    featured: true,
    description: 'The first practical Forge pack: enough frames, floors, walls and elevation pieces to prove the modular standard at the table.',
    contents: [
      '1×1, 2×2 and 3×3 frame files',
      'Stone and cobblestone floor tiles',
      'Straight wall, corner wall and doorway pieces',
      'Short stair piece with miniature-base landing lip',
      '5 ft, 10 ft and 15 ft stackable elevation extenders',
      'Simple pillar and railing pieces',
      'Connector calibration strip',
    ],
    maxPartX: 168,
    maxPartY: 168,
    nozzle: '0.4 mm recommended; 0.2 mm optional for detail',
    material: 'PLA-friendly',
    tags: ['frames', 'floors', 'walls', 'elevation'],
  },
  {
    id: 'stone-streets',
    name: 'Stone Streets',
    eyebrow: 'Texture pack',
    status: 'Planned',
    description: 'Cobblestone, flagstone and worn street surfaces that drop onto the same reusable Forge frames.',
    contents: ['Cobblestone tiles', 'Flagstone tiles', 'Broken street variants', 'Drain and edge-detail tiles'],
    maxPartX: 76,
    maxPartY: 76,
    nozzle: '0.4 mm or 0.2 mm',
    material: 'PLA-friendly',
    tags: ['floors', 'city', 'stone'],
  },
  {
    id: 'dungeon-structure',
    name: 'Dungeon Structure',
    eyebrow: 'Build pack',
    status: 'Planned',
    description: 'Walls, doors, pillars and stairs for quickly turning the reusable grid into rooms, corridors and chambers.',
    contents: ['Straight walls', 'Corners', 'Door frames', 'Pull-tab doors', 'Pillars', 'Stair variants'],
    maxPartX: 152,
    maxPartY: 76,
    nozzle: '0.4 mm recommended',
    material: 'PLA-friendly',
    tags: ['walls', 'doors', 'dungeon'],
  },
  {
    id: 'elevation-kit',
    name: 'Elevation Kit',
    eyebrow: 'Vertical play',
    status: 'Planned',
    description: 'Stackable height blocks, ledges, railings and support pieces for caves, balconies and multi-level encounters.',
    contents: ['5 ft extenders', '10 ft extenders', '15 ft extenders', 'Ledge caps', 'Railings', 'Support pillars'],
    maxPartX: 168,
    maxPartY: 168,
    nozzle: '0.4 mm recommended',
    material: 'PLA-friendly',
    tags: ['elevation', 'ledges', 'vertical'],
  },
  {
    id: 'ancient-ruins',
    name: 'Ancient Ruins Encounter Pack',
    eyebrow: 'Encounter pack',
    status: 'Future pack',
    description: 'A themed bundle that combines reusable Forge structure with ruined stone dressing for a ready-to-build encounter.',
    contents: ['Ruined walls', 'Broken floor variants', 'Collapsed doorway', 'Weathered pillars', 'Scatter dressing'],
    maxPartX: 210,
    maxPartY: 190,
    nozzle: '0.4 mm or 0.2 mm',
    material: 'PLA-friendly',
    tags: ['encounter', 'ruins', 'scatter'],
  },
];

export function packFitsPrinter(pack, printer) {
  if (!printer || printer.id === 'all' || !printer.bedX || !printer.bedY) return true;
  const directFit = pack.maxPartX <= printer.bedX && pack.maxPartY <= printer.bedY;
  const rotatedFit = pack.maxPartX <= printer.bedY && pack.maxPartY <= printer.bedX;
  return directFit || rotatedFit;
}
