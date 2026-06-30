jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
import { getRookCharacterMatches } from './RookCharacterMatchmaker';

describe('RookCharacterMatchmaker local matcher', () => {
  test('returns three sensible Batman-style matches', () => {
    const matches = getRookCharacterMatches({
      description: 'I want to be like Batman but in D&D',
      magic: 'some',
      complexity: 'balanced',
    });

    expect(matches).toHaveLength(3);
    expect(matches[0].title).toBe('The Haunted Protector');
    expect(matches[0].suggestedClass).toBe('Paladin');
  });

  test('honors a known preferred class when an archetype supports it', () => {
    const matches = getRookCharacterMatches({
      description: 'I want music, lies, and chaos',
      preferredClass: 'Bard',
    });

    expect(matches[0].suggestedClass).toBe('Bard');
  });

  test('always returns three unique match cards', () => {
    const matches = getRookCharacterMatches({
      description: 'I want something simple and easy that can hit things',
      magic: 'none',
      complexity: 'simple',
    });

    expect(new Set(matches.map((match) => match.id)).size).toBe(3);
  });

  test('uses class starter gear for equipment preview', () => {
    const matches = getRookCharacterMatches({ preferredClass: 'Fighter' });

    expect(matches[0].equipmentPreview).toEqual(expect.any(Array));
    expect(matches[0].equipmentPreview.length).toBeGreaterThan(0);
  });
});
