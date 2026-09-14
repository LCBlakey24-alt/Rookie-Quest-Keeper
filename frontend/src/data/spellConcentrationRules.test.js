import { spellRequiresConcentration } from './spellConcentrationRules';

describe('spellRequiresConcentration', () => {
  test('uses an explicit concentration flag even without description wording', () => {
    expect(spellRequiresConcentration({ name: 'Homebrew Bind', concentration: true, description: 'Holds the target in place.' })).toBe(true);
  });

  test('treats an explicit false flag as authoritative', () => {
    expect(spellRequiresConcentration({ concentration: false, description: 'Mentions concentration only as flavour text.' })).toBe(false);
  });

  test('supports common snake and camel case imported fields', () => {
    expect(spellRequiresConcentration({ requires_concentration: true })).toBe(true);
    expect(spellRequiresConcentration({ requiresConcentration: 'yes' })).toBe(true);
    expect(spellRequiresConcentration({ is_concentration: 1 })).toBe(true);
    expect(spellRequiresConcentration({ isConcentration: 'false' })).toBe(false);
  });

  test('recognises concentration in duration metadata', () => {
    expect(spellRequiresConcentration({ duration: 'Concentration, up to 1 minute' })).toBe(true);
  });

  test('preserves legacy description-based detection', () => {
    expect(spellRequiresConcentration({ description: 'This spell requires concentration for up to one minute.' })).toBe(true);
  });

  test('does not mark an ordinary spell as concentration', () => {
    expect(spellRequiresConcentration({ name: 'Magic Missile', duration: 'Instantaneous', description: 'Darts of force strike their targets.' })).toBe(false);
  });
});
