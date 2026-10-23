import { daysUntilNextOccurrence } from '@/data/customCalendarUtilities';

const safeList = value => (Array.isArray(value) ? value : []);

export function normaliseHomeData(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};

  return {
    quests: safeList(source.quests),
    arcs: safeList(source.arcs),
    npcs: safeList(source.npcs),
    locations: safeList(source.locations),
    notes: safeList(source.notes),
    calendar: source.calendar && typeof source.calendar === 'object' ? source.calendar : null,
    events: safeList(source.events),
  };
}

/**
 * GM Home must display the next real in-world occurrence, not the original
 * creation date of a recurring event. Missing/invalid dates are never shown
 * as "Infinity days" or an apparently empty campaign.
 */
export function chooseNextCampaignEvent(events, calendar) {
  if (!calendar) return null;
  const upcoming = safeList(events)
    .map(event => ({
      ...event,
      daysUntil: daysUntilNextOccurrence(event, calendar),
    }))
    .filter(event => Number.isFinite(event.daysUntil) && event.daysUntil >= 0)
    .sort((first, second) => first.daysUntil - second.daysUntil);
  return upcoming[0] || null;
}
