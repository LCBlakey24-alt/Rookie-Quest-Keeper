export function persistLivePlayHandoff(storage, key, value) {
  if (!storage || !key) return false;
  try {
    storage.setItem(key, String(value ?? ''));
    return true;
  } catch {
    return false;
  }
}
