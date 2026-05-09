// Development/testing background expansion.
// Mutates the shared BACKGROUNDS object so existing builders can see the
// expanded test list without risky rewrites of characterRules5e.js.
// Remove this import or replace with licensed/SRD-safe content before paid public launch.
import { BACKGROUNDS } from './characterRules5e';
import { TEST_BACKGROUNDS } from './testBackgrounds5e';

Object.assign(BACKGROUNDS, TEST_BACKGROUNDS);
