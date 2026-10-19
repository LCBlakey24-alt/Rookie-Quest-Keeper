// A reference must supply its own mechanics. Never equip story-only records
// with fallback hit points, armour or attacks merely to make combat work.
export function recordedNumber(value, allowZero = false) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && (allowZero ? number >= 0 : number > 0) ? number : null;
}

export function canUseCombatRecord(record = {}) {
  return record.combat_ready !== false && record.source !== 'legacy-reference'
    && recordedNumber(record.hp ?? record.hit_points) !== null
    && recordedNumber(record.ac ?? record.armor_class) !== null;
}

export function combatReferenceStatus(record = {}) {
  if (record.combat_ready === false) return 'Not combat-ready — story or unverified reference';
  if (record.source === 'legacy-reference') return 'Legacy estimates — verify before combat';
  if (record.mechanics_status) return String(record.mechanics_status);
  if (record.import_review_required) return 'GM review required';
  return '';
}
