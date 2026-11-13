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

describe('the SRD fallback for spells saved without a duration', () => {
  // eslint-disable-next-line global-require
  const { spellRequiresConcentration: needs, srdSpellNeedsConcentration } = require('./spellConcentrationRules');

  test('a built-in Bless or Hold Person, saved by name only, needs concentration', () => {
    expect(needs({ name: 'Bless' })).toBe(true);
    expect(needs({ name: 'Hold Person', level: 2 })).toBe(true);
    expect(needs({ name: 'Magic Missile' })).toBe(false);
  });

  test('the edition decides where the SRDs differ', () => {
    expect(needs({ name: 'Barkskin' }, { edition: '2014' })).toBe(true);
    expect(needs({ name: 'Barkskin' }, { edition: '2024' })).toBe(false);
    expect(needs({ name: 'Hex' }, { edition: '2024' })).toBe(true);
    expect(srdSpellNeedsConcentration('Pass without Trace', '2014')).toBe(true);
  });

  test('a book name the SRD prints without the wizard still matches', () => {
    expect(needs({ name: "Tasha's Hideous Laughter" })).toBe(true);
  });

  test('a saved flag or duration still wins over the name', () => {
    expect(needs({ name: 'Bless', concentration: false })).toBe(false);
    expect(needs({ name: 'Homebrew Glow', duration: 'Concentration, up to 1 minute' })).toBe(true);
  });
});
