import { createDisplayState, publishDisplayState, subscribeDisplayState } from './liveDisplayBus';

describe('liveDisplayBus', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('publishes to local subscribers immediately for same-browser player display refresh', () => {
    const received = [];
    const unsubscribe = subscribeDisplayState('campaign-1', state => received.push(state));
    const state = createDisplayState('title', { title: 'Scene changed' });

    publishDisplayState('campaign-1', state);
    unsubscribe();

    expect(received[received.length - 1]).toMatchObject({ mode: 'title', payload: { title: 'Scene changed' } });
  });
});
