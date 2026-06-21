export const LATEST_UPDATES = [
  {
    id: 'homepage-polish-2026-06-21',
    date: '2026-06-21',
    badge: 'Improved',
    category: 'Site Update',
    title: 'Homepage and brand polish updated',
    summary: 'The site has been cleaned up to better match the Rookie Quest Keeper tabletop theme, with a warmer visual style, clearer typography, and less cluttered update messaging.',
    details: [
      'Switched to a commercial-safe Fraunces and Manrope font pairing.',
      'Softened global font weights so sheets, forms, and dense UI are easier to read.',
      'Moved away from a developer-style update dump toward cleaner player-facing announcements.',
    ],
    public: true,
  },
  {
    id: 'character-creation-routes-2026-06-20',
    date: '2026-06-20',
    badge: 'New',
    category: 'Character Creation',
    title: 'Character creation routes are now clearer',
    summary: 'The app now has clearer character creation paths for different types of players, from full control to quick-start options.',
    details: [
      'Full Creation is aimed at detailed builds and complete control.',
      'Basic Build gives a faster guided route with Rook helping fill in details.',
      'Premade Characters and Kids Mode are being shaped as easier entry points for new or younger players.',
    ],
    public: true,
  },
  {
    id: 'class-support-foundation-2026-06-17',
    date: '2026-06-17',
    badge: 'Improved',
    category: 'Class Support',
    title: 'Class builder support has been expanded',
    summary: 'Class support work has moved from single-class experiments toward a broader package-based structure for all core classes.',
    details: [
      'Core class packages now feed builder and sheet helpers through a shared bridge.',
      'Class lookups are normalised so spacing and casing differences are handled more safely.',
      'This creates a cleaner base for future class-specific choices, resources, subclasses, and level-up rules.',
    ],
    public: true,
  },
  {
    id: 'velvet-tabletop-theme-2026-06-15',
    date: '2026-06-15',
    badge: 'Updated',
    category: 'Design',
    title: 'Velvet Tabletop theme direction started',
    summary: 'Rookie Quest Keeper is moving toward a warmer premium tabletop look, using dark leather panels, cream text, gold accents, and a campaign-journal feel.',
    details: [
      'The design direction now favours tavern-tabletop warmth over neon fantasy styling.',
      'Shared colour tokens are being used more consistently across the app.',
      'Future pages should feel like part of the same campaign workspace rather than separate experiments.',
    ],
    public: true,
  },
];

export function getLatestUpdates({ limit = 5, publicOnly = false } = {}) {
  const updates = publicOnly ? LATEST_UPDATES.filter(update => update.public) : LATEST_UPDATES;
  return updates.slice(0, limit);
}
