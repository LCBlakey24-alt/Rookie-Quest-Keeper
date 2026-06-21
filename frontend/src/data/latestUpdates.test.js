import { getLatestUpdates, LATEST_UPDATES } from './latestUpdates';

describe('latest updates feed', () => {
  test('returns the newest updates up to the requested limit', () => {
    expect(getLatestUpdates({ limit: 2 })).toEqual(LATEST_UPDATES.slice(0, 2));
  });

  test('can filter to public updates only', () => {
    expect(getLatestUpdates({ publicOnly: true }).every(update => update.public)).toBe(true);
  });

  test('keeps public homepage updates to one entry per date', () => {
    const publicUpdates = getLatestUpdates({ publicOnly: true, limit: 20 });
    const uniqueDates = new Set(publicUpdates.map(update => update.date));

    expect(uniqueDates.size).toBe(publicUpdates.length);
  });

  test('provides expandable detail text for homepage update cards', () => {
    const [latestUpdate] = getLatestUpdates({ publicOnly: true, limit: 1 });

    expect(latestUpdate).toEqual(expect.objectContaining({
      id: expect.any(String),
      date: expect.any(String),
      title: expect.any(String),
      summary: expect.any(String),
      details: expect.any(Array),
    }));
    expect(latestUpdate.details.length).toBeGreaterThan(0);
  });
});
