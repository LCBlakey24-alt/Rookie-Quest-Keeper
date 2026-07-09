import {
  resolveClassName,
  resolveDraftClassName,
  resolvePayloadClassName,
  resolveRulesEdition,
} from './characterDraftResolvers';

const CLASSES = {
  Fighter: {},
  Warlock: {},
  'Blood Hunter': {},
};

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

  test('normalises rules edition aliases', () => {
    expect(resolveRulesEdition({ edition: '2024' })).toBe('2024');
    expect(resolveRulesEdition({ rulesEdition: 'D&D 2024' })).toBe('2024');
    expect(resolveRulesEdition({ rules_edition: '2014' })).toBe('2014');
    expect(resolveRulesEdition({ ruleset: 'legacy-2014' })).toBe('2014');
    expect(resolveRulesEdition({})).toBe('2014');
  });
});
