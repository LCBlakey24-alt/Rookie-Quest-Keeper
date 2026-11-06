/**
 * Group-check cards show each character's own result, matched by character id.
 */
import { mergeResults } from './GroupCheckDisplay';

const party = [
  { id: 'char-a', name: 'Aria' },
  { id: 'char-b', name: 'Aria' },
  { id: 'char-c', name: 'Bram' },
];

test('two characters with the same name each show their own roll', () => {
  const rows = mergeResults(party, [
    { id: 'r1', character_id: 'char-b', character_name: 'Aria', total: 21 },
    { id: 'r2', character_id: 'char-a', character_name: 'Aria', total: 8 },
  ]);
  expect(rows.map(row => [row.id, row.total])).toEqual([['char-a', 8], ['char-b', 21], ['char-c', null]]);
});

test('a result is never shown on the card of someone who has not rolled', () => {
  // Previously the first result also matched the first card by position.
  const rows = mergeResults(party, [{ id: 'r1', character_id: 'char-c', total: 15 }]);
  expect(rows.map(row => row.status)).toEqual(['pending', 'pending', 'rolled']);
});

test('a name alone does not claim a card', () => {
  const rows = mergeResults(party, [{ id: 'r1', name: 'Aria', actor: 'Aria', total: 19 }]);
  expect(rows.every(row => row.status === 'pending')).toBe(true);
});

test('success and failure follow the DC', () => {
  const rows = mergeResults(party.slice(0, 2), [
    { character_id: 'char-a', total: 15 },
    { character_id: 'char-b', total: 9 },
  ], 12);
  expect(rows.map(row => row.status)).toEqual(['success', 'failed']);
});
