import { normaliseHomeData } from './campaignHomeData';

describe('normaliseHomeData', () => {
  test.each([null, undefined, false, 0, 'bad payload'])(
    'returns an empty safe home shape for %p',
    payload => {
      expect(normaliseHomeData(payload)).toEqual({
        quests: [],
        arcs: [],
        npcs: [],
        locations: [],
        notes: [],
        calendar: null,
        events: [],
      });
    },
  );

  test('keeps valid arrays and calendar data while sanitising malformed fields', () => {
    const calendar = { current_day: 4 };

    expect(normaliseHomeData({
      quests: [{ id: 'q1' }],
      arcs: null,
      npcs: 'not-an-array',
      locations: [],
      notes: [{ id: 'n1' }],
      calendar,
      events: [{ id: 'e1' }],
    })).toEqual({
      quests: [{ id: 'q1' }],
      arcs: [],
      npcs: [],
      locations: [],
      notes: [{ id: 'n1' }],
      calendar,
      events: [{ id: 'e1' }],
    });
  });
});
