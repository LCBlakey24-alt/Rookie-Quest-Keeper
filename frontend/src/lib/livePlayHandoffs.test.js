import { persistLivePlayHandoff } from './livePlayHandoffs';

describe('persistLivePlayHandoff', () => {
  test('stores a handoff value', () => {
    const values = new Map();
    const storage = {
      setItem: (key, value) => values.set(key, value),
    };

    expect(persistLivePlayHandoff(storage, 'gm.liveNpcSearch.c1', 'Docks')).toBe(true);
    expect(values.get('gm.liveNpcSearch.c1')).toBe('Docks');
  });

  test('reports storage failure instead of pretending the handoff succeeded', () => {
    const storage = {
      setItem: () => { throw new Error('quota exceeded'); },
    };

    expect(persistLivePlayHandoff(storage, 'gm.liveNotePrefill.c1', 'Docks: ')).toBe(false);
  });
});
