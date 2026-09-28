import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('player sheet initiative wiring', () => {
  test('the live character sheet uses the canonical initiative modifier helper', () => {
    const desktop = read('./CleanCharacterSheet.js');

    expect(desktop).toContain("import { getInitiativeModifier } from '@/data/initiativeRules';");
    expect(desktop).toContain('const initiative = getInitiativeModifier(character);');
    expect(desktop).not.toContain('const initiative = mod(character?.dexterity);');
  });
});
