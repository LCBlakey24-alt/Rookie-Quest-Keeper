// Full offline SRD 5.1 bestiary under CC BY 4.0.
import SRD_5_1_MONSTERS from './srd5eMonsters.generated.json';

// Only SRD creatures ship. The former non-SRD legacy fallback entries
// were removed from the built-in catalogue and public repository. Existing
// private account-owned campaign records are not changed by this module.
export const MONSTER_DATABASE = [...SRD_5_1_MONSTERS];

// Monster types for filtering
export const MONSTER_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental',
  'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'
];

// Challenge Rating options for filtering
export const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '30'
];

// Get numeric CR value for sorting
export const getCRValue = (cr) => {
  if (cr === '0') return 0;
  if (cr === '1/8') return 0.125;
  if (cr === '1/4') return 0.25;
  if (cr === '1/2') return 0.5;
  return parseFloat(cr);
};

// Calculate XP from CR
export const getXPFromCR = (cr) => {
  const xpByCR = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700,
    '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
    '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000,
    '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
    '23': 50000, '24': 62000, '30': 155000
  };
  return xpByCR[cr] || 0;
};

export default MONSTER_DATABASE;
