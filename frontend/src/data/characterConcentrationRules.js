const normaliseText = (value = '') => String(value || '').trim().toLowerCase();

export function getConcentrationName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  return String(value?.name || value?.spell_name || value?.title || '').trim();
}

export function getConcentrationSaveDc(damage = 0) {
  const amount = Math.max(0, Number(damage) || 0);
  return Math.max(10, Math.floor(amount / 2));
}

export function getConcentrationSaveModifier(character = {}, proficiencyBonus = 0) {
  const constitution = Number(character?.constitution ?? 10) || 10;
  const constitutionMod = Math.floor((constitution - 10) / 2);
  const saves = Array.isArray(character?.saving_throw_proficiencies)
    ? character.saving_throw_proficiencies
    : [];
  const proficient = saves.some((save) => {
    const key = normaliseText(save).replace(/[^a-z]/g, '');
    return key === 'con' || key.startsWith('constitution') || key.startsWith('consav');
  });
  return constitutionMod + (proficient ? Number(proficiencyBonus || 0) : 0);
}

export function needsConcentrationReplacement(current, next) {
  const currentName = getConcentrationName(current);
  const nextName = getConcentrationName(next);
  if (!currentName || !nextName) return false;
  return normaliseText(currentName) !== normaliseText(nextName);
}
