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
  expect(await old).toBe(false);
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
