import { chooseNextCampaignEvent, normaliseHomeData } from './campaignHomeData';

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

describe('GM Home session-date teaser', () => {
  const tiaKartaCalendar = {
    calendar_type: 'custom',
    current_year: 592, current_month: 1, current_day: 25,
    days_per_week: 6,
    custom_months: Array.from({ length: 12 }, (_, index) => ({ name: 'Month ' + (index + 1), days: 30 })),
  };

  test("shows today's six-day repeating event instead of hiding it as past", () => {
    const weekly = { name: 'Six-day council', year: 592, month: 1, day: 1, is_recurring: true, recurrence_type: 'weekly' };
    const next = chooseNextCampaignEvent([weekly], tiaKartaCalendar);
    expect(next).toMatchObject({ name: 'Six-day council', daysUntil: 0 });
  });

  test('ignores stale nonrecurring and invalid records instead of displaying Infinity', () => {
    const old = { name: 'Past festival', year: 592, month: 1, day: 10 };
    const invalid = { name: 'Invalid event', year: 592, month: 50, day: 10 };
    const future = { name: 'Court of Crowns', year: 592, month: 4, day: 1 };
    expect(chooseNextCampaignEvent([old, invalid, future], tiaKartaCalendar))
      .toMatchObject({ name: 'Court of Crowns', daysUntil: 66 });
    expect(chooseNextCampaignEvent([old, invalid], tiaKartaCalendar)).toBeNull();
  });

  test('the two independent campaign calendars choose different dates', () => {
    const event = { name: 'Supply delivery', year: 592, month: 1, day: 25 };
    expect(chooseNextCampaignEvent([event], tiaKartaCalendar).daysUntil).toBe(0);
    expect(chooseNextCampaignEvent([event], { ...tiaKartaCalendar, current_day: 1 }).daysUntil).toBe(24);
  });
});
