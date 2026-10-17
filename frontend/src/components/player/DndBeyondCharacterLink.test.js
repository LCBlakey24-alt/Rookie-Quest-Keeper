import { normaliseDndBeyondLink } from './DndBeyondCharacterLink';

describe('D&D Beyond character share-link allowlist', () => {
  test('accepts public character links and canonicalises away query strings', () => {
    expect(normaliseDndBeyondLink('https://www.dndbeyond.com/characters/12345678?share=1'))
      .toBe('https://www.dndbeyond.com/characters/12345678');
    expect(normaliseDndBeyondLink('https://dndbeyond.com/profile/Player_One/characters/9876543'))
      .toBe('https://www.dndbeyond.com/characters/9876543');
    expect(normaliseDndBeyondLink('https://www.dndbeyond.com/characters/150614396/B9Mp61'))
      .toBe('https://www.dndbeyond.com/characters/150614396/B9Mp61');
  });

  test('refuses other sites, private addresses and arbitrary D&D Beyond pages', () => {
    for (const value of [
      'https://dndbeyond.com.evil.test/characters/3',
      'https://dndbeyond.com@evil.test/characters/3',
      'http://www.dndbeyond.com/characters/3',
      'https://www.dndbeyond.com:9000/characters/3',
      'https://www.dndbeyond.com/marketplace/characters/3',
      'https://www.dndbeyond.com/characters/abc',
      'file:///etc/hosts',
    ]) expect(normaliseDndBeyondLink(value)).toBeNull();
  });
});
