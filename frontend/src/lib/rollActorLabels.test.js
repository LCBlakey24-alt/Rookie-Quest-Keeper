import { rollActorDisplayName } from './rollActorLabels';

test('uses a plain name when only one character has it', () => {
  const actor = { name: 'Aria', character_id: 'char-a' };
  expect(rollActorDisplayName(actor, [actor])).toBe('Aria');
});

test('labels different characters with the same name using their public character ids', () => {
  const actors = [
    { name: 'Aria', character_id: 'char-a' },
    { name: 'Aria', character_id: 'char-b' },
  ];
  expect(rollActorDisplayName(actors[0], actors)).toBe('Aria (char-a)');
  expect(rollActorDisplayName(actors[1], actors)).toBe('Aria (char-b)');
  expect(rollActorDisplayName({ name: 'Aria', character_id: 'char-b' }, actors)).toBe('Aria (char-b)');
});

test('expands the suffix if two character ids have the same ending', () => {
  const actors = [
    { name: 'Aria', character_id: 'different-prefix-0000' },
    { name: 'Aria', character_id: 'another-prefix-0000' },
  ];
  expect(rollActorDisplayName(actors[0], actors)).not.toBe(rollActorDisplayName(actors[1], actors));
});

test('does not invent an identity when historical awards lack a character id', () => {
  const actors = [{ name: 'Aria', character_id: 'char-a' }, { name: 'Aria', character_id: 'char-b' }];
  expect(rollActorDisplayName({ name: 'Aria' }, actors)).toBe('Aria');
});
