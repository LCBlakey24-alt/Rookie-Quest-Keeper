import {
  buildResourcePatch,
  canPatchResource,
  getSheetResourceCards,
  isSpellPoolResource,
  resourceRecoveryLabel,
} from './cleanSheetResourceUtils';

describe('clean sheet resource trackers', () => {
  test('deduplicates canonical resource state and keeps the patchable saved tracker', () => {
    const character = {
      resources: {
        ki: {
          label: 'Ki',
          current: 3,
          remaining: 3,
          max: 5,
          restore: 'short-rest',
          className: 'Monk',
        },
      },
    };
    const snapshot = [{
      key: 'ki',
      label: 'Ki',
      className: 'Monk',
      current: 5,
      max: 5,
      restore: 'short-rest',
    }];

    const resources = getSheetResourceCards(character, snapshot);

    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({
      key: 'ki',
      label: 'Ki',
      current: 3,
      max: 5,
      fieldKey: 'ki',
    });
    expect(canPatchResource(resources[0])).toBe(true);
  });

  test('builds a nested resources patch without losing sibling resources', () => {
    const resourceMap = {
      ki: { label: 'Ki', current: 3, remaining: 3, max: 5 },
      action_surge: { label: 'Action Surge', current: 1, remaining: 1, max: 1 },
    };
    const resource = {
      key: 'ki',
      fieldKey: 'ki',
      raw: resourceMap.ki,
      resourceMap,
      max: 5,
    };

    expect(buildResourcePatch(resource, 2)).toEqual({
      resources: {
        ki: { label: 'Ki', current: 2, remaining: 2, max: 5 },
        action_surge: { label: 'Action Surge', current: 1, remaining: 1, max: 1 },
      },
    });
  });

  test('supports legacy direct sorcery point persistence', () => {
    const resources = getSheetResourceCards({
      sorcery_points: 4,
      sorcery_points_remaining: 2,
    });

    expect(resources).toEqual([expect.objectContaining({
      key: 'sorcery_points',
      current: 2,
      max: 4,
      field: 'sorcery_points_remaining',
    })]);
    expect(buildResourcePatch(resources[0], 1)).toEqual({ sorcery_points_remaining: 1 });
  });

  test('identifies spell pools so the general resource rail can keep them in Spells', () => {
    expect(isSpellPoolResource({ key: 'pact_magic', label: 'Pact Magic' })).toBe(true);
    expect(isSpellPoolResource({ key: 'spell_slots', label: 'Spell Slots' })).toBe(true);
    expect(isSpellPoolResource({ key: 'sorcery_points', label: 'Sorcery Points' })).toBe(false);
    expect(isSpellPoolResource({ key: 'ki', label: 'Focus Points' })).toBe(false);
  });

  test('formats common recovery cadences for compact display', () => {
    expect(resourceRecoveryLabel({ restore: 'short-rest' })).toBe('Short Rest');
    expect(resourceRecoveryLabel({ restore: 'long-rest' })).toBe('Long Rest');
    expect(resourceRecoveryLabel({ restore: 'dawn' })).toBe('Dawn');
  });
});
