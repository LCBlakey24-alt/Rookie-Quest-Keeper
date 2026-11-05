import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import NotesTab from './NotesTab';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock('@/lib/livePlayHandoffs', () => ({ persistLivePlayHandoff: jest.fn() }));
const theme = { accent: { gm: '#3C92E0' }, text: { primary: '#EADFC8' }, bg: { card: '#0B1B2B', panel: '#0B1B2B', primary: '#0B1B2B' } };
const deferred = () => { let resolve; let reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };

function Host({ campaignId = 'synthetic' }) {
  const [note, setNote] = useState('First draft');
  const [records, setRecords] = useState([]);
  return <><NotesTab theme={theme} campaignId={campaignId} quickNote={note} setQuickNote={setNote} sessionNotes={records} setSessionNotes={setRecords} /><output data-testid="record-count">{records.length}</output></>;
}
const write = value => fireEvent.change(screen.getByTestId('live-quick-note'), { target: { value } });
const save = () => fireEvent.click(screen.getByRole('button', { name: /Save Note/ }));

beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); apiClient.post.mockResolvedValue({ data: { id: 'saved-1' } }); });

test('typing while save is pending does not get erased on delayed success', async () => {
  const pending = deferred();
  apiClient.post.mockImplementationOnce(() => pending.promise);
  render(<Host />);
  save();
  write('First draft — more thoughts during save');
  await act(async () => { pending.resolve({ data: { id: 'saved-1' } }); });
  expect(screen.getByTestId('live-quick-note')).toHaveValue('First draft — more thoughts during save');
  expect(screen.getByTestId('record-count')).toHaveTextContent('1');
});

test('unchanged submitted draft clears after success', async () => {
  render(<Host />);
  await act(async () => { save(); });
  expect(screen.getByTestId('live-quick-note')).toHaveValue('');
});

test('failed save keeps edits and allows retry', async () => {
  const pending = deferred();
  apiClient.post.mockImplementationOnce(() => pending.promise);
  render(<Host />);
  save();
  write('Recoverable continued draft');
  await act(async () => { pending.reject(new Error('offline')); });
  expect(screen.getByTestId('live-quick-note')).toHaveValue('Recoverable continued draft');
  await act(async () => { save(); });
  expect(screen.getByTestId('record-count')).toHaveTextContent('1');
  expect(apiClient.post).toHaveBeenCalledWith('/campaigns/synthetic/ingame-notes', { content: 'Recoverable continued draft' });
});

test('unmount during pending save cannot clear draft or publish stale UI notifications', async () => {
  const pending = deferred();
  apiClient.post.mockImplementationOnce(() => pending.promise);
  const view = render(<Host />);
  save();
  view.unmount();
  await act(async () => { pending.resolve({ data: { id: 'saved-1' } }); });
  expect(toast.success).not.toHaveBeenCalled();
});
