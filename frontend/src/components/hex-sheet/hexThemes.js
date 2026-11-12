/**
 * Colour themes for the hexagonal sheet. Every colour on the sheet reads a
 * --hex-* custom property, so a theme is only a handful of values set on
 * the sheet's root element. Guild Ledger Brass is the default: it matches
 * the approved Rookie brand (ink navy, parchment text, antique brass).
 *
 * The player's choice is remembered on this device.
 */
const STORAGE_KEY = 'rqk.hexSheet.theme';

const rgb = (hex) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)).join(', ');
};

function theme({ id, name, bg, glow, hi, sub, text, muted, titleFont, extra = {} }) {
  return {
    id,
    name,
    swatch: { bg, glow },
    vars: {
      '--hex-bg': bg,
      '--hex-bg-rgb': rgb(bg),
      '--hex-orange': glow,
      '--hex-glow-rgb': rgb(glow),
      '--hex-orange-soft': `rgba(${rgb(glow)}, 0.55)`,
      '--hex-line': `rgba(${rgb(glow)}, 0.22)`,
      '--hex-hi': hi,
      '--hex-sub': sub,
      '--hex-text': text,
      '--hex-muted': muted,
      '--hex-muted-rgb': rgb(muted),
      '--hex-title-font': titleFont,
      ...extra,
    },
  };
}

const CINZEL = "'Cinzel', Georgia, serif";
const FRAUNCES = "'Fraunces', Georgia, serif";
const MANROPE = "var(--rq-body-font, Manrope, Inter, system-ui, sans-serif)";

export const HEX_THEMES = [
  // The default, matching the rest of the app (styles/guildTokens.css): the
  // Neon Coast glow on a dusk sky, Cinzel headings. Ordinary shapes glow
  // pink -> violet -> blue; chosen ones peach -> pink -> gold.
  theme({
    id: 'keeper', name: 'Neon Coast', bg: '#0a2342', glow: '#ff5fa0', hi: '#ffb066', sub: '#ffb066', text: '#ffffff', muted: '#c9d2e6', titleFont: CINZEL,
    extra: {
      '--hex-page': 'var(--guild-sky)',
      '--hex-cool': '#b04dff',
      '--hex-cool-soft': 'rgba(176, 77, 255, 0.5)',
      '--hex-stroke-cool': 'var(--guild-stroke-cool)',
      '--hex-stroke-hot': 'var(--guild-stroke-hot)',
      '--hex-glow': 'var(--guild-box-glow)',
      '--hex-glow-strong': 'var(--guild-box-glow-hot)',
      '--hex-line': 'rgba(176, 77, 255, 0.3)',
      '--hex-orange-soft': 'rgba(176, 77, 255, 0.55)',
    },
  }),
  theme({ id: 'ledger', name: 'Guild Ledger Brass', bg: '#0b1520', glow: '#c9a24a', hi: '#ecd08a', sub: '#d9b86a', text: '#f4ead2', muted: '#cdbf9e', titleFont: CINZEL }),
  theme({ id: 'ember', name: 'Ember Forge', bg: '#0a1828', glow: '#f2892f', hi: '#ffb066', sub: '#f2b06a', text: '#ffffff', muted: '#c6d3df', titleFont: MANROPE }),
  theme({ id: 'frost', name: 'Arcane Frost', bg: '#08111f', glow: '#5fc8f0', hi: '#c4ecff', sub: '#9fd8f2', text: '#f4f9ff', muted: '#c3d4e6', titleFont: CINZEL }),
  theme({ id: 'dragon', name: 'Dragonfire', bg: '#120c0b', glow: '#e0582a', hi: '#ffb347', sub: '#f0a35a', text: '#fff3e6', muted: '#d9c3b0', titleFont: CINZEL }),
  theme({ id: 'grove', name: 'Elven Grove', bg: '#0b1712', glow: '#46c48a', hi: '#a6efc4', sub: '#9ed9b5', text: '#f2f7ef', muted: '#c5d8cb', titleFont: FRAUNCES }),
  theme({ id: 'shadow', name: 'Shadowfell Tome', bg: '#0d0f12', glow: '#7fd6c2', hi: '#d2fff4', sub: '#9fe0cf', text: '#eef3f1', muted: '#bfc8c6', titleFont: FRAUNCES }),
];

export const DEFAULT_HEX_THEME = 'keeper';

export function getHexTheme(id) {
  return HEX_THEMES.find((entry) => entry.id === id) || HEX_THEMES.find((entry) => entry.id === DEFAULT_HEX_THEME);
}

export function loadHexThemeId() {
  try {
    return getHexTheme(window.localStorage.getItem(STORAGE_KEY)).id;
  } catch {
    return DEFAULT_HEX_THEME;
  }
}

export function saveHexThemeId(id) {
  try {
    window.localStorage.setItem(STORAGE_KEY, getHexTheme(id).id);
  } catch {
    /* storage blocked: the choice lasts for this visit */
  }
}
