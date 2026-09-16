export const BRAND_DESTINATIONS = {
  keeper: {
    key: 'keeper',
    label: 'Keeper',
    kind: 'internal',
    href: '/keeper',
    status: 'live',
  },
  forge: {
    key: 'forge',
    label: 'Forge',
    kind: 'roadmap',
    href: '/forge',
    status: 'planned',
  },
  worlds: {
    key: 'worlds',
    label: 'Worlds',
    kind: 'roadmap',
    href: '/worlds',
    status: 'planned',
  },
  game: {
    key: 'game',
    label: 'Rookie Quest RPG',
    kind: 'roadmap',
    href: '/game',
    status: 'planned',
  },
};

export function openBrandDestination(navigate, key) {
  const destination = BRAND_DESTINATIONS[key];
  if (!destination) return;

  if (destination.kind === 'external') {
    window.location.assign(destination.href);
    return;
  }

  navigate(destination.href);
}

export function isBrandDestinationLive(key) {
  return BRAND_DESTINATIONS[key]?.status === 'live';
}
