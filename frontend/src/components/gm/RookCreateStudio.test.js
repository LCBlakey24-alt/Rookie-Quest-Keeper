import { notifyRookContentSaved } from './RookCreateStudio';

describe('RookCreateStudio save notifications', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  test('includes campaign details and refreshes the matching campaign workspace', () => {
    window.history.pushState({}, '', '/campaign/campaign-1#tab-npcs');
    const contentHandler = jest.fn();
    const hashHandler = jest.fn();
    window.addEventListener('rook-content-saved', contentHandler);
    window.addEventListener('hashchange', hashHandler);

    const entity = { id: 'npc-1', name: 'Jordan Crow' };
    notifyRookContentSaved({ campaignId: 'campaign-1', entityType: 'npc', entity });

    expect(contentHandler).toHaveBeenCalledTimes(1);
    expect(contentHandler.mock.calls[0][0].detail).toEqual({
      campaignId: 'campaign-1',
      entityType: 'npc',
      entity,
    });
    expect(hashHandler).toHaveBeenCalledTimes(1);

    window.removeEventListener('rook-content-saved', contentHandler);
    window.removeEventListener('hashchange', hashHandler);
  });

  test('does not remount an unrelated page', () => {
    window.history.pushState({}, '', '/home');
    const hashHandler = jest.fn();
    window.addEventListener('hashchange', hashHandler);

    notifyRookContentSaved({
      campaignId: 'campaign-1',
      entityType: 'quest',
      entity: { id: 'quest-1', title: 'River Trouble' },
    });

    expect(hashHandler).not.toHaveBeenCalled();
    window.removeEventListener('hashchange', hashHandler);
  });
});
