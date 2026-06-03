import { BACKGROUNDS } from './characterRules5e';

export const GLADIATOR_BACKGROUND = {
  name: 'Gladiator',
  description: 'Arena performer or pit fighter with a fearsome reputation.',
  skillProficiencies: ['Athletics', 'Performance'],
  toolProficiencies: ['Disguise kit', 'Musical instrument'],
  equipment: ['Costume', 'Arena token', 'Common clothes', '15 gp'],
  feature: 'Arena Reputation',
  asi2024: { strength: 2, charisma: 1 },
  originFeat2024: 'Savage Attacker'
};

export function getCompatibleBackgrounds(extraBackgrounds = {}) {
  return {
    ...BACKGROUNDS,
    Gladiator: BACKGROUNDS.Gladiator || GLADIATOR_BACKGROUND,
    ...extraBackgrounds,
  };
}
