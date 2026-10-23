import { daysUntilNextOccurrence } from '@/data/customCalendarUtilities';

/**
 * Campaign-local calendar summary for the GM home screen.
 * Unlike one-time date subtraction this includes weekly, monthly and annual
 * recurring events, while respecting the event's first occurrence.
 */
export function nextCampaignEvent(events, calendar) {
  if (!calendar || !Array.isArray(events)) return null;
  return events
    .map(event => ({
      ...event,
      daysUntil: daysUntilNextOccurrence(event, calendar),
    }))
    .filter(event => Number.isFinite(event.daysUntil) && event.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil ||
      String(a.name || '').localeCompare(String(b.name || '')))[0] || null;
}

export function eventCountdownLabel(daysUntil) {
  if (!Number.isFinite(daysUntil) || daysUntil < 0) return 'Date not available';
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} in-world days`;
}
