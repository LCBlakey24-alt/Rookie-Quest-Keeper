import { readFileSync } from 'fs';
import path from 'path';

// A character with nothing equipped must not get an invented weapon attack.
test('the combat tab offers no made-up fallback weapon attack', () => {
  const src = readFileSync(path.join(__dirname, 'CleanCombatTab.js'), 'utf8');
  expect(src).not.toContain('Fallback weapon attack');
  expect(src).toContain('data-testid="combat-no-weapon"');
});
