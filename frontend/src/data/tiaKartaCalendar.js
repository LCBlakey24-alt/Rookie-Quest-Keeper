/**
 * Tia-Karta calendar, sourced from the active Eldritch Heralds 592 PC
 * wall calendar / Calendar Reference tab (October 2026).
 * The newer 25 Dawnseed, 592 PC OneDrive source supersedes the old 24 Dawnseed snapshot.
 */
export const TIA_KARTA_MONTHS = [
  ['Dawnseed', 'Greenwake'], ['Rainmoot', 'Greenwake'],
  ['Bloomrise', 'Greenwake'], ['Suncrest', 'Sunhigh'],
  ['Highsun', 'Sunhigh'], ['Goldflame', 'Sunhigh'],
  ['Harvestwane', 'Emberfall'], ['Amberfall', 'Emberfall'],
  ['Duskmarch', 'Emberfall'], ['Frostveil', 'Frostdeep'],
  ['Longnight', 'Frostdeep'], ['Thawrest', 'Frostdeep'],
].map(([name, season]) => ({ name, days: 30, season }));

export const TIA_KARTA_CURRENT_DATE = { current_day: 25, current_month: 1, current_year: 592 };
export const TIA_KARTA_DAYS_PER_WEEK = 6;

export const TIA_KARTA_REFERENCE_EVENTS = [
  { id: 'tk-calendar-campaign-begins', name: 'Campaign begins', day: 1, month: 1, year: 592, description: 'First day of Greenwake and the Eldritch Heralds campaign.' },
  { id: 'tk-calendar-balderin-arrival', name: 'Party reaches Balderin', day: 5, month: 1, year: 592, description: 'Stage 1 cleanup and Jordan defence begin.' },
  { id: 'tk-calendar-heralds-return', name: 'Heralds return to Balderin', day: 24, month: 1, year: 592, description: 'Returned with Thorgar Ironhammer, via Gragon.' },
  { id: 'tk-calendar-cleanup-target', name: 'Stage 1 cleanup target', day: 28, month: 1, year: 592, description: 'Locked target: end of the fourth six-day week.' },
  { id: 'tk-calendar-stage-two', name: 'Stage 2 may begin', day: 29, month: 1, year: 592, description: 'Earliest full-capacity start; draft work dates may change.' },
  { id: 'tk-calendar-jordan-post', name: 'Jordan permanent post target', day: 22, month: 2, year: 592, description: 'DM planning estimate, not a locked completion.' },
  // Private future consequences are NOT placed in potentially shared calendar events.
  { id: 'tk-calendar-defence', name: 'Premium defence posture target', day: 5, month: 3, year: 592, description: 'DM planning estimate.' },
  { id: 'tk-calendar-crowns', name: 'Court of Crowns Summit', day: 1, month: 4, year: 592, description: 'Locked world event: first day of Sunhigh.' },
];

export function tiaKartaCalendar(campaignId, original = null) {
  return {
    ...(original || {}),
    campaign_id: campaignId,
    calendar_type: 'custom',
    // When a campaign already uses this world's calendar, don't overwrite
    // its independent session date (especially the Wednesday start).
    current_day: original?.calendar_type === 'custom' && Number(original.current_day) >= 1 ? Number(original.current_day) : TIA_KARTA_CURRENT_DATE.current_day,
    current_month: original?.calendar_type === 'custom' && Number(original.current_month) >= 1 ? Number(original.current_month) : TIA_KARTA_CURRENT_DATE.current_month,
    current_year: original?.calendar_type === 'custom' && Number.isInteger(Number(original.current_year)) ? Number(original.current_year) : TIA_KARTA_CURRENT_DATE.current_year,
    days_per_week: TIA_KARTA_DAYS_PER_WEEK,
    custom_months: TIA_KARTA_MONTHS,
  };
}

// Shared arithmetic lives in a generic module. This named world remains an
// optional setting asset, never a dependency of the GM's default calendar.
export { calendarOrdinal, calendarDaysUntil, advanceCustomCalendar } from './campaignCalendarMath';
