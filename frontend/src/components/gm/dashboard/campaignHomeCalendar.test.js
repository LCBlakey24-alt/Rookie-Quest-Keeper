import { tiaKartaCalendar } from '@/data/tiaKartaCalendar';
import { eventCountdownLabel, nextCampaignEvent } from './campaignHomeCalendar';

const date = tiaKartaCalendar('spilsby-wednesday');

describe('GM home calendar summary', () => {
  test('finds repeating events instead of dropping their past initial dates', () => {
    const events = [
      { id: 'old', name: 'Expired one-time event', day: 1, month: 1, year: 592 },
      { id: 'once', name: 'A future visit', day: 29, month: 1, year: 592 },
      { id: 'weekly', name: 'Council meeting', day: 2, month: 1, year: 592,
        is_recurring: true, recurrence_type: 'weekly' },
    ];
    const next = nextCampaignEvent(events, date);
    expect(next).toMatchObject({ id: 'weekly', daysUntil: 1 });
    expect(eventCountdownLabel(next.daysUntil)).toBe('Tomorrow');
  });

  test('never shows an event that has not yet reached its first date', () => {
    const events = [{ name: 'Future ritual', day: 2, month: 1, year: 593,
      is_recurring: true, recurrence_type: 'weekly' }];
    expect(nextCampaignEvent(events, date)).toMatchObject({ daysUntil: 337 });
  });

  test('keeps each campaign date independent', () => {
    const friday = nextCampaignEvent([{ name: 'Weekly', year: 592, month: 1, day: 1,
      is_recurring: true, recurrence_type: 'weekly' }], date);
    const wednesdayCalendar = { ...date, current_day: 1 };
    const wednesday = nextCampaignEvent([{ name: 'Weekly', year: 592, month: 1, day: 1,
      is_recurring: true, recurrence_type: 'weekly' }], wednesdayCalendar);
    expect(friday.daysUntil).toBe(0);
    expect(wednesday.daysUntil).toBe(0);
    expect(date.current_day).toBe(25);
  });

  test('handles empty, invalid or failed event data without fictional dates', () => {
    expect(nextCampaignEvent([], date)).toBeNull();
    expect(nextCampaignEvent(undefined, date)).toBeNull();
    expect(nextCampaignEvent([{ name: 'No date' }], date)).toBeNull();
    expect(nextCampaignEvent([{ name: 'Event' }], null)).toBeNull();
    expect(eventCountdownLabel(0)).toBe('Today');
    expect(eventCountdownLabel(2)).toBe('In 2 in-world days');
  });
});
