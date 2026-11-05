import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LiveSessionGridPage from './LiveSessionGridPage';
import apiClient from '@/lib/apiClient';
import { loadLiveSessionSections } from '@/data/livePlayLoaders';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@/data/livePlayLoaders', () => ({ loadLiveSessionSections: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock('./LiveSessionGridMode', () => ({ __esModule: true, default: ({ renderTool }) => <div>{renderTool('tables')}<div>{renderTool('notes')}</div></div> }));
jest.mock('./LiveRollTablesPanel', () => ({ __esModule: true, default: ({ onSaveAsNote }) => <button onClick={() => onSaveAsNote('Travel d20: rolled 12 — safe route', 'roll-12')}>Add to Notes</button> }));
jest.mock('./NotesTab', () => ({ __esModule: true, default: ({ sessionNotes }) => <ul>{sessionNotes.map(n => <li key={n.id}>{n.content}</li>)}</ul> }));
jest.mock('./LiveStoryFocusPanel', () => () => null);
jest.mock('./GroupCheckRequestPanel', () => () => null);
jest.mock('./LiveDataWarning', () => () => null);
jest.mock('./PlayerDisplayDeliveryStatus', () => () => null);
jest.mock('./ChaosFateTracker', () => () => null);
jest.mock('@/components/DiceRollFlicker', () => () => null);

let persisted;
const load = () => ({ sections: {
  campaign: { ok: true, data: { id: 'synthetic', name: 'Synthetic' } },
  players: { ok: true, data: [] }, scenarios: { ok: true, data: [] },
  calendar: { ok: true, data: null }, notes: { ok: true, data: [...persisted] },
}, errors: [] });
function mount() {
  return render(<MemoryRouter initialEntries={['/gm-screen/synthetic']}><Routes><Route path="/gm-screen/:campaignId" element={<LiveSessionGridPage />} /></Routes></MemoryRouter>);
}
beforeEach(() => {
  persisted = [];
  jest.clearAllMocks();
  localStorage.clear();
  loadLiveSessionSections.mockImplementation(async () => load());
  apiClient.post.mockImplementation(async (_, payload) => {
    const note = { id: 'server-' + (persisted.length + 1), content: payload.content };
    persisted.unshift(note);
    return { data: note };
  });
});

test('Add to Notes persists server record and survives unmount/reload', async () => {
  const view = mount();
  await screen.findByRole('button', { name: 'Add to Notes' });
  await act(async () => { fireEvent.click(screen.getByText('Add to Notes')); });
  expect(apiClient.post).toHaveBeenCalledWith('/campaigns/synthetic/ingame-notes', { content: 'Travel d20: rolled 12 — safe route' });
  expect(screen.getAllByText(/Travel d20: rolled 12/)).toHaveLength(1);
  view.unmount();
  mount();
  await screen.findByText('Travel d20: rolled 12 — safe route');
  expect(persisted).toHaveLength(1);
});

test('failed save does not claim success and retry saves once', async () => {
  apiClient.post.mockRejectedValueOnce(new Error('offline'));
  mount();
  await screen.findByRole('button', { name: 'Add to Notes' });
  await act(async () => { fireEvent.click(screen.getByText('Add to Notes')); });
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.queryByText('Travel d20: rolled 12 — safe route')).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByText('Add to Notes')); });
  expect(persisted).toHaveLength(1);
  expect(toast.success).toHaveBeenCalledTimes(1);
});

test('rapid repeated clicks on the same roll cannot duplicate a pending save', async () => {
  let finish;
  apiClient.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  mount();
  await screen.findByRole('button', { name: 'Add to Notes' });
  fireEvent.click(screen.getByText('Add to Notes'));
  fireEvent.click(screen.getByText('Add to Notes'));
  expect(apiClient.post).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ data: { id: 'server-1' } }); });
  fireEvent.click(screen.getByText('Add to Notes'));
  expect(apiClient.post).toHaveBeenCalledTimes(1);
});
