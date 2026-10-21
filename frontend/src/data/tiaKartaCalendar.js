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
    current_day: TIA_KARTA_CURRENT_DATE.current_day,
    current_month: TIA_KARTA_CURRENT_DATE.current_month,
    current_year: TIA_KARTA_CURRENT_DATE.current_year,
    days_per_week: TIA_KARTA_DAYS_PER_WEEK,
    custom_months: TIA_KARTA_MONTHS,
  };
}

function monthDays(calendar) {
  const list = calendar?.custom_months;
  return Array.isArray(list) && list.length
    ? list.map(month => Math.max(1, Math.floor(Number(month.days) || 30)))
    : Array.from({ length: 12 }, (_, index) => new Date(2001, index + 1, 0).getDate());
}

export function calendarOrdinal(calendar, year, month, day) {
  const months = monthDays(calendar);
  const m = Number(month);
  const d = Number(day);
  const y = Number(year);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || m < 1 || m > months.length || d < 1 || d > months[m - 1]) return null;
  const length = months.reduce((sum, n) => sum + n, 0);
  return y * length + months.slice(0, m - 1).reduce((sum, n) => sum + n, 0) + d - 1;
}

export function calendarDaysUntil(event, calendar) {
  if (!event || !calendar) return null;
  const start = calendarOrdinal(calendar, calendar.current_year, calendar.current_month, calendar.current_day);
  const target = calendarOrdinal(calendar, event.year, event.month, event.day);
  return start === null || target === null ? null : target - start;
}

export function advanceCustomCalendar(calendar, step) {
  const months = monthDays(calendar);
  const days = Number(step);
  if (!Number.isInteger(days) || days < 1 || days > 10000) throw new Error('Choose between 1 and 10,000 days.');
  const index = calendarOrdinal(calendar, calendar.current_year, calendar.current_month, calendar.current_day);
  if (index === null) throw new Error('Set a valid campaign calendar date before advancing time.');
  const daysPerYear = months.reduce((sum, n) => sum + n, 0);
  const absolute = index + days;
  let year = Math.floor(absolute / daysPerYear);
  let dayOfYear = absolute - year * daysPerYear;
  let month = 1;
  while (dayOfYear >= months[month - 1]) {
    dayOfYear -= months[month - 1];
    month++;
  }
  return { current_year: year, current_month: month, current_day: dayOfYear + 1 };
}
