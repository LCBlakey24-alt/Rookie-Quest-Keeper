import { getLatestUpdates, LATEST_UPDATES } from './latestUpdates';

describe('latest updates feed', () => {
  test('returns the newest updates up to the requested limit', () => {
    expect(getLatestUpdates({ limit: 2 })).toEqual(LATEST_UPDATES.slice(0, 2));
  });

  test('can filter to public updates only', () => {
    expect(getLatestUpdates({ publicOnly: true }).every(update => update.public)).toBe(true);
  });
});
