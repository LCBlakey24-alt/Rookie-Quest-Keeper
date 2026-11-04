import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { loadLiveSessionSections } from '@/data/livePlayLoaders';
import LiveSessionGridPage from './LiveSessionGridPage';
import InitiativeTracker from './InitiativeTracker';

jest.mock('@/data/livePlayLoaders', () => ({ loadLiveSessionSections: jest.fn() }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), warning: jest.fn(), success: jest.fn() } }));
jest.mock('./LiveSessionGridMode', () => ({ __esModule: true, default: ({ renderTool }) => <div>{renderTool('combat')}</div> }));
jest.mock('./CombatTab', () => ({ __esModule: true, default: ({ quickStartCombat }) => <button onClick={quickStartCombat}>Run synthetic quick combat</button> }));
jest.mock('./LiveStoryFocusPanel', () => () => null);
jest.mock('./GroupCheckRequestPanel', () => () => null);
jest.mock('./LiveDataWarning', () => () => null);
jest.mock('./PlayerDisplayDeliveryStatus', () => () => null);
jest.mock('./ChaosFateTracker', () => () => null);
jest.mock('@/components/DiceRollFlicker', () => () => null);

const party = [
  { id: 'down', character_id: 'down', name: 'Down', hp: 0, max_hp: 40, ac: 17, initiativeMod: 2, conditions: ['prone'], death_saves_failures: 1, concentrating_on: '' },
  { id: 'hurt', character_id: 'hurt', name: 'Hurt', hp: 8, max_hp: 28, ac: 14, initiativeMod: -1, conditions: ['poisoned'], temporary_hit_points: 4 },
  { id: 'missing', character_id: 'missing', name: 'Missing data', max_hp: 25, ac: null, stats: { dexterity: 14 } },
];

const backend = { sections: {
  campaign: { ok: true, data: { id: 'test', name: 'Synthetic Campaign' } },
  players: { ok: true, data: party },
  scenarios: { ok: true, data: [] },
  calendar: { ok: true, data: null },
  notes: { ok: true, data: [] },
}, errors: [] };

function CombatHandoff() {
  const location = useLocation();
  const scenario = location.state?.scenario;
  return <div data-testid="quick-handoff">{JSON.stringify(scenario)}</div>;
}

test('Quick Combat carries downed/wounded HP, conditions and canonical character IDs into the combat route', async () => {
  loadLiveSessionSections.mockResolvedValue(backend);
  render(<MemoryRouter initialEntries={['/gm-screen/test']}><Routes>
    <Route path="/gm-screen/:campaignId" element={<LiveSessionGridPage />} />
    <Route path="/combat/:campaignId" element={<CombatHandoff />} />
  </Routes></MemoryRouter>);
  await screen.findByRole('button', { name: 'Run synthetic quick combat' });
  await act(async () => { fireEvent.click(screen.getByText('Run synthetic quick combat')); });
  const scenario = JSON.parse(screen.getByTestId('quick-handoff').textContent);
  const participants = scenario.combatants || scenario.participants;
  expect(participants).toHaveLength(3);
  expect(participants[0]).toMatchObject({ hp: 0, maxHp: 40, conditions: ['prone'], character_id: 'down' });
  expect(participants[1]).toMatchObject({ hp: 8, maxHp: 28, conditions: ['poisoned'], tempHp: 4 });
  expect(participants[2]).toMatchObject({ hp: 25, maxHp: 25, ac: 10, initiativeMod: 2 });
});

const theme = { bg: { card: '#0B1B2B' }, border: '#284964', text: { primary: '#EADFC8', muted: '#aabbcc' }, accent: { primary: '#3C92E0' } };
test('InitiativeTracker consumer retains downed and wounded combatants (PR #723 coordination)', () => {
  render(<InitiativeTracker theme={theme} campaignId="synthetic" combatants={[
    { id: 'down', name: 'Down', type: 'player', hp: 0, maxHp: 40, ac: 17, conditions: ['prone'] },
    { id: 'hurt', name: 'Hurt', type: 'player', hp: 8, maxHp: 28, ac: 14, conditions: ['poisoned'] },
  ]} />);
  expect(screen.getByText('0/40')).toBeInTheDocument();
  expect(screen.getByText('8/28')).toBeInTheDocument();
});
