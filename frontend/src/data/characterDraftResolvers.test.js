import {
  resolveClassName,
  resolveDraftClassName,
  resolveDraftSubclassName,
  resolvePayloadClassName,
  resolvePayloadSubclassName,
  resolveRulesEdition,
  resolveSubclassName,
} from './characterDraftResolvers';

const CLASSES = {
  Fighter: {},
  Warlock: {},
  'Blood Hunter': {},
};

const SUBCLASSES = ['Champion', 'Battle Master', { name: 'Eldritch Knight' }];

describe('character draft resolvers', () => {
  test('resolves class names case-insensitively against known classes', () => {
    expect(resolveClassName('warlock', CLASSES)).toBe('Warlock');
    expect(resolveClassName('blood hunter', CLASSES)).toBe('Blood Hunter');
    expect(resolveClassName({ name: 'fighter' }, CLASSES)).toBe('Fighter');
  });

  test('preserves unknown class names for homebrew fallback paths', () => {
    expect(resolveClassName('Runesmith', CLASSES)).toBe('Runesmith');
  });

  test('defaults to Fighter when no class value is available', () => {
    expect(resolveClassName('', CLASSES)).toBe('Fighter');
    expect(resolveDraftClassName({}, CLASSES)).toBe('Fighter');
  });

  test('reads draft class aliases used by creator, imports, and edit payloads', () => {
    expect(resolveDraftClassName({ characterClass: 'Warlock' }, CLASSES)).toBe('Warlock');
    expect(resolveDraftClassName({ character_class: 'warlock' }, CLASSES)).toBe('Warlock');
    expect(resolveDraftClassName({ className: 'Blood Hunter' }, CLASSES)).toBe('Blood Hunter');
    expect(resolveDraftClassName({ class_name: 'fighter' }, CLASSES)).toBe('Fighter');
    expect(resolveDraftClassName({ class: { name: 'warlock' } }, CLASSES)).toBe('Warlock');
  });

  test('reads payload class aliases with backend field priority first', () => {
    expect(resolvePayloadClassName({ character_class: 'Fighter', characterClass: 'Warlock' }, CLASSES)).toBe('Fighter');
    expect(resolvePayloadClassName({ characterClass: 'Warlock' }, CLASSES)).toBe('Warlock');
    expect(resolvePayloadClassName({ class_name: 'blood hunter' }, CLASSES)).toBe('Blood Hunter');
  });

  test('resolves subclass names against the current class subclass list', () => {
    expect(resolveSubclassName('battle master', SUBCLASSES)).toBe('Battle Master');
    expect(resolveSubclassName({ name: 'eldritch knight' }, SUBCLASSES)).toBe('Eldritch Knight');
    expect(resolveSubclassName('Fiend', SUBCLASSES)).toBe('');
    expect(resolveSubclassName('', SUBCLASSES, 'Champion')).toBe('Champion');
  });

  test('reads draft and payload subclass aliases without accepting invalid stale subclasses', () => {
    expect(resolveDraftSubclassName({ subclassName: 'battle master' }, SUBCLASSES)).toBe('Battle Master');
    expect(resolveDraftSubclassName({ archetype: 'champion' }, SUBCLASSES)).toBe('Champion');
    expect(resolvePayloadSubclassName({ patron: 'Fiend' }, SUBCLASSES)).toBe('');
    expect(resolvePayloadSubclassName({ subclass: 'eldritch knight' }, SUBCLASSES)).toBe('Eldritch Knight');
  });

  test('normalises rules edition aliases', () => {
    expect(resolveRulesEdition({ edition: '2024' })).toBe('2024');
    expect(resolveRulesEdition({ rulesEdition: 'D&D 2024' })).toBe('2024');
    expect(resolveRulesEdition({ rules_edition: '2014' })).toBe('2014');
    expect(resolveRulesEdition({ ruleset: 'legacy-2014' })).toBe('2014');
    expect(resolveRulesEdition({})).toBe('2014');
  });
});
