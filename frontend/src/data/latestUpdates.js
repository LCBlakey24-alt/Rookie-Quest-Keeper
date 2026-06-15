export const LATEST_UPDATES = [
  {
    id: 'monk-detection-added-2026-06-15',
    date: '2026-06-15',
    badge: 'Improved',
    category: 'Class Progress',
    title: 'Monk character detection added',
    summary: 'Monk support now detects direct class fields, class level maps, multiclass maps, and class entry arrays so Monk sheets and future builder helpers can work reliably.',
    public: true,
  },
  {
    id: 'monk-progression-started-2026-06-15',
    date: '2026-06-15',
    badge: 'New',
    category: 'Class Progress',
    title: 'Monk class support started',
    summary: 'Monk progression work has started with Martial Arts scaling, Ki and Discipline Point tracking, Unarmored Movement, subclass choice levels, and core feature progression helpers.',
    public: true,
  },
  {
    id: 'class-support-barbarian-rogue-2026-06-15',
    date: '2026-06-15',
    badge: 'New',
    category: 'Character Builder',
    title: 'Barbarian complete + Rogue support added',
    summary: 'Barbarian is now fully supported across the builder, sheet summaries, Rage resources, subclasses, final status, and package exports. Rogue helpers and sheet panels have also been added.',
    public: true,
  },
  {
    id: 'class-dashboard-2026-06-15',
    date: '2026-06-15',
    badge: 'Improved',
    category: 'Class Progress',
    title: 'Class completion dashboard started',
    summary: 'The app now has a class completion status helper so Fighter, Barbarian, Rogue, and future classes can be tracked more clearly as each one reaches the full support standard.',
    public: true,
  },
  {
    id: 'fighter-complete-2026-06-15',
    date: '2026-06-15',
    badge: 'Complete',
    category: 'Character Builder',
    title: 'Fighter class support complete',
    summary: 'Fighter support is complete across progression, builder choices, readiness, final status, package exports, and character sheet summaries.',
    public: true,
  },
];

export function getLatestUpdates({ limit = 5, publicOnly = false } = {}) {
  const updates = publicOnly ? LATEST_UPDATES.filter(update => update.public) : LATEST_UPDATES;
  return updates.slice(0, limit);
}
