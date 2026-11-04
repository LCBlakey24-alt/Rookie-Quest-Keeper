import { createCharacterSaveQueue } from './characterSaveQueue';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function setup(initial = { id: 'hero-1', current_hit_points: 20, spell_slots_remaining: { 1: 2 }, notes: 'Start' }) {
  const visible = [];
  const patchRequest = jest.fn();
  const onSuccess = jest.fn();
  const onError = jest.fn();
  const queue = createCharacterSaveQueue({
    publish: state => visible.push(state),
    patchRequest,
    onSuccess,
    onError,
  });
  queue.reset(initial.id, initial);
  return { queue, patchRequest, onSuccess, onError, visible, current: () => visible[visible.length - 1] };
}

test('serialises HP and spell-slot writes and preserves optimistic changes across full responses', async () => {
  const t = setup();
  const first = deferred();
  const second = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

  const hp = t.queue.patch({ current_hit_points: 14 }, { success: 'HP saved' });
  const slots = t.queue.patch({ spell_slots_remaining: { 1: 1 } });
  expect(t.current()).toMatchObject({ current_hit_points: 14, spell_slots_remaining: { 1: 1 } });

  await Promise.resolve();
  expect(t.patchRequest).toHaveBeenCalledTimes(1);
  first.resolve({ data: { id: 'hero-1', current_hit_points: 14, spell_slots_remaining: { 1: 2 }, notes: 'Start' } });
  expect(await hp).toBe(true);
  expect(t.current()).toMatchObject({ current_hit_points: 14, spell_slots_remaining: { 1: 1 } });

  await Promise.resolve();
  expect(t.patchRequest).toHaveBeenCalledTimes(2);
  second.resolve({ data: { id: 'hero-1', current_hit_points: 14, spell_slots_remaining: { 1: 1 }, notes: 'Start' } });
  expect(await slots).toBe(true);
  expect(t.current()).toMatchObject({ current_hit_points: 14, spell_slots_remaining: { 1: 1 } });
  expect(t.onSuccess).toHaveBeenCalledWith('HP saved');
});

test('failed inventory write rolls back only inventory, not a newer note draft', async () => {
  const t = setup();
  const first = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    data: { id: 'hero-1', current_hit_points: 20, notes: 'New note', inventory: [] },
  });
  const inventory = t.queue.patch({ inventory: [{ id: 'sword' }] }, { error: 'Cannot save inventory' });
  const notes = t.queue.patch({ notes: 'New note' });
  expect(t.current()).toMatchObject({ notes: 'New note', inventory: [{ id: 'sword' }] });

  await Promise.resolve();
  first.reject(new Error('Offline'));
  expect(await inventory).toBe(false);
  expect(t.current().inventory).toBeUndefined();
  expect(t.current().notes).toBe('New note');
  expect(await notes).toBe(true);
  expect(t.current().notes).toBe('New note');
  expect(t.onError).toHaveBeenCalledTimes(1);
});

test('newest optimistic value wins when rapid updates target the same HP field', async () => {
  const t = setup();
  const first = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ data: { id: 'hero-1', current_hit_points: 8 } });
  const a = t.queue.patch({ current_hit_points: 12 });
  const b = t.queue.patch({ current_hit_points: 8 });
  await Promise.resolve();
  first.resolve({ data: { id: 'hero-1', current_hit_points: 12 } });
  await a;
  expect(t.current().current_hit_points).toBe(8);
  await b;
  expect(t.current().current_hit_points).toBe(8);
});

test('switching characters ignores obsolete response from previously open sheet', async () => {
  const t = setup();
  const request = deferred();
  t.patchRequest.mockReturnValueOnce(request.promise);
  const old = t.queue.patch({ current_hit_points: 10 });
  await Promise.resolve();
  t.queue.reset('hero-2', { id: 'hero-2', current_hit_points: 30 });
  request.resolve({ data: { id: 'hero-1', current_hit_points: 10 } });
  expect(await old).toBe(true); // Old accepted save finishes, without publishing to B.
  expect(t.current()).toMatchObject({ id: 'hero-2', current_hit_points: 30 });
});

test('server rest actions wait for queued character saves and preserve later edits', async () => {
  const t = setup();
  const pending = deferred();
  t.patchRequest.mockReturnValueOnce(pending.promise);
  const hp = t.queue.patch({ current_hit_points: 10 });
  const restAction = jest.fn().mockResolvedValue({ data: { id: 'hero-1', current_hit_points: 20, notes: 'Start' } });
  const rest = t.queue.runServerAction(restAction, { success: 'Long rest completed' });
  const note = t.queue.patch({ notes: 'After rest' });
  await Promise.resolve();
  expect(restAction).not.toHaveBeenCalled();
  pending.resolve({ data: { id: 'hero-1', current_hit_points: 10, notes: 'Start' } });
  expect(await hp).toBe(true);
  expect(await rest).toBe(true);
  expect(t.current().notes).toBe('After rest');
  expect(await note).toBe(true);
  expect(restAction).toHaveBeenCalledWith('hero-1', expect.objectContaining({ current_hit_points: 10 }));
});

test('failed rest action retains prior confirmed character and pending later edits', async () => {
  const t = setup();
  const rest = t.queue.runServerAction(() => Promise.reject(new Error('server down')), { error: 'Rest did not save' });
  const notes = t.queue.patch({ notes: 'Remember this' });
  t.patchRequest.mockResolvedValue({ data: { id: 'hero-1', current_hit_points: 20, notes: 'Remember this' } });
  expect(await rest).toBe(false);
  expect(t.current().notes).toBe('Remember this');
  expect(await notes).toBe(true);
  expect(t.onError).toHaveBeenCalledTimes(1);
});

test('accepted pending edits drain to the original character after navigation', async () => {
  const t = setup();
  const first = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    data: { id: 'hero-1', current_hit_points: 12, conditions: ['poisoned'] },
  });
  const hp = t.queue.patch({ current_hit_points: 12 }, { success: 'HP saved' });
  const condition = t.queue.patch({ conditions: ['poisoned'] }, { success: 'Condition saved' });
  await Promise.resolve();
  expect(t.patchRequest).toHaveBeenCalledTimes(1);

  t.queue.reset('hero-2', { id: 'hero-2', current_hit_points: 30 });
  first.resolve({ data: { id: 'hero-1', current_hit_points: 12, conditions: [] } });
  expect(await hp).toBe(true);
  expect(await condition).toBe(true);
  expect(t.patchRequest).toHaveBeenNthCalledWith(1, 'hero-1', { current_hit_points: 12 });
  expect(t.patchRequest).toHaveBeenNthCalledWith(2, 'hero-1', { conditions: ['poisoned'] });
  expect(t.current()).toMatchObject({ id: 'hero-2', current_hit_points: 30 });
  expect(t.onSuccess).not.toHaveBeenCalled(); // Old notifications do not appear on B.
});

test('failed old write does not cancel the next accepted write after leaving a sheet', async () => {
  const t = setup();
  const first = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    data: { id: 'hero-1', current_hit_points: 20, notes: 'Keep this edit' },
  });
  const hp = t.queue.patch({ current_hit_points: 12 });
  const notes = t.queue.patch({ notes: 'Keep this edit' });
  await Promise.resolve();
  t.queue.reset('hero-2', { id: 'hero-2', current_hit_points: 30 });
  first.reject(new Error('Old connection failed'));
  expect(await hp).toBe(false);
  expect(await notes).toBe(true);
  expect(t.patchRequest).toHaveBeenNthCalledWith(2, 'hero-1', { notes: 'Keep this edit' });
  expect(t.current().id).toBe('hero-2');
  expect(t.onError).not.toHaveBeenCalled();
});

test('deferred callbacks cannot write to a different character or a reopened old session', async () => {
  const t = setup();
  const originalSession = t.queue.getSession();
  t.queue.reset('hero-2', { id: 'hero-2', current_hit_points: 30 });
  expect(await t.queue.patchForSession(originalSession, { concentrating_on: 'Hex' })).toBe(false);
  expect(t.current().concentrating_on).toBeUndefined();
  t.queue.reset('hero-1', { id: 'hero-1', current_hit_points: 20 });
  expect(await t.queue.patchForSession(originalSession, { concentrating_on: 'Hex' })).toBe(false);
  expect(t.patchRequest).not.toHaveBeenCalled();
});

test('reopening the same character waits for its previously accepted writes', async () => {
  const t = setup();
  const first = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise).mockResolvedValueOnce({
    data: { id: 'hero-1', current_hit_points: 12, notes: 'Reopened' },
  });
  const old = t.queue.patch({ current_hit_points: 12 });
  await Promise.resolve();
  t.queue.reset('hero-2', { id: 'hero-2', current_hit_points: 30 });
  t.queue.reset('hero-1', { id: 'hero-1', current_hit_points: 20 });
  const newer = t.queue.patch({ notes: 'Reopened' });
  await Promise.resolve();
  expect(t.patchRequest).toHaveBeenCalledTimes(1);
  first.resolve({ data: { id: 'hero-1', current_hit_points: 12, notes: 'Start' } });
  expect(await old).toBe(true);
  expect(await newer).toBe(true);
  expect(t.patchRequest).toHaveBeenNthCalledWith(2, 'hero-1', { notes: 'Reopened' });
  expect(t.current()).toMatchObject({ id: 'hero-1', notes: 'Reopened' });
});

test('queued rest still executes on original character after navigating away', async () => {
  const t = setup();
  const first = deferred();
  t.patchRequest.mockReturnValueOnce(first.promise);
  const hp = t.queue.patch({ current_hit_points: 9 });
  const restAction = jest.fn().mockResolvedValue({ data: { id: 'hero-1', current_hit_points: 20 } });
  const rest = t.queue.runServerAction(restAction, { success: 'Rest completed' });
  await Promise.resolve();
  t.queue.reset('hero-2', { id: 'hero-2', current_hit_points: 30 });
  first.resolve({ data: { id: 'hero-1', current_hit_points: 9 } });
  expect(await hp).toBe(true);
  expect(await rest).toBe(true);
  expect(restAction).toHaveBeenCalledWith('hero-1', expect.objectContaining({ current_hit_points: 9 }));
  expect(t.current()).toMatchObject({ id: 'hero-2', current_hit_points: 30 });
  expect(t.onSuccess).not.toHaveBeenCalled();
});

test('unmount suppresses stale updates and notifications without cancelling an accepted save', async () => {
  const t = setup();
  const request = deferred();
  t.patchRequest.mockReturnValueOnce(request.promise);
  const save = t.queue.patch({ current_hit_points: 11 }, { success: 'Saved' });
  await Promise.resolve();
  const publishesBeforeUnmount = t.visible.length;
  t.queue.invalidate();
  request.resolve({ data: { id: 'hero-1', current_hit_points: 11 } });
  expect(await save).toBe(true);
  expect(t.patchRequest).toHaveBeenCalledWith('hero-1', { current_hit_points: 11 });
  expect(t.visible.length).toBe(publishesBeforeUnmount);
  expect(t.onSuccess).not.toHaveBeenCalled();
  expect(t.onError).not.toHaveBeenCalled();
});

test('different mounted controllers share one write lane for the same character', async () => {
  const old = setup();
  const first = deferred();
  old.patchRequest.mockReturnValueOnce(first.promise);
  const previous = old.queue.patch({ notes: 'Earlier edit' });
  await Promise.resolve();
  old.queue.invalidate(); // React unmounted the old character sheet.

  const newPatch = jest.fn().mockResolvedValue({
    data: { id: 'hero-1', current_hit_points: 20, notes: 'Latest edit' },
  });
  const fresh = createCharacterSaveQueue({
    publish: jest.fn(),
    patchRequest: newPatch,
  });
  fresh.reset('hero-1', { id: 'hero-1', current_hit_points: 20, notes: 'Start' });
  const latest = fresh.patch({ notes: 'Latest edit' });
  await Promise.resolve();
  expect(newPatch).not.toHaveBeenCalled();

  first.resolve({ data: { id: 'hero-1', current_hit_points: 20, notes: 'Earlier edit' } });
  expect(await previous).toBe(true);
  expect(await latest).toBe(true);
  expect(newPatch).toHaveBeenCalledWith('hero-1', { notes: 'Latest edit' });
  expect(fresh.getSnapshot().notes).toBe('Latest edit');
});

test('reopened controller waits for old accepted HP save before loading fresh values', async () => {
  let serverHp = 20;
  const old = setup();
  const held = deferred();
  old.patchRequest.mockImplementationOnce(async () => {
    await held.promise;
    serverHp = 12;
    return { data: { id: 'hero-1', current_hit_points: 12 } };
  });
  const previous = old.queue.patch({ current_hit_points: 12 });
  await Promise.resolve();
  old.queue.invalidate();

  const fresh = createCharacterSaveQueue({ publish: jest.fn(), patchRequest: jest.fn() });
  fresh.reset('hero-1', null);
  let completedLoad = false;
  const readAfterPendingWrites = (async () => {
    await fresh.whenIdle('hero-1');
    fresh.reset('hero-1', { id: 'hero-1', current_hit_points: serverHp });
    completedLoad = true;
  })();
  await Promise.resolve();
  expect(completedLoad).toBe(false);
  held.resolve();
  expect(await previous).toBe(true);
  await readAfterPendingWrites;
  expect(fresh.getSnapshot().current_hit_points).toBe(12);
});

test('waiting on pending writes is isolated by character ID', async () => {
  const t = setup();
  const held = deferred();
  t.patchRequest.mockReturnValueOnce(held.promise);
  const old = t.queue.patch({ current_hit_points: 9 });
  await Promise.resolve();
  const fresh = createCharacterSaveQueue({ publish: jest.fn(), patchRequest: jest.fn() });
  await fresh.whenIdle('hero-2'); // Hero 2 must not hang behind hero 1.
  held.resolve({ data: { id: 'hero-1', current_hit_points: 9 } });
  expect(await old).toBe(true);
});
