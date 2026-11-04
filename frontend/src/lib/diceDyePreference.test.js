import { DEFAULT_DYE_ID } from '@/components/dice3d/diceDyes';
import { loadDiceDyeId, saveDiceDyeId, subscribeDiceDye } from './diceDyePreference';

describe('the dice dye preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('starts on the default dye', () => {
    expect(loadDiceDyeId()).toBe(DEFAULT_DYE_ID);
  });

  test('remembers a choice', () => {
    saveDiceDyeId('garnet');
    expect(loadDiceDyeId()).toBe('garnet');
  });

  test('ignores a value that is not a dye', () => {
    // A stale or hand-edited key must not leave the tray without a palette.
    window.localStorage.setItem('rq-dice-dye', 'chartreuse');
    expect(loadDiceDyeId()).toBe(DEFAULT_DYE_ID);
  });

  test('refuses to save an unknown dye, storing the fallback instead', () => {
    expect(saveDiceDyeId('chartreuse')).toBe(DEFAULT_DYE_ID);
    expect(loadDiceDyeId()).toBe(DEFAULT_DYE_ID);
  });

  test('survives storage being unavailable', () => {
    // Private windows and blocked site data make localStorage throw. The
    // choice should stop persisting, not break the roller.
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => saveDiceDyeId('moss')).not.toThrow();
    expect(loadDiceDyeId()).toBe(DEFAULT_DYE_ID);

    getItem.mockRestore();
    setItem.mockRestore();
  });

  test('tells an open roller when the choice changes', () => {
    const seen = [];
    const unsubscribe = subscribeDiceDye((id) => seen.push(id));

    saveDiceDyeId('ember');
    expect(seen).toEqual(['ember']);

    unsubscribe();
    saveDiceDyeId('bone');
    expect(seen).toEqual(['ember']);
  });
});
