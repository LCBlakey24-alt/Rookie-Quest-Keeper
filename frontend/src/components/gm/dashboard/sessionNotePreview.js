/**
 * GM Home previews should never expand an imported session reference into
 * thousands of lines. The full original stays untouched in Notes.
 */
export function summariseSessionNote(content, maxLength = 240) {
  const clean = String(content || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'No text in this note yet.';
  if (clean.length <= maxLength) return clean;
  const excerpt = clean.slice(0, Math.max(1, maxLength));
  const wordEnd = excerpt.lastIndexOf(' ');
  return `${wordEnd > 80 ? excerpt.slice(0, wordEnd) : excerpt}…`;
}
