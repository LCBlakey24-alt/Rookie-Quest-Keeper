import { SRD_CONCENTRATION_2014, SRD_CONCENTRATION_2024 } from './srdConcentrationSpells';

const TRUE_VALUES = new Set(['true', 'yes', '1', 'required', 'concentration']);
const FALSE_VALUES = new Set(['false', 'no', '0', 'none']);

function readExplicitConcentration(spell = {}) {
  const candidates = [
    spell.concentration,
    spell.requires_concentration,
    spell.requiresConcentration,
    spell.is_concentration,
    spell.isConcentration,
  ];

  for (const value of candidates) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;

    const normalised = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalised)) return true;
    if (FALSE_VALUES.has(normalised)) return false;
  }

  return null;
}

const nameKey = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const SRD_KEYS = {
  2014: new Set(SRD_CONCENTRATION_2014.map(nameKey)),
  2024: new Set(SRD_CONCENTRATION_2024.map(nameKey)),
};
// Book names the SRD prints without the wizard's name.
const NAME_ALIASES = {
  tashashideouslaughter: 'hideouslaughter',
  bigbyshand: 'arcanehand',
  evardsblacktentacles: 'blacktentacles',
  otilukesresiliensphere: 'resilientsphere',
  otilukesresilientsphere: 'resilientsphere',
  ottosirresistibledance: 'irresistibledance',
  mordenkainenssword: 'arcanesword',
};

/**
 * Whether a spell needs concentration under the SRD for that edition, by
 * name, for spells saved without a duration. False for any name the SRD
 * does not list (a homebrew spell decides through its own duration text).
 */
export function srdSpellNeedsConcentration(name, edition = '2014') {
  const key = nameKey(name);
  if (!key) return false;
  const set = String(edition).includes('2024') ? SRD_KEYS[2024] : SRD_KEYS[2014];
  return set.has(NAME_ALIASES[key] || key);
}

/**
 * options.edition ('2014' | '2024') picks which SRD list the name fallback
 * uses; it defaults to the 2014 rules, the app's default edition.
 */
export function spellRequiresConcentration(spell = {}, options = {}) {
  const explicit = readExplicitConcentration(spell);
  if (explicit !== null) return explicit;

  const searchableText = [
    spell.duration,
    spell.duration_text,
    spell.durationText,
    spell.description,
    spell.desc,
    spell.summary,
  ]
    .filter(Boolean)
    .join(' ');

  if (/\bconcentration\b/i.test(searchableText)) return true;
  // A saved duration decides on its own: a customised "Bless, 1 minute"
  // stays without concentration. Only a spell saved without any duration
  // (the built-in list keeps none) falls back to the SRD by name.
  const hasDuration = [spell.duration, spell.duration_text, spell.durationText]
    .some((value) => value !== undefined && value !== null && String(value).trim() !== '');
  if (hasDuration) return false;
  return srdSpellNeedsConcentration(spell.name || spell.spell_name || spell.title, options.edition);
}

export default spellRequiresConcentration;
