const PLAYER_RETURN_PATHS = [
  /^\/player\/?$/,
  /^\/player\/campaign\/[^/?#]+\/?$/,
  /^\/mobile\/?$/,
  /^\/mobile\/[^/?#]+\/?$/,
];

export function safePlayerSheetReturnTo(value) {
  if (typeof value !== 'string') return '';
  const path = value.trim();
  if (!path || path.startsWith('//')) return '';
  return PLAYER_RETURN_PATHS.some(pattern => pattern.test(path)) ? path : '';
}

export function playerSheetReturnState(returnTo) {
  const safeReturnTo = safePlayerSheetReturnTo(returnTo);
  return safeReturnTo ? { playerReturnTo: safeReturnTo } : undefined;
}

export function playerSheetReturnFromLocation(location) {
  return safePlayerSheetReturnTo(location?.state?.playerReturnTo);
}
