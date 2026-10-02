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
