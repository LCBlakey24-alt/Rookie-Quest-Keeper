import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import LiveSessionGridPage from './LiveSessionGridPage';
import { loadLiveSessionSections } from '@/data/livePlayLoaders';

jest.mock('@/data/livePlayLoaders', () => ({ loadLiveSessionSections: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn(), success: jest.fn() } }));
jest.mock('./LiveSessionGridMode', () => () => null);
jest.mock('./LiveStoryFocusPanel', () => () => null);
jest.mock('./GroupCheckRequestPanel', () => () => null);
jest.mock('./LiveDataWarning', () => () => null);
jest.mock('./PlayerDisplayDeliveryStatus', () => () => null);
jest.mock('./ChaosFateTracker', () => () => null);
jest.mock('@/components/DiceRollFlicker', () => () => null);

const result = (id, allow) => ({ sections: {
  campaign: { ok: true, data: { id, name: id, allow_exploding_dice: allow } },
  players: { ok: true, data: [] },
  scenarios: { ok: true, data: [] },
  calendar: { ok: true, data: null },
  notes: { ok: true, data: [] },
}, errors: [] });

function Nav() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/gm-screen/beta')}>Switch to beta</button>;
}
function mount() {
  return render(<MemoryRouter initialEntries={['/gm-screen/alpha']}><Nav /><Routes>
    <Route path="/gm-screen/:campaignId" element={<LiveSessionGridPage />} />
  </Routes></MemoryRouter>);
}

describe('per-campaign exploding dice preferences', () => {
  beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });

  test('new campaign uses its true default before saving any override', async () => {
    loadLiveSessionSections.mockResolvedValue(result('alpha', true));
    mount();
    await screen.findByText('alpha');
    expect(screen.getByLabelText(/Exploding dice/i)).toBeChecked();
    expect(localStorage.getItem('gm.explodingDice.alpha')).toBeNull();
  });

  test('an explicit saved false overrides a true campaign default', async () => {
    localStorage.setItem('gm.explodingDice.alpha', 'false');
    loadLiveSessionSections.mockResolvedValue(result('alpha', true));
    mount();
    await screen.findByText('alpha');
    expect(screen.getByLabelText(/Exploding dice/i)).not.toBeChecked();
  });

  test('switching campaigns does not copy the old toggle or overwrite the new preference', async () => {
    localStorage.setItem('gm.explodingDice.alpha', 'false');
    loadLiveSessionSections.mockImplementation((_api, id) => Promise.resolve(result(id, id === 'beta')));
    mount();
    await screen.findByText('alpha');
    expect(screen.getByLabelText(/Exploding dice/i)).not.toBeChecked();
    fireEvent.click(screen.getByText('Switch to beta'));
    await screen.findByText('beta');
    expect(screen.getByLabelText(/Exploding dice/i)).toBeChecked();
    expect(localStorage.getItem('gm.explodingDice.alpha')).toBe('false');
    expect(localStorage.getItem('gm.explodingDice.beta')).toBeNull();
  });

  test('a changed preference saves only for the active campaign', async () => {
    loadLiveSessionSections.mockResolvedValue(result('alpha', true));
    mount();
    await screen.findByText('alpha');
    fireEvent.click(screen.getByLabelText(/Exploding dice/i));
    expect(localStorage.getItem('gm.explodingDice.alpha')).toBe('false');
  });

  test('unavailable preference storage does not prevent Live Play rendering or changing the toggle', async () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage disabled'); });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage disabled'); });
    try {
      loadLiveSessionSections.mockResolvedValue(result('alpha', true));
      mount();
      await screen.findByText('alpha');
      expect(screen.getByLabelText(/Exploding dice/i)).toBeChecked();
      fireEvent.click(screen.getByLabelText(/Exploding dice/i));
      expect(screen.getByLabelText(/Exploding dice/i)).not.toBeChecked();
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });
});
