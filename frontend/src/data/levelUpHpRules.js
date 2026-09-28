export function normaliseLevelUpHpMethod(method = 'average') {
  return ['average', 'roll', 'manual'].includes(method) ? method : 'average';
}

export function getLevelUpHpChoice({
  hitDie = 8,
  constitutionModifier = 0,
  method = 'average',
  rawRoll = null,
} = {}) {
  const safeHitDie = Math.max(2, Math.floor(Number(hitDie) || 8));
  const conMod = Math.trunc(Number(constitutionModifier) || 0);
  const hpMethod = normaliseLevelUpHpMethod(method);
  const averageDie = Math.floor(safeHitDie / 2) + 1;

  let dieValue = hpMethod === 'average' ? averageDie : Number(rawRoll);
  const validRawRoll = hpMethod === 'average'
    || (Number.isInteger(dieValue) && dieValue >= 1 && dieValue <= safeHitDie);

  if (!validRawRoll) {
    return {
      valid: false,
      method: hpMethod,
      hitDie: safeHitDie,
      constitutionModifier: conMod,
      dieValue: null,
      gain: null,
      formula: '',
      sourceLabel: hpMethod === 'roll' ? 'Keeper roll' : 'Physical die',
    };
  }

  dieValue = Number(dieValue);
  const rawTotal = dieValue + conMod;
  const gain = Math.max(1, rawTotal);
  const modifierText = conMod >= 0 ? `+${conMod}` : `${conMod}`;
  const floorNote = rawTotal < 1 ? ' (minimum +1 HP)' : '';

  return {
    valid: true,
    method: hpMethod,
    hitDie: safeHitDie,
    constitutionModifier: conMod,
    dieValue,
    gain,
    rawTotal,
    formula: `${dieValue} ${modifierText} CON = +${gain} HP${floorNote}`,
    sourceLabel: hpMethod === 'average'
      ? 'Fixed / average'
      : hpMethod === 'roll'
        ? 'Keeper roll'
        : 'Physical die',
  };
}

export function getLevelUpHpReceipt(character = {}, choice = {}) {
  const currentMax = Math.max(
    1,
    Number(
      character.max_hit_points
      ?? character.max_hp
      ?? character.hit_points
      ?? character.hp
      ?? 1,
    ) || 1,
  );

  if (!choice?.valid || !Number.isFinite(Number(choice.gain))) {
    return {
      currentMax,
      nextMax: currentMax,
      gain: null,
      formula: '',
      sourceLabel: choice?.sourceLabel || '',
      valid: false,
    };
  }

  const gain = Math.max(1, Number(choice.gain) || 1);
  return {
    currentMax,
    nextMax: currentMax + gain,
    gain,
    formula: choice.formula,
    sourceLabel: choice.sourceLabel,
    valid: true,
  };
}
