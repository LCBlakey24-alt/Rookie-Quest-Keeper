import { canonicalSpellId, getClassSpellAccess, getSpellById, SPELL_REGISTRY } from './spellRegistry';

describe('spellRegistry', () => {
  test('builds stable canonical spell IDs', () => {
    expect(canonicalSpellId('Magic Missile')).toBe('magic-missile');
    expect(getSpellById('Magic Missile')).toMatchObject({ id: 'magic-missile', name: 'Magic Missile', level: 1 });
  });

  test('exposes canonical spell metadata without duplicating spell text per class', () => {
    expect(SPELL_REGISTRY['cure-wounds']).toMatchObject({ name: 'Cure Wounds', source: 'SRD', rulesets: ['2014', '2024'] });
  });

  test('returns class spell access by ruleset and level', () => {
    const wizardSpells = getClassSpellAccess('Wizard', { ruleset: '2014', spellLevel: 1 });
    const clericSpells = getClassSpellAccess('Cleric', { ruleset: '2024', spellLevel: 1 });

    expect(wizardSpells[1].map(spell => spell.id)).toContain('magic-missile');
    expect(clericSpells[1].map(spell => spell.id)).toContain('cure-wounds');
    expect(wizardSpells[1].every(spell => spell.rulesets.includes('2014'))).toBe(true);
    expect(clericSpells[1].every(spell => spell.rulesets.includes('2024'))).toBe(true);
  });
});
