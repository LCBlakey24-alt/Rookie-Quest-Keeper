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

export function spellRequiresConcentration(spell = {}) {
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

  return /\bconcentration\b/i.test(searchableText);
}

export default spellRequiresConcentration;
