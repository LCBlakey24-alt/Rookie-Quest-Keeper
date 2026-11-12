/**
 * Dice dyes: the colours a player can have their dice in.
 *
 * The one rule that matters is that the numerals stay readable. A die is
 * only useful if the number on it can be read at a glance across a table,
 * so every dye declares its own ink rather than inheriting one, and
 * diceDyes.test.js holds each combination to a WCAG AA contrast ratio.
 * Adding a dye whose numbers are hard to read fails the suite.
 *
 * Crit and fumble inks get the same treatment: a natural 20 marking the
 * die is worth nothing if the 20 stops being legible while it does so.
 *
 * A dye may also carry a `glow`: a soft light drawn just inside every face
 * edge, the same inner glow the hexagonal sheet uses on its boxes and
 * wedges. Only the Neon Coast dye has one (with `glowStops`, so the light
 * runs pink -> violet -> blue); the others keep their plain faces.
 */

const DEFAULT_DYE_ID = 'glow';

export const DICE_DYES = [
  // Light bodies take dark numerals; dark bodies take cream. A body in the
  // middle of the range fails both ways, which is how an earlier draft of
  // this palette ended up with eight combinations below AA.
  {
    // The default, matching the Neon Coast look (DESIGN_SYSTEM §3): a deep
    // blue body a step lighter than the page, white numerals, and a glow
    // inside every face edge that runs pink -> violet -> blue. The id stays
    // 'glow' so a player's saved choice keeps working.
    id: 'glow',
    name: 'Neon Coast',
    body: '#14294F',
    ink: '#FFFFFF',
    edge: '#FF5FA0',
    crit: '#FFD27A',
    fumble: '#FF9B7A',
    glow: '#FF5FA0',
    glowStops: ['#FF3D8B', '#B04DFF', '#4FB3FF'],
  },
  {
    id: 'amber',
    name: 'Amber',
    body: '#F2A93B',
    ink: '#0a2342',
    edge: '#6E4A12',
    crit: '#6E1407',
    fumble: '#123A52',
  },
  {
    id: 'ember',
    name: 'Ember',
    body: '#99360F',
    ink: '#FDF3E3',
    edge: '#4F1B08',
    crit: '#FFC97A',
    fumble: '#FFC2B8',
  },
  {
    id: 'parchment',
    name: 'Parchment',
    body: '#ffffff',
    ink: '#16283A',
    edge: '#9A8A6B',
    crit: '#7A1C0F',
    fumble: '#2C4860',
  },
  {
    id: 'ledger',
    name: 'Ledger blue',
    body: '#7FBCEF',
    ink: '#06182B',
    edge: '#2A6796',
    crit: '#5A1004',
    fumble: '#1C3C57',
  },
  {
    id: 'ink',
    name: 'Ink',
    body: '#13293D',
    ink: '#F5F1E8',
    edge: '#ffffff',
    crit: '#FF8A1F',
    fumble: '#F2766A',
  },
  {
    id: 'moss',
    name: 'Moss',
    body: '#245635',
    ink: '#F2F7EE',
    edge: '#13331F',
    crit: '#FFD37A',
    fumble: '#FFB4AA',
  },
  {
    id: 'garnet',
    name: 'Garnet',
    body: '#8C2A1F',
    ink: '#FBEFE4',
    edge: '#3B100B',
    crit: '#FFC46B',
    fumble: '#FFB0A6',
  },
  {
    id: 'bone',
    name: 'Bone',
    body: '#D8D3C6',
    ink: '#13202B',
    edge: '#8A8577',
    crit: '#7A1C0F',
    fumble: '#27425A',
  },
];

export { DEFAULT_DYE_ID };

export function getDye(id) {
  return DICE_DYES.find((dye) => dye.id === id) || DICE_DYES.find((dye) => dye.id === DEFAULT_DYE_ID);
}

function channel(value) {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const clean = String(hex).replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colours, 1 (none) to 21 (black/white). */
export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}
