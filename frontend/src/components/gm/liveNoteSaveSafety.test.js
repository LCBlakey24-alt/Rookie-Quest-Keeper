/**
 * Saving a Live Play note must save the note and nothing else.
 *
 * LiveSessionGridPage.handleSubmitNote POSTed the note and then immediately
 * POSTed to .../sync, which applied whatever the deterministic parser
 * inferred -- hit points to zero, a "dead" condition, a brand new location.
 *
 * Worth being precise about reachability: that handler was passed to NotesTab
 * as a prop and NotesTab never used it. gm/NotesTab has its own saveNote,
 * which saves and then asks /live-state/suggestions, a read. So the automatic
 * mutation was dead code on the way to being wired up, not something a GM
 * could trigger from the interface. The backend endpoint it called is the
 * part that was genuinely reachable, and that is covered in the backend
 * tests.
 *
 * These guard both halves: the live save path must never call the mutation
 * endpoint, and the dead handler must not sit there waiting to be connected.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LiveSessionGridPage from './LiveSessionGridPage';

jest.mock('@/lib/apiClient', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const apiClient = require('@/lib/apiClient');
const { toast } = require('sonner');
const CAMPAIGN = 'camp-1';

function openLivePlay() {
  return render(
    <MemoryRouter initialEntries={[`/gm-screen/${CAMPAIGN}`]}>
      <Routes>
        <Route path="/gm-screen/:campaignId" element={<LiveSessionGridPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Drive the real handler the Notes tool is given. */
async function saveNoteThroughTheUi(text) {
  openLivePlay();
  await screen.findByTestId('live-session-grid');
  fireEvent.click(screen.getByTestId('live-tool-notes'));
  const box = await screen.findByTestId('live-quick-note');
  fireEvent.change(box, { target: { value: text } });
  // The real control NotesTab renders, found by its label rather than a
  // testid it does not have.
  const save = screen.getByRole('button', { name: /save/i });
  fireEvent.click(save);
}

const syncCalls = () => apiClient.post.mock.calls.filter(([url]) => String(url).includes('/sync'));
const noteCalls = () => apiClient.post.mock.calls.filter(([url]) => /\/ingame-notes$/.test(String(url)));

beforeEach(() => {
  localStorage.clear();
  apiClient.get.mockResolvedValue({ data: [] });
  apiClient.post.mockResolvedValue({ data: { id: 'note-1', content: 'x' } });
});

test('saving a note that says a character died never calls the campaign mutation endpoint', async () => {
  await saveNoteThroughTheUi('Rina died when the bridge collapsed.');

  await waitFor(() => expect(noteCalls().length).toBe(1));
  expect(syncCalls()).toHaveLength(0);
});

test('a note about an NPC travelling does not call it either', async () => {
  await saveNoteThroughTheUi('Bran has chosen to move to Moonfall.');

  await waitFor(() => expect(noteCalls().length).toBe(1));
  expect(syncCalls()).toHaveLength(0);
});

test('the note is still reported saved', async () => {
  await saveNoteThroughTheUi('Rina died.');
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

test('a note still saves when the optional suggestion read fails', async () => {
  // Note-save success must not depend on an optional downstream call.
  apiClient.post.mockImplementation(url => (String(url).includes('/suggestions')
    ? Promise.reject(new Error('offline'))
    : Promise.resolve({ data: { id: 'note-1' } })));
  await saveNoteThroughTheUi('Rina died.');

  await waitFor(() => expect(noteCalls().length).toBe(1));
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(syncCalls()).toHaveLength(0);
});

test('the source no longer contains an automatic sync call at all', () => {
  // Belt and braces: the handler could be refactored without the mounted
  // tests noticing if some other code path reintroduced the call.
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, 'LiveSessionGridPage.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  expect(src).not.toContain('/sync');
  expect(src).not.toContain('syncNoteIntoCampaignState');
});
