/** Generic calendar arithmetic, independent of any campaign or world setting. */
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
