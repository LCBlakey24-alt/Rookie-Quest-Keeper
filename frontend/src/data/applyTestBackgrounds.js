// Character builder origin expansion.
// Keeps the builder useful while the full public-content licensing pass is still
// in progress. Starter origins are generic/SRD-safe; TEST_BACKGROUNDS remain
// clearly labelled as temporary QA coverage.
import { BACKGROUNDS, RACES } from './characterRules5e';
import { STARTER_BACKGROUNDS, STARTER_SPECIES } from './starterOrigins5e';
import { TEST_BACKGROUNDS } from './testBackgrounds5e';

Object.assign(RACES, STARTER_SPECIES);

Object.assign(BACKGROUNDS, STARTER_BACKGROUNDS, TEST_BACKGROUNDS, {
  Gladiator: TEST_BACKGROUNDS.Gladiator || {
    name: 'Gladiator',
    description: 'Arena performer or pit fighter with a fearsome reputation.',
    skillProficiencies: ['Athletics', 'Performance'],
    toolProficiencies: ['Disguise kit', 'Musical instrument'],
    equipment: ['Costume', 'Arena token', 'Common clothes', '15 gp'],
    feature: 'Arena Reputation',
    asi2024: { strength: 2, charisma: 1 },
    originFeat2024: 'Savage Attacker'
  }
});
