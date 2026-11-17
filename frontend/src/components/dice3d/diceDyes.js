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
 * wedges, with `glowStops` giving the colours it runs through. The dark
 * theme dyes have one; the light and metal dyes keep their plain faces.
 */

const DEFAULT_DYE_ID = 'glow';

export const DICE_DYES = [
  // Light bodies take dark numerals; dark bodies take cream. A body in the
  // middle of the range fails both ways, which is how an earlier draft of
  // this palette ended up with eight combinations below AA.
  //
  // The set follows the Midnight Magenta theme (DESIGN_SYSTEM "Phase 2"):
  // crimson, magenta, violet and indigo bodies with the theme's inner glow,
  // plus a few light and metal dyes for players who want a classic die.
  // Ids are kept from the earlier set, so a saved choice lands on the
  // closest new colour rather than resetting.
  {
    // The default, matching the app: a midnight-plum body a step lighter
    // than the page, white numerals, and a glow inside every face edge that
    // runs magenta -> violet -> indigo. The id stays 'glow' so a player's
    // saved choice keeps working.
    id: 'glow',
    name: 'Midnight Magenta',
    body: '#2A1640',
    ink: '#FFFFFF',
    edge: '#FF5C93',
    crit: '#FFD27A',
    fumble: '#FF9B7A',
    glow: '#FF5C93',
    glowStops: ['#FF1976', '#8C36DD', '#5A4BFF'],
  },
  {
    id: 'garnet',
    name: 'Crimson',
    body: '#6E0C2A',
    ink: '#FFF1F5',
    edge: '#FF1976',
    crit: '#FFD27A',
    fumble: '#FFB4C6',
    glow: '#FF5C93',
    glowStops: ['#F21751', '#FF1976', '#FF8FBF'],
  },
  {
    id: 'ledger',
    name: 'Violet',
    body: '#4B1E86',
    ink: '#FFFFFF',
    edge: '#B56CFF',
    crit: '#FFD27A',
    fumble: '#FFB4C6',
    glow: '#C99BFF',
    glowStops: ['#B56CFF', '#8C36DD', '#FF1976'],
  },
  {
    id: 'moss',
    name: 'Indigo',
    body: '#221D66',
    ink: '#FFFFFF',
    edge: '#7C6CFF',
    crit: '#FFD27A',
    fumble: '#FFB4C6',
    glow: '#9A8CFF',
    glowStops: ['#5A4BFF', '#8C36DD', '#FF5C93'],
  },
  {
    id: 'ink',
    name: 'Obsidian',
    body: '#0E0A18',
    ink: '#FFFFFF',
    edge: '#8C36DD',
    crit: '#FFD27A',
    fumble: '#FF9B7A',
    glow: '#B56CFF',
    glowStops: ['#8C36DD', '#5A4BFF', '#FF1976'],
  },
  {
    id: 'bone',
    name: 'Rose quartz',
    body: '#F7C6DA',
    ink: '#3A0D22',
    edge: '#C2447A',
    crit: '#7A0F2E',
    fumble: '#2A1A6B',
  },
  {
    id: 'parchment',
    name: 'Pearl',
    body: '#F4ECF7',
    ink: '#2A1640',
    edge: '#9C8BB5',
    crit: '#8E0B37',
    fumble: '#3A2A8C',
  },
  {
    id: 'amber',
    name: 'Gilded',
    body: '#E9B949',
    ink: '#2A1640',
    edge: '#7A5410',
    crit: '#6E0C2A',
    fumble: '#24205E',
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
