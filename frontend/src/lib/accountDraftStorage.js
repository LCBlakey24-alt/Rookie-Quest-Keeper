import { getAuthToken, getStoredAuthUsername } from '@/lib/auth';
import { accountFromToken } from '@/lib/liveDisplayScope';
import { isLocalPreview } from '@/preview/previewMode';

/**
 * Keep unsaved character-builder/notes drafts distinct on shared devices.
 * The signed JWT subject wins over a stale browser username. We intentionally
 * do not fall back to reading old unscoped keys: nobody can prove which
 * previous account created them, and an automatic migration could reveal a
 * different person's unfinished character to a newly registered user.
 *
 * This does not replace server permission checks; it only isolates local UI
 * drafts that have not yet been persisted to the backend.
 */
export function accountDraftStorageKey(baseKey) {
  const account = isLocalPreview() ? 'local-preview'
    : accountFromToken(getAuthToken() || '') || (getAuthToken() ? getStoredAuthUsername() : '') || 'no-session';
  return `${String(baseKey)}:owner:${encodeURIComponent(String(account).trim().toLowerCase())}`;
}
