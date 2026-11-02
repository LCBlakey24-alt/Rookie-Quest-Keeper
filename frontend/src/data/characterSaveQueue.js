/**
 * Serialises live character mutations and preserves optimistic edits while
 * earlier requests are in flight. Responses contain full character records;
 * without a queue a slow, older response can replace newer local changes.
 *
 * This protects one open sheet. Cross-device concurrent edits still need
 * server-side versioning/concurrency checks.
 */
export function createCharacterSaveQueue({ publish, patchRequest, onSuccess = () => {}, onError = () => {} }) {
  let characterId = '';
  let confirmed = null;
  let pending = [];
  let serial = Promise.resolve();
  let generation = 0;

  const snapshot = () => {
    if (!confirmed) return null;
    return pending.reduce((state, entry) => ({ ...state, ...entry.updates }), { ...confirmed });
  };

  const emit = () => publish(snapshot());

  const reset = (id, character) => {
    generation += 1;
    characterId = id || '';
    confirmed = character && typeof character === 'object' ? character : null;
    pending = [];
    serial = Promise.resolve();
    emit();
  };

  const enqueue = (task) => {
    const result = serial.then(task, task);
    serial = result.then(() => undefined, () => undefined);
    return result;
  };

  const remove = (entry) => {
    pending = pending.filter((item) => item !== entry);
  };

  const commit = (response, fallbackUpdates = {}) => {
    const raw = response?.data?.character || response?.data;
    confirmed = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw
      : { ...confirmed, ...fallbackUpdates };
  };

  const patch = (updates, options = {}) => {
    if (!characterId || !confirmed || !updates || typeof updates !== 'object') {
      return Promise.resolve(false);
    }
    const target = characterId;
    const expectedGeneration = generation;
    const entry = { updates: { ...updates } };
    pending.push(entry);
    emit(); // Optimistic display of all pending edits.

    return enqueue(async () => {
      if (expectedGeneration !== generation) return false;
      try {
        const response = await patchRequest(target, entry.updates);
        if (expectedGeneration !== generation) return false;
        commit(response, entry.updates);
        remove(entry);
        emit(); // Rebase later optimistic changes over confirmed server state.
        if (options.success) onSuccess(options.success);
        return true;
      } catch (error) {
        if (expectedGeneration !== generation) return false;
        remove(entry);
        emit(); // Roll back just the failed edit, preserving newer pending edits.
        onError(error, options);
        return false;
      }
    });
  };

  /** Serialise authoritative server operations (e.g. short/long rest) too. */
  const runServerAction = (action, options = {}) => {
    if (!characterId || !confirmed) return Promise.resolve(false);
    const expectedGeneration = generation;
    const target = characterId;
    return enqueue(async () => {
      if (expectedGeneration !== generation) return false;
      try {
        const response = await action(target, confirmed);
        if (expectedGeneration !== generation) return false;
        commit(response);
        emit();
        if (options.success) onSuccess(options.success);
        return true;
      } catch (error) {
        if (expectedGeneration !== generation) return false;
        onError(error, options);
        return false;
      }
    });
  };

  return { reset, patch, runServerAction, getConfirmed: () => confirmed, getSnapshot: snapshot };
}
