import { createInventoryBatch, partyInventoryRefreshWarning, resolvePartyInventoryRefreshResults } from './partyInventoryReliability';

describe('party inventory reliability helpers', () => {
  test('does not convert failed refresh sections into empty data', () => {
    const result = resolvePartyInventoryRefreshResults([
      { status: 'fulfilled', value: { data: [{ id: 'item-1' }] } },
      { status: 'rejected', reason: new Error('offline') },
      { status: 'fulfilled', value: { data: [{ target_id: 'character-1' }] } },
    ]);

    expect(result.data.items).toEqual([{ id: 'item-1' }]);
    expect(result.data.grantTargets).toEqual([{ target_id: 'character-1' }]);
    expect(result.data).not.toHaveProperty('currency');
    expect(result.failures).toEqual(['party funds']);
    expect(partyInventoryRefreshWarning(result.failures)).toMatch(/not treated as empty campaign data/i);
  });

  test('batch creation reports partial success immediately and stops at the first failure', async () => {
    const items = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
    const onCreated = jest.fn();
    const createItem = jest.fn(async (item) => {
      if (item.id === 'two') throw new Error('network failed');
      return { id: `saved-${item.id}` };
    });

    const result = await createInventoryBatch(items, createItem, onCreated);

    expect(createItem).toHaveBeenCalledTimes(2);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(items[0], { id: 'saved-one' });
    expect(result.created).toEqual([{ id: 'saved-one' }]);
    expect(result.failedItem).toEqual(items[1]);
    expect(result.error).toBeInstanceOf(Error);
  });
});
