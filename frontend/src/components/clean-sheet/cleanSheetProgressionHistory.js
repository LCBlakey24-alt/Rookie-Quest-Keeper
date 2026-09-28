const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function progressionHistoryEntries(character = {}) {
  const progression = asObject(character.level_progression);
  return Object.entries(progression)
    .map(([levelKey, rawValue]) => {
      const raw = asObject(rawValue);
      const receipt = asObject(raw.receipt);
      const hp = asObject(receipt.hp);
      const proficiency = asObject(receipt.proficiency);
      const spellSlots = asObject(receipt.spell_slots);
      const level = toNumber(receipt.total_level_after || levelKey, 0);

      return {
        level,
        className: receipt.class || raw.class || character.character_class || 'Class',
        classLevel: toNumber(raw.class_level, 0),
        type: raw.type || 'standard',
        appliedAt: raw.applied_at || '',
        hp: {
          method: hp.method || raw.hp_method || '',
          rawRoll: hp.raw_roll ?? raw.hp_roll ?? null,
          constitutionModifier: hp.constitution_modifier ?? null,
          gained: toNumber(hp.gained ?? raw.hp_gained, 0),
          maxBefore: hp.max_before ?? null,
          maxAfter: hp.max_after ?? null,
          minimumOneApplied: Boolean(hp.minimum_one_applied),
        },
        proficiency: {
          before: proficiency.before ?? null,
          after: proficiency.after ?? null,
        },
        spellSlots: {
          before: asObject(spellSlots.before),
          after: asObject(spellSlots.after),
        },
        resourceChanges: Array.isArray(receipt.resource_changes) ? receipt.resource_changes : [],
        subclass: raw.subclass || '',
        feat: raw.feat || raw.feat_name || '',
        asiChoices: asObject(raw.asi_choices || raw.choices),
        newSpells: Array.isArray(raw.new_spells) ? raw.new_spells : [],
        newCantrips: Array.isArray(raw.new_cantrips) ? raw.new_cantrips : [],
      };
    })
    .filter(entry => entry.level > 0)
    .sort((a, b) => b.level - a.level);
}

export function levelUpHpMath(entry = {}) {
  const hp = entry.hp || {};
  const con = hp.constitutionModifier;
  const conText = con === null || con === undefined ? '' : `${Number(con) >= 0 ? '+' : ''}${con} CON`;
  if ((hp.method === 'roll' || hp.method === 'manual') && hp.rawRoll !== null && hp.rawRoll !== undefined) {
    const source = hp.method === 'manual' ? 'Physical roll' : 'Keeper roll';
    return `${source}: ${hp.rawRoll}${conText ? ` ${conText}` : ''} = +${hp.gained} HP`;
  }
  if (hp.gained) {
    return `${hp.method === 'average' ? 'Fixed HP' : 'HP gained'}: +${hp.gained}${conText ? ` including ${conText}` : ''}`;
  }
  return 'HP change not recorded on this older level.';
}

export function spellSlotChangeText(before = {}, after = {}) {
  const levels = Array.from(new Set([...Object.keys(asObject(before)), ...Object.keys(asObject(after))]))
    .sort((a, b) => Number(a) - Number(b));

  return levels
    .filter(level => toNumber(before[level]) !== toNumber(after[level]))
    .map(level => `L${level} ${toNumber(before[level])}→${toNumber(after[level])}`)
    .join(' • ');
}

export function resourceChangeText(change = {}) {
  const label = change.label || String(change.key || 'Resource').replace(/[_-]+/g, ' ');
  if (change.unlocked) return `${label} unlocked at ${toNumber(change.afterCurrent) || toNumber(change.after_current)}/${toNumber(change.afterMax) || toNumber(change.after_max)}`;

  const beforeMax = toNumber(change.beforeMax ?? change.before_max);
  const afterMax = toNumber(change.afterMax ?? change.after_max);
  const beforeCurrent = toNumber(change.beforeCurrent ?? change.before_current);
  const afterCurrent = toNumber(change.afterCurrent ?? change.after_current);

  if (beforeMax !== afterMax) return `${label} max ${beforeMax}→${afterMax} • remaining ${beforeCurrent}→${afterCurrent}`;
  return `${label} remaining ${beforeCurrent}→${afterCurrent}`;
}
