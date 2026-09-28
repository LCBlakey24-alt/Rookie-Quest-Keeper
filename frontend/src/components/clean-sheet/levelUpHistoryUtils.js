const asObject = (value) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
);

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const abilityShort = (value = '') => {
  const normalised = String(value || '').trim().toLowerCase();
  return {
    strength: 'STR',
    dexterity: 'DEX',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'WIS',
    charisma: 'CHA',
  }[normalised] || String(value || '').slice(0, 3).toUpperCase();
};

function normaliseAsiChanges(value = {}) {
  const choices = asObject(value);
  const modern = ['ability1', 'ability2']
    .map(key => choices[key])
    .filter(Boolean);

  const changes = modern.length
    ? modern.map(ability => ({ ability: String(ability), amount: 1 }))
    : Object.entries(choices)
      .filter(([ability, amount]) => ability && Number(amount) > 0)
      .map(([ability, amount]) => ({ ability, amount: Number(amount) }));

  const byAbility = new Map();
  changes.forEach(({ ability, amount }) => {
    const key = String(ability || '').trim().toLowerCase();
    if (!key) return;
    const existing = byAbility.get(key) || { ability, amount: 0 };
    existing.amount += Math.max(1, Number(amount) || 1);
    byAbility.set(key, existing);
  });
  return Array.from(byAbility.values());
}

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
        className: receipt.class || raw.class || 'Class not recorded',
        classLevel: toNumber(raw.class_level, 0),
        type: raw.type || 'standard',
        appliedAt: raw.applied_at || '',
        hp: {
          method: hp.method || raw.hp_method || '',
          rawRoll: hp.raw_roll ?? raw.hp_roll ?? null,
          fixedDieValue: hp.fixed_die_value ?? null,
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
        asiChanges: normaliseAsiChanges(raw.asi_choices || raw.choices),
        newSpells: Array.isArray(raw.new_spells) ? raw.new_spells : [],
        newCantrips: Array.isArray(raw.new_cantrips) ? raw.new_cantrips : [],
      };
    })
    .filter(entry => entry.level > 0)
    .sort((a, b) => b.level - a.level);
}

function hpEquation(source, dieValue, hp = {}) {
  const con = hp.constitutionModifier;
  if (con === null || con === undefined) return `${source}: ${dieValue} = +${hp.gained} HP`;
  const conNumber = Number(con) || 0;
  const rawTotal = Number(dieValue) + conNumber;
  const conText = `${conNumber >= 0 ? '+' : ''}${conNumber} CON`;
  if (hp.minimumOneApplied && rawTotal < 1) {
    return `${source}: ${dieValue} ${conText} = ${rawTotal} → minimum +1 HP`;
  }
  return `${source}: ${dieValue} ${conText} = +${hp.gained} HP`;
}

export function levelUpHpMath(entry = {}) {
  const hp = entry.hp || {};
  if ((hp.method === 'roll' || hp.method === 'manual') && hp.rawRoll !== null && hp.rawRoll !== undefined) {
    return hpEquation(hp.method === 'manual' ? 'Physical roll' : 'Keeper roll', hp.rawRoll, hp);
  }
  if (hp.method === 'average' && hp.fixedDieValue !== null && hp.fixedDieValue !== undefined) {
    return hpEquation('Fixed', hp.fixedDieValue, hp);
  }

  const con = hp.constitutionModifier;
  const conText = con === null || con === undefined ? '' : `${Number(con) >= 0 ? '+' : ''}${con} CON`;
  if (hp.gained) {
    return `${hp.method === 'average' ? 'Fixed HP' : 'HP gained'}: +${hp.gained}${conText ? ` including ${conText}` : ''}`;
  }
  return 'HP change not recorded on this older level.';
}

export function asiChangeText(changes = []) {
  return (Array.isArray(changes) ? changes : [])
    .filter(change => change?.ability && Number(change?.amount) > 0)
    .map(change => `${abilityShort(change.ability)} +${Number(change.amount)}`)
    .join(', ');
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
