import { calendarOrdinal, calendarDaysUntil } from './tiaKartaCalendar';

/** Keep an event on its own campaign calendar, including repeat rules. */
export function eventOccursOn(event, calendar, year, month, day) {
  if (!event || !calendar) return false;
  const start = calendarOrdinal(calendar, event.year, event.month, event.day);
  const target = calendarOrdinal(calendar, year, month, day);
  if (start == null || target == null || target < start) return false;
  const repeat = event.is_recurring ? event.recurrence_type : 'none';
  if (repeat === 'weekly') return (target - start) % Number(calendar.days_per_week || 7) === 0;
  if (repeat === 'monthly') return Number(event.day) === Number(day);
  if (repeat === 'annual') return Number(event.month) === Number(month) && Number(event.day) === Number(day);
  return target === start;
}

export function calendarMonthAfter(calendar, year, month, delta) {
  const count = calendar.custom_months?.length || 12;
  const absolute = Number(year) * count + Number(month) - 1 + delta;
  return { year: Math.floor(absolute / count), month: ((absolute % count) + count) % count + 1 };
}

export function daysUntilNextOccurrence(event, calendar) {
  if (!event || !calendar) return null;
  const first = calendarOrdinal(calendar, event.year, event.month, event.day);
  const current = calendarOrdinal(calendar, calendar.current_year, calendar.current_month, calendar.current_day);
  if (first == null || current == null) return null;

  const recurrence = event.is_recurring ? event.recurrence_type : 'none';
  if (!['weekly', 'monthly', 'annual'].includes(recurrence)) return first - current;

  // A recurring event must never appear before its first scheduled date.
  const start = Math.max(first, current);
  if (recurrence === 'weekly') {
    const week = Math.max(1, Number(calendar.days_per_week) || 7);
    return start + (week - ((start - first) % week)) % week - current;
  }

  const months = calendar.custom_months || [];
  if (!months.length) return null;
  const yearLength = months.reduce((sum, month) => sum + Number(month.days || 0), 0);
  if (yearLength < 1) return null;

  // A monthly date may not exist in a shorter month; skip it rather than
  // silently moving it to a different date.
  const baseYear = Math.floor(start / yearLength);
  for (let year = baseYear; year <= baseYear + 2; year++) {
    for (let month = 1; month <= months.length; month++) {
      if (recurrence === 'annual' && month !== Number(event.month)) continue;
      const candidate = calendarOrdinal(calendar, year, month, event.day);
      if (candidate !== null && candidate >= start) return candidate - current;
    }
  }
  return null;
}
