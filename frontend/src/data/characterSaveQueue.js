/**
 * Serialises live character mutations and preserves optimistic edits while
 * earlier requests are in flight. Responses contain full character records;
 * without a queue a slow, older response can replace newer local changes.
 *
 * Each accepted edit belongs to the sheet session that created it. Navigating
 * away hides its responses but does not discard writes already accepted.
 * Writes to the same character remain ordered even if that sheet is reopened.
 * Cross-device edits still need server-side revision/concurrency checks.
 */
// Shared by all controller instances in this browser tab. React unmounts
// CleanCharacterSheet when returning to the character library, so a controller-
// local queue cannot guarantee write order across reopenings.
const characterWriteTails = new Map();

export function createCharacterSaveQueue({ publish, patchRequest, onSuccess = () => {}, onError = () => {} }) {
  let activeSession = null;

  const snapshot = (session = activeSession) => {
    if (!session?.confirmed) return null;
    return session.pending.reduce((state, entry) => ({ ...state, ...entry.updates }), { ...session.confirmed });
  };

  const emit = (session) => {
    if (session === activeSession) publish(snapshot(session));
  };

  const reset = (id, character) => {
    // Abandoned sessions retain their accepted work, but cannot publish to a
    // different sheet or show stale success/error toasts.
    activeSession = {
      id: id || '',
      confirmed: character && typeof character === 'object' ? character : null,
      pending: [],
    };
    emit(activeSession);
  };

  // Unmounting the sheet must also detach old notifications and publications.
  // Already accepted server writes keep running in their original sessions.
  const invalidate = () => {
    activeSession = null;
  };

  const enqueue = (session, task) => {
    // Keep writes to the same character in order, including A -> B -> A
    // navigation while A's earlier requests are still in flight.
    const previous = characterWriteTails.get(session.id) || Promise.resolve();
    const result = previous.then(task, task);
    const tail = result.then(() => undefined, () => undefined);
    characterWriteTails.set(session.id, tail);
    tail.then(() => {
      if (characterWriteTails.get(session.id) === tail) characterWriteTails.delete(session.id);
    });
    return result;
  };

  const remove = (session, entry) => {
    session.pending = session.pending.filter((item) => item !== entry);
  };

  const commit = (session, response, fallbackUpdates = {}) => {
    const raw = response?.data?.character || response?.data;
    session.confirmed = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw
      : { ...session.confirmed, ...fallbackUpdates };
  };

  /** A scoped patch refuses callbacks belonging to an older sheet session. */
  const patchForSession = (session, updates, options = {}) => {
    if (session !== activeSession || !session?.id || !session.confirmed || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return Promise.resolve(false);
    }
    const entry = { updates: { ...updates } };
    session.pending.push(entry);
    emit(session); // Optimistic display of all pending edits.

    return enqueue(session, async () => {
      try {
        // This operation was already accepted on the original character.
        // A route change must not silently skip it while an earlier save runs.
        const response = await patchRequest(session.id, entry.updates);
        commit(session, response, entry.updates);
        remove(session, entry);
        emit(session);
        if (session === activeSession && options.success) onSuccess(options.success);
        return true;
      } catch (error) {
        remove(session, entry);
        emit(session);
        if (session === activeSession) onError(error, options);
        return false;
      }
    });
  };

  const patch = (updates, options = {}) => patchForSession(activeSession, updates, options);

  // Before loading a reopened sheet, wait for older accepted writes to settle.
  // Otherwise GET can return stale HP/inventory and the next edit is computed
  // against the wrong values even if later PATCHes are correctly ordered.
  const whenIdle = (id) => characterWriteTails.get(id) || Promise.resolve();

  /** Serialise authoritative server operations (e.g. short/long rest) too. */
  const runServerAction = (action, options = {}) => {
    const session = activeSession;
    if (!session?.id || !session.confirmed) return Promise.resolve(false);
    return enqueue(session, async () => {
      try {
        const response = await action(session.id, session.confirmed);
        commit(session, response);
        emit(session);
        if (session === activeSession && options.success) onSuccess(options.success);
        return true;
      } catch (error) {
        if (session === activeSession) onError(error, options);
        return false;
      }
    });
  };

  return {
    reset,
    invalidate,
    whenIdle,
    patch,
    patchForSession,
    runServerAction,
    getSession: () => activeSession,
    getConfirmed: () => activeSession?.confirmed || null,
    getSnapshot: () => snapshot(activeSession),
  };
}
