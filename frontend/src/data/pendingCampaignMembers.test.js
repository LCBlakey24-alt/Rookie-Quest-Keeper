import { describePendingMembers, loadPendingCampaignMembers, pendingMembersFrom } from './pendingCampaignMembers';

describe('spotting players who are waiting for approval', () => {
  const members = [
    { id: 'm1', status: 'active', character_name: 'Ari' },
    { id: 'm2', status: 'pending', character_name: 'Jordan Crow' },
    { id: 'm3', status: 'pending', character_name: 'Kestra Vale' },
    { id: 'm4', status: 'removed', character_name: 'Old Hand' },
  ];

  test('finds only the pending ones', () => {
    expect(pendingMembersFrom(members).map((m) => m.id)).toEqual(['m2', 'm3']);
  });

  test('is not confused by casing or a missing status', () => {
    expect(pendingMembersFrom([{ status: 'PENDING' }, { status: 'Pending' }, {}])).toHaveLength(2);
  });

  test('survives a response that is not a list', () => {
    [null, undefined, {}, 'nope'].forEach((value) => {
      expect(pendingMembersFrom(value)).toEqual([]);
    });
  });
});

describe('naming who is waiting', () => {
  test('reads as a sentence for one, two or more', () => {
    expect(describePendingMembers([{ status: 'pending', character_name: 'Ari' }])).toBe('Ari');
    expect(describePendingMembers([
      { status: 'pending', character_name: 'Ari' },
      { status: 'pending', character_name: 'Bryn' },
    ])).toBe('Ari and Bryn');
    expect(describePendingMembers([
      { status: 'pending', character_name: 'Ari' },
      { status: 'pending', character_name: 'Bryn' },
      { status: 'pending', character_name: 'Cass' },
    ])).toBe('Ari, Bryn and Cass');
  });

  test('falls back to the username when a character has no name yet', () => {
    expect(describePendingMembers([{ status: 'pending', username: 'rowan' }])).toBe('rowan');
  });

  test('says nothing when nobody is waiting', () => {
    expect(describePendingMembers([{ status: 'active', character_name: 'Ari' }])).toBe('');
  });
});

describe('loading the waiting list', () => {
  test('asks the GM members endpoint and keeps only pending', async () => {
    const apiClient = {
      get: jest.fn().mockResolvedValue({ data: [
        { id: 'a', status: 'active' },
        { id: 'p', status: 'pending' },
      ] }),
    };

    await expect(loadPendingCampaignMembers(apiClient, 'camp-1')).resolves.toEqual([{ id: 'p', status: 'pending' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/campaign-invites/camp-1/members');
  });

  test('a failure returns nobody rather than breaking Live Play', async () => {
    // This only powers an explanatory message. It must never replace a
    // working screen with an error.
    const apiClient = { get: jest.fn().mockRejectedValue(new Error('403')) };
    await expect(loadPendingCampaignMembers(apiClient, 'camp-1')).resolves.toEqual([]);
  });

  test('does not call out without a campaign', async () => {
    const apiClient = { get: jest.fn() };
    await expect(loadPendingCampaignMembers(apiClient, '')).resolves.toEqual([]);
    expect(apiClient.get).not.toHaveBeenCalled();
  });
});
