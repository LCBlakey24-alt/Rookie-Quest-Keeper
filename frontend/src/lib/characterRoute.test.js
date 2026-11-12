import { characterIdFromPath } from './characterRoute';

test('reads the character id from sheet, edit and classic addresses', () => {
  expect(characterIdFromPath('/characters/abc-123')).toBe('abc-123');
  expect(characterIdFromPath('/characters/abc-123/edit')).toBe('abc-123');
  expect(characterIdFromPath('/characters/abc-123/classic')).toBe('abc-123');
});

test('the creator and the importer are not characters', () => {
  ['/characters/new', '/characters/create', '/characters/import', '/characters/New'].forEach((path) => {
    expect(characterIdFromPath(path)).toBe('');
  });
  expect(characterIdFromPath('/characters')).toBe('');
  expect(characterIdFromPath('/home')).toBe('');
});
