const WEAPON_MASTERY_OPTIONS = [
  { value: 'Cleave', key: 'cleave', summary: 'Carry damage through to another nearby target.' },
  { value: 'Graze', key: 'graze', summary: 'Deal a little damage even when an attack misses.' },
  { value: 'Nick', key: 'nick', summary: 'Fold a light-weapon follow-up into the Attack action.' },
  { value: 'Push', key: 'push', summary: 'Move the target away after a hit.' },
  { value: 'Sap', key: 'sap', summary: 'Make the target less effective on its next attack.' },
  { value: 'Slow', key: 'slow', summary: 'Reduce the target speed briefly.' },
  { value: 'Topple', key: 'topple', summary: 'Knock the target prone when the effect applies.' },
  { value: 'Vex', key: 'vex', summary: 'Set up advantage on your next attack against the target.' },
];

function rulesetOf(edition = '2024') {
  return String(edition).includes('2024') ? '2024' : '2014';
}

function normalise(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getFighterWeaponMasteryOptions(edition = '2024') {
  const ruleset = rulesetOf(edition);
  if (ruleset !== '2024') return [];
  return WEAPON_MASTERY_OPTIONS.map(option => ({
    value: option.value,
    label: option.value,
    key: option.key,
    summary: option.summary,
    ruleset,
  }));
}

export function isValidFighterWeaponMastery(value = '', edition = '2024') {
  const selected = normalise(value);
  return getFighterWeaponMasteryOptions(edition).some(option => option.key === selected || normalise(option.value) === selected);
}
