import {
  buildRookieRelationshipPayload,
  extractFamilyName,
  generateRelatedNpcName,
  generateRookieName,
  normaliseRookieAncestry,
} from './rookieEngine';

describe('Rookie Engine', () => {
  test('extracts a family name from an existing NPC', () => {
    expect(extractFamilyName('Lucian Grey')).toBe('Grey');
    expect(extractFamilyName('Merithera Anora of Balderin')).toBe('Balderin');
    expect(extractFamilyName('Godfrey')).toBe('');
  });

  test('normalises common ancestry labels', () => {
    expect(normaliseRookieAncestry('Half-Orc')).toBe('half_orc');
    expect(normaliseRookieAncestry('Half Elf')).toBe('half_elf');
    expect(normaliseRookieAncestry('Dragonborn')).toBe('dragonborn');
    expect(normaliseRookieAncestry('Unknown Thing')).toBe('human');
  });

  test('a generated sibling inherits the existing NPC family name', () => {
    const result = generateRelatedNpcName({
      sourceNpc: { id: 'lucian', name: 'Lucian Grey', race: 'Human' },
      relationship: 'sibling',
      gender: 'female',
    });

    expect(result.surname).toBe('Grey');
    expect(result.fullName.endsWith(' Grey')).toBe(true);
    expect(result.inheritedFamilyName).toBe(true);
    expect(result.ancestry).toBe('human');
  });

  test('a generated child inherits the existing NPC family name', () => {
    const result = generateRelatedNpcName({
      sourceNpc: { id: 'godfrey', name: 'Godfrey Barfoot', race: 'Halfling' },
      relationship: 'child',
      gender: 'any',
    });

    expect(result.surname).toBe('Barfoot');
    expect(result.ancestry).toBe('halfling');
  });

  test('non-family relationships do not force the source surname', () => {
    const result = generateRelatedNpcName({
      sourceNpc: { id: 'x', name: 'Someone ImpossibleSurnameXYZ', race: 'Elf' },
      relationship: 'friend',
      gender: 'neutral',
    });

    expect(result.surname).not.toBe('ImpossibleSurnameXYZ');
    expect(result.ancestry).toBe('elf');
  });

  test('relationship payload uses the existing relationship API shape', () => {
    const payload = buildRookieRelationshipPayload({
      sourceNpc: { id: 'lucian', name: 'Lucian Grey' },
      targetNpc: { id: 'elara', name: 'Elara Grey' },
      relationship: 'sibling',
    });

    expect(payload).toEqual({
      source_id: 'lucian',
      target_id: 'elara',
      relationship_type: 'family',
      description: 'Elara Grey is the sibling of Lucian Grey.',
    });
  });

  test('plain local name generation returns a complete name without an API', () => {
    const result = generateRookieName({ ancestry: 'Dwarf', gender: 'male' });
    expect(result.firstName).toBeTruthy();
    expect(result.surname).toBeTruthy();
    expect(result.fullName).toContain(' ');
    expect(result.generationSource).toBe('rookie-engine');
  });
});
