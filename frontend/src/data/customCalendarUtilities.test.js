import { calendarMonthAfter, daysUntilNextOccurrence, eventOccursOn } from './customCalendarUtilities';
import { tiaKartaCalendar } from './tiaKartaCalendar';

const calendar = tiaKartaCalendar('eldritch-heralds');
const annual = { year: 592, month: 1, day: 1, is_recurring: true, recurrence_type: 'annual' };
const monthly = { year: 592, month: 1, day: 15, is_recurring: true, recurrence_type: 'monthly' };
const weekly = { year: 592, month: 1, day: 1, is_recurring: true, recurrence_type: 'weekly' };

describe('independent Tia-Karta custom calendar', () => {
  test('browse months without changing either campaign date', () => {
    expect(calendarMonthAfter(calendar, 592, 1, -1)).toEqual({ year: 591, month: 12 });
    expect(calendarMonthAfter(calendar, 592, 12, 1)).toEqual({ year: 593, month: 1 });
    expect(calendar.current_day).toBe(25);
  });
  test('weekly events follow six-day Tia-Karta weeks', () => {
    expect(eventOccursOn(weekly, calendar, 592, 1, 25)).toBe(true);
    expect(eventOccursOn(weekly, calendar, 592, 1, 26)).toBe(false);
    expect(daysUntilNextOccurrence(weekly, calendar)).toBe(0);
    expect(daysUntilNextOccurrence({ ...weekly, day: 2 }, calendar)).toBe(1);
  });
  test('monthly and annual reminders repeat in later in-world months and years', () => {
    expect(eventOccursOn(monthly, calendar, 592, 2, 15)).toBe(true);
    expect(eventOccursOn(annual, calendar, 593, 1, 1)).toBe(true);
    expect(eventOccursOn(annual, calendar, 592, 2, 1)).toBe(false);
    expect(daysUntilNextOccurrence(monthly, calendar)).toBe(20);
    expect(daysUntilNextOccurrence(annual, calendar)).toBe(336);
  });
  test('nonrecurring events keep their original date and negative days for past events', () => {
    const event = { year: 592, month: 1, day: 24, is_recurring: false, recurrence_type: 'none' };
    expect(daysUntilNextOccurrence(event, calendar)).toBe(-1);
    expect(eventOccursOn(event, calendar, 592, 1, 24)).toBe(true);
    expect(eventOccursOn(event, calendar, 593, 1, 24)).toBe(false);
  });
  test('far future repeating events retain their scheduled initial occurrence', () => {
    expect(daysUntilNextOccurrence({ ...annual, year: 595 }, calendar)).toBe(1056);
  });
  test('a future recurring event starts on its actual first date', () => {
    const future = { ...weekly, year: 593, month: 1, day: 2 };
    expect(daysUntilNextOccurrence(future, calendar)).toBe(337);
    expect(eventOccursOn(future, calendar, 592, 1, 26)).toBe(false);
    expect(eventOccursOn(future, calendar, 593, 1, 2)).toBe(true);
  });
  test('monthly events skip months too short for the chosen day', () => {
    const irregular = { ...calendar, current_day: 29, current_month: 1,
      custom_months: [{ name: 'Long', days: 30 }, { name: 'Short', days: 20 }, { name: 'Long Again', days: 30 }] };
    const event = { year: 592, month: 1, day: 29, is_recurring: true, recurrence_type: 'monthly' };
    expect(daysUntilNextOccurrence(event, { ...irregular, current_day: 30 })).toBe(49);
  });
  test('an event does not recur before its recorded first occurrence', () => {
    const future = { ...weekly, year: 593 };
    expect(eventOccursOn(future, calendar, 592, 1, 25)).toBe(false);
    expect(daysUntilNextOccurrence(future, calendar)).toBe(336);
  });
});
