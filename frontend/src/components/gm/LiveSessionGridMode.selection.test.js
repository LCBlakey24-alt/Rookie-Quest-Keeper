import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LiveSessionGridMode from './LiveSessionGridMode';

jest.mock('./LiveEncounterLauncher', () => ({
  __esModule: true,
  default: ({ requestedEncounterId }) => <div>Encounter launcher <span data-testid="reviewed-encounter-id">{requestedEncounterId}</span></div>,
  nextReadyEncounter: scenarios => scenarios.filter(s => s.live_ready && !s.played && !s.legacy)
    .sort((a, b) => Number(Boolean(b.live_default)) - Number(Boolean(a.live_default)) || (a.planned_encounter_order ?? Infinity) - (b.planned_encounter_order ?? Infinity))[0] || null,
}));

describe('Live Play wax-seal navigation', () => {
  beforeEach(() => localStorage.clear());


  test('shows the next prepared encounter and jumps straight to Encounter Review', () => {
    render(
      <LiveSessionGridMode
        campaignId="hollowmere"
        players={[{ id: 'rina', name: 'Rina' }, { id: 'josh', name: 'Josh' }, { id: 'orren', name: 'Orren' }]}
        scenarios={[
          { id: 'archive', name: 'Old boss', legacy: true },
          { id: 'hm02', name: 'HM-02 — Breeding Gallery', live_ready: true, planned_encounter_order: 2 },
          { id: 'hm01', name: 'HM-01 — Ceiling Skitter Ambush (TONIGHT)', live_ready: true, planned_encounter_order: 1 },
        ]}
        renderTool={name => <div>Tool: {name}</div>}
      />,
    );
    expect(screen.getByText('HM-01 — Ceiling Skitter Ambush')).toBeInTheDocument();
    expect(screen.getByText('3 characters')).toBeInTheDocument();
    expect(screen.getByText('2 prepared battles')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Review & run encounter/i }));
    expect(screen.getByTestId('live-tool-combat')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText(/Encounter launcher/)).toBeInTheDocument();
    expect(screen.getByTestId('reviewed-encounter-id')).toHaveTextContent('hm01');
  });

  test('ignores malformed stored recent tools without crashing the session', () => {
    localStorage.setItem('gm.liveMode.recent.bad-recent', '{"unexpected":true}');
    render(<LiveSessionGridMode campaignId="bad-recent" renderTool={name => <div>{name}</div>} />);
    expect(screen.getByTestId('live-session-grid')).toBeInTheDocument();
  });

  test('only the selected tool is marked current and selection changes without leaving the page', () => {
    render(
      <LiveSessionGridMode
        campaignId="wax-test"
        renderTool={(name) => <div>Tool: {name}</div>}
      />,
    );
    const run = screen.getByTestId('live-tool-overview');
    const quests = screen.getByTestId('live-tool-story');
    expect(run).toHaveAttribute('aria-current', 'page');
    expect(quests).not.toHaveAttribute('aria-current');
    fireEvent.click(quests);
    expect(quests).toHaveClass('is-active');
    expect(quests).toHaveAttribute('aria-current', 'page');
    expect(run).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Tool: story')).toBeInTheDocument();
  });

  test('a played remembered encounter stays separate from next ready, and reopens deliberately', () => {
    localStorage.setItem('gm.lastEncounter.hollowmere', 'played-old');
    render(
      <LiveSessionGridMode campaignId="hollowmere"
        scenarios={[
          { id: 'played-old', name: 'Old', played: true, live_ready: true },
          { id: 'next', name: 'Next', live_ready: true },
        ]}
        renderTool={name => <div>Tool: {name}</div>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Review & run encounter/i }));
    expect(screen.getByTestId('reviewed-encounter-id')).toHaveTextContent('next');
    fireEvent.click(screen.getByTestId('live-tool-overview'));
    fireEvent.click(screen.getByRole('button', { name: /Reopen last encounter/i }));
    expect(screen.getByTestId('reviewed-encounter-id')).toHaveTextContent('played-old');
  });

});
