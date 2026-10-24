// Only public combatants belong on the player-facing second screen.  Display
// updates may arrive from more than one GM control or an older saved broadcast.
const truthyFlag = (value) => value === true || value === 'true';
const falseFlag = (value) => value === false || value === 'false';
const privateVisibilities = new Set(['hidden', 'secret', 'private', 'gm', 'gm-only', 'gm_only']);

export function isPlayerVisibleCombatToken(token) {
  if (!token || typeof token !== 'object') return false;
  if ([token.hidden, token.is_hidden, token.gm_only, token.secret].some(truthyFlag)) return false;
  if ([token.visible, token.is_visible, token.player_visible, token.show_to_players].some(falseFlag)) return false;
  return !privateVisibilities.has(String(token.visibility || '').trim().toLowerCase());
}

// Null means no coordinate was provided. 0 is a real edge coordinate, never
// the same as 'unpositioned'. A single supplied axis defaults the other to 50.
function readAxis(token, axis) {
  const raw = token[axis] ?? token.position?.[axis] ?? token[`token_${axis}`];
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function getCombatTokenMapPosition(token = {}) {
  const x = readAxis(token, 'x');
  const y = readAxis(token, 'y');
  if (x === null && y === null) return null;
  return { x: x ?? 50, y: y ?? 50 };
}

export function clampMapPercent(value) {
  if (value === null || value === undefined || value === '') return 50;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 50;
}
