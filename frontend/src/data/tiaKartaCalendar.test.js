import {
  advanceCustomCalendar, calendarDaysUntil, calendarOrdinal,
  TIA_KARTA_MONTHS, TIA_KARTA_REFERENCE_EVENTS, tiaKartaCalendar,
} from './tiaKartaCalendar';

const calendar = tiaKartaCalendar('eldritch-heralds');

describe('canonical Tia-Karta six-day calendar', () => {
  test('uses 12 thirty-day months and four correct named seasons', () => {
    expect(calendar.custom_months).toHaveLength(12);
    expect(calendar.custom_months.map(({ name }) => name)).toEqual([
      'Dawnseed', 'Rainmoot', 'Bloomrise',
      'Suncrest', 'Highsun', 'Goldflame',
      'Harvestwane', 'Amberfall', 'Duskmarch',
      'Frostveil', 'Longnight', 'Thawrest',
    ]);
    expect(TIA_KARTA_MONTHS.reduce((sum, month) => sum + month.days, 0)).toBe(360);
    expect(calendar.days_per_week).toBe(6);
    expect([calendar.current_day, calendar.current_month, calendar.current_year]).toEqual([25, 1, 592]);
    expect(calendar.custom_months[0].season).toBe('Greenwake');
    expect(calendar.custom_months[3].season).toBe('Sunhigh');
    expect(calendar.custom_months[6].season).toBe('Emberfall');
    expect(calendar.custom_months[9].season).toBe('Frostdeep');
  });

  test('retains a separate Wednesday session date when applying the same world calendar', () => {
    const wednesday = tiaKartaCalendar('spilsby-wednesday', {
      calendar_type: 'custom', current_day: 1, current_month: 1, current_year: 592,
    });
    expect([wednesday.current_day, wednesday.current_month, wednesday.current_year]).toEqual([1, 1, 592]);
    expect(wednesday.custom_months).toEqual(calendar.custom_months);
  });

  test('Court of Crowns is 66 days from the Heralds current date', () => {
    const event = TIA_KARTA_REFERENCE_EVENTS.find(item => item.name === 'Court of Crowns Summit');
    expect(calendarDaysUntil(event, calendar)).toBe(66);
    expect(calendarDaysUntil({ day: 28, month: 1, year: 592 }, calendar)).toBe(3);
    expect(calendarDaysUntil({ day: 24, month: 2, year: 592 }, calendar)).toBe(29);
  });

  test('six-day weeks and thirty-day months roll into next month and next year', () => {
    expect(advanceCustomCalendar(calendar, 5)).toEqual({
      current_day: 30, current_month: 1, current_year: 592,
    });
    expect(advanceCustomCalendar(calendar, 6)).toEqual({
      current_day: 1, current_month: 2, current_year: 592,
    });
    expect(advanceCustomCalendar(calendar, 336)).toEqual({
      current_day: 1, current_month: 1, current_year: 593,
    });
  });

  test('invalid day and month cannot create calendar events', () => {
    expect(calendarOrdinal(calendar, 592, 1, 31)).toBeNull();
    expect(calendarOrdinal(calendar, 592, 13, 1)).toBeNull();
    expect(() => advanceCustomCalendar(calendar, 0)).toThrow();
  });

  test('private GM-only future consequences are never seeded as general calendar events', () => {
    expect(TIA_KARTA_REFERENCE_EVENTS.some(event => event.name.includes('Godfrey'))).toBe(false);
  });
});
