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
export function createCharacterSaveQueue({ publish, patchRequest, onSuccess = () => {}, onError = () => {} }) {
  let activeSession = null;
  const writeTails = new Map();

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

  const enqueue = (session, task) => {
    // Keep writes to the same character in order, including A -> B -> A
    // navigation while A's earlier requests are still in flight.
    const previous = writeTails.get(session.id) || Promise.resolve();
    const result = previous.then(task, task);
    const tail = result.then(() => undefined, () => undefined);
    writeTails.set(session.id, tail);
    tail.then(() => {
      if (writeTails.get(session.id) === tail) writeTails.delete(session.id);
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
    patch,
    patchForSession,
    runServerAction,
    getSession: () => activeSession,
    getConfirmed: () => activeSession?.confirmed || null,
    getSnapshot: () => snapshot(activeSession),
  };
}
