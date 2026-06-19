// Character builder origin expansion.
// Keeps the builder useful while the full public-content licensing pass is still
// in progress. Starter origins are generic/SRD-safe. Temporary QA backgrounds
// are hidden from the normal builder unless explicitly enabled for development.
import { BACKGROUNDS, RACES } from './characterRules5e';
import { STARTER_BACKGROUNDS, STARTER_SPECIES } from './starterOrigins5e';
import { TEST_BACKGROUNDS } from './testBackgrounds5e';

const SHOW_TEST_BACKGROUNDS = process.env.REACT_APP_SHOW_TEST_BACKGROUNDS === 'true';

Object.assign(RACES, STARTER_SPECIES);

Object.assign(
  BACKGROUNDS,
  STARTER_BACKGROUNDS,
  SHOW_TEST_BACKGROUNDS ? TEST_BACKGROUNDS : {}
);
