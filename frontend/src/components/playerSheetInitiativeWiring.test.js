import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('player sheet initiative wiring', () => {
  test('desktop and mobile player sheets use the canonical initiative modifier helper', () => {
    const desktop = read('./CleanCharacterSheet.js');
    const mobile = read('./PlayerMobileRailSheet.js');

    expect(desktop).toContain("import { getInitiativeModifier } from '@/data/initiativeRules';");
    expect(desktop).toContain('const initiative = getInitiativeModifier(character);');
    expect(desktop).not.toContain('const initiative = mod(character?.dexterity);');

    expect(mobile).toContain("import { getInitiativeModifier } from '@/data/initiativeRules';");
    expect(mobile).toContain('value={fmt(getInitiativeModifier(character))}');
    expect(mobile).not.toContain('value={fmt(mod(character.dexterity))}');
  });
});
