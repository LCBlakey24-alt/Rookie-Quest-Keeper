/**
 * The character a page is about, read from its address.
 *
 * /characters/:id, /characters/:id/edit, /characters/:id/classic and the like
 * name a saved character. /characters/new, /characters/create and
 * /characters/import do not: they are the creator and the importer, and
 * treating "new" as an id sent GET /api/characters/new (a 404) from every
 * dice roll and tool on the creator page.
 */
const NOT_A_CHARACTER = new Set(['new', 'create', 'import']);

export function characterIdFromPath(pathname = '') {
  const match = String(pathname || '').match(/\/characters\/([^/?#]+)/i);
  const id = match ? decodeURIComponent(match[1]) : '';
  return NOT_A_CHARACTER.has(id.toLowerCase()) ? '' : id;
}

/** characterIdFromPath for the current page. */
export function currentCharacterId() {
  if (typeof window === 'undefined') return '';
  return characterIdFromPath(window.location.pathname);
}
