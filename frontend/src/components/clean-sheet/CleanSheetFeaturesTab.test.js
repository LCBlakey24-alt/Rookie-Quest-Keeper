import { formatActionCost, resolveActionResourceCost } from './CleanSheetFeaturesTab';

describe('CleanSheetFeaturesTab homebrew action resources', () => {
  const resources = [
    {
      key: 'scarab_charges',
      label: 'Scarab Charges',
      current: 2,
      max: 9,
      fieldKey: 'scarab_charges',
    },
    {
      key: 'greed_tokens',
      label: 'Greed Tokens',
      current: 4,
      max: 4,
      fieldKey: 'greed_tokens',
    },
  ];

  test('matches singular action cost text to a plural tracked resource', () => {
    const spend = resolveActionResourceCost({
      name: 'Spend Scarab Charge',
      cost: '1 Scarab Charge',
    }, resources);

    expect(spend).toMatchObject({
      amount: 1,
      resource: expect.objectContaining({ key: 'scarab_charges' }),
    });
  });

  test('matches structured resource cost objects from parsed homebrew', () => {
    const spend = resolveActionResourceCost({
      name: 'Hoard Flash',
      resource_cost: { resource: 'Greed Tokens', amount: 2 },
    }, resources);

    expect(spend).toMatchObject({
      amount: 2,
      resource: expect.objectContaining({ key: 'greed_tokens' }),
    });
  });

  test('formats structured costs as safe display text', () => {
    expect(formatActionCost({ resource: 'Greed Tokens', amount: 2 })).toBe('2 Greed Tokens');
    expect(formatActionCost({ scarab_charges: 1 })).toBe('1 Scarab Charges');
    expect(formatActionCost(['bonus action', { resource: 'Scarab Charges', amount: 1 }])).toBe('bonus action • 1 Scarab Charges');
  });
});
