// Development/testing background expansion.
// Mutates the shared BACKGROUNDS object so existing builders can see the
// expanded test list without risky rewrites of characterRules5e.js.
// Remove this import or replace with licensed/SRD-safe content before paid public launch.
import { BACKGROUNDS } from './characterRules5e';
import { TEST_BACKGROUNDS } from './testBackgrounds5e';

Object.assign(BACKGROUNDS, TEST_BACKGROUNDS, {
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
