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
  const plain = calendarDaysUntil(event, calendar);
  if (!event.is_recurring || !['weekly','monthly','annual'].includes(event.recurrence_type)) return plain;
  if (plain == null) return null;
  const months = calendar.custom_months || [];
  const totalDays = months.reduce((sum, x) => sum + Number(x.days || 0), 0) || 365;
  const current = calendarOrdinal(calendar, calendar.current_year, calendar.current_month, calendar.current_day);
  if (current == null) return null;
  for (let distance = Math.max(0, plain); distance <= Math.max(0, plain) + totalDays + 10; distance++) {
    const year = Math.floor((current + distance) / totalDays);
    let remaining = current + distance - year * totalDays;
    let month = 1;
    for (const entry of months) {
      if (remaining < Number(entry.days)) break;
      remaining -= Number(entry.days);
      month++;
    }
    if (eventOccursOn(event, calendar, year, month, remaining + 1)) return distance;
  }
  return null;
}
