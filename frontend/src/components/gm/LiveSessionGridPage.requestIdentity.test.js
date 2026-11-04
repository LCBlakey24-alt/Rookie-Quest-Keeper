import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { loadLiveSessionSections } from '@/data/livePlayLoaders';
import LiveSessionGridPage from './LiveSessionGridPage';

jest.mock('@/data/livePlayLoaders', () => ({ loadLiveSessionSections: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn(), success: jest.fn() } }));
jest.mock('./LiveSessionGridMode', () => ({ __esModule: true, default: ({ players, scenarios }) =>
  <div data-testid="live-data">{players.map(p => p.name).join(',')} | {scenarios.map(s => s.name).join(',')}</div>,
}));
jest.mock('./LiveStoryFocusPanel', () => () => null);
jest.mock('./GroupCheckRequestPanel', () => () => null);
jest.mock('./LiveDataWarning', () => ({ errors, onRetry }) =>
  <div><button onClick={onRetry}>Refresh live data</button><span data-testid="load-errors">{errors.map(e => e.key).join(',')}</span></div>);
jest.mock('./PlayerDisplayDeliveryStatus', () => () => null);
jest.mock('./ChaosFateTracker', () => () => null);
jest.mock('@/components/DiceRollFlicker', () => () => null);

function response(id, { name = id, player = id, scenarios = [id], errors = [], fail = [] } = {}) {
  const data = {
    campaign: { id, name },
    players: [{ id: player, name: player }],
    scenarios: scenarios.map(s => ({ id: s, name: s })),
    calendar: { current_month: 1, current_day: 2, current_year: 590, custom_months: [{ name: 'Dawnseed' }] },
    notes: [{ id: id + '-note', content: id + ' note' }],
  };
  const sections = Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    fail.includes(key) ? { ok: false } : { ok: true, data: value },
  ]));
  return { sections, errors: [...errors, ...fail.map(key => ({ key, label: key }))] };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function Navigator() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/gm-screen/alpha')}>Go alpha</button><button onClick={() => navigate('/gm-screen/beta')}>Go beta</button></>;
}

function setup() {
  return render(
    <MemoryRouter initialEntries={['/gm-screen/alpha']}>
      <Navigator />
      <Routes><Route path="/gm-screen/:campaignId" element={<LiveSessionGridPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('Live Play request identity and campaign isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('a late older refresh cannot replace a newer party, encounters or errors', async () => {
    const pending = [];
    loadLiveSessionSections.mockImplementation(() => {
      const next = deferred(); pending.push(next); return next.promise;
    });
    setup();
    await act(async () => { pending[0].resolve(response('alpha', { name: 'Alpha', player: 'Initial' })); });
    await screen.findByText('Alpha');
    fireEvent.click(screen.getByText('Refresh live data'));
    fireEvent.click(screen.getByText('Refresh live data'));
    expect(pending).toHaveLength(3);
    await act(async () => { pending[2].resolve(response('alpha', { name: 'Newest', player: 'Latest', scenarios: ['New encounter'] })); });
    expect(screen.getByText('Newest')).toBeInTheDocument();
    await act(async () => { pending[1].resolve(response('alpha', { name: 'Stale', player: 'Old', scenarios: ['Old encounter'], errors: [{ key: 'notes' }] })); });
    expect(screen.getByText('Newest')).toBeInTheDocument();
    expect(screen.getByTestId('live-data')).toHaveTextContent('Latest | New encounter');
    expect(screen.getByTestId('load-errors')).toHaveTextContent('');
    expect(toast.warning).not.toHaveBeenCalled();
  });

  test('switching campaigns clears the old campaign before the new request returns and rejects late results', async () => {
    const pending = [];
    loadLiveSessionSections.mockImplementation((_api, id) => {
      const next = deferred(); pending.push({ id, ...next }); return next.promise;
    });
    setup();
    await act(async () => { pending[0].resolve(response('alpha', { name: 'Alpha Secret', player: 'Alpha PC' })); });
    expect(screen.getByText('Alpha Secret')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Refresh live data')); // alpha refresh remains pending
    fireEvent.click(screen.getByText('Go beta'));
    expect(screen.queryByText('Alpha Secret')).not.toBeInTheDocument();
    const beta = pending.find((item, index) => item.id === 'beta');
    expect(beta).toBeDefined();
    await act(async () => { beta.resolve(response('beta', { name: 'Beta Campaign', player: 'Beta PC' })); });
    await act(async () => { pending[1].resolve(response('alpha', { name: 'Leaked Alpha', player: 'Alpha PC' })); });
    expect(screen.getByText('Beta Campaign')).toBeInTheDocument();
    expect(screen.getByTestId('live-data')).toHaveTextContent('Beta PC');
    expect(screen.getByTestId('live-data')).not.toHaveTextContent('Alpha PC');
  });

  test('a partial refresh retains successful earlier data only within the same campaign', async () => {
    loadLiveSessionSections
      .mockResolvedValueOnce(response('alpha', { name: 'Alpha', player: 'First', scenarios: ['Keep me'] }))
      .mockResolvedValueOnce(response('alpha', { player: 'Updated', scenarios: [], fail: ['campaign', 'scenarios'] }));
    setup();
    await screen.findByText('Alpha');
    await act(async () => { fireEvent.click(screen.getByText('Refresh live data')); });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByTestId('live-data')).toHaveTextContent('Updated | Keep me');
    expect(screen.getByTestId('load-errors')).toHaveTextContent('campaign,scenarios');
  });

  test('unmounted requests cannot show warnings or change the page', async () => {
    const pending = deferred();
    loadLiveSessionSections.mockReturnValue(pending.promise);
    const view = setup();
    view.unmount();
    await act(async () => { pending.resolve(response('alpha', { errors: [{ key: 'calendar' }] })); });
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
