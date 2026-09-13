export function spellRequiresConcentration(spell = {}) {
  if (!spell || typeof spell === 'string') return false;
  if (spell.concentration === true || spell.requires_concentration === true || spell.requiresConcentration === true) return true;
  const duration = String(spell.duration || spell.duration_text || spell.durationText || '');
  if (/concentration/i.test(duration)) return true;
  const description = String(spell.description || spell.desc || spell.summary || '');
  return /concentration/i.test(description);
}
