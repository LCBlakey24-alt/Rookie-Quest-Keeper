import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LiveSessionGridMode from './LiveSessionGridMode';

jest.mock('./LiveEncounterLauncher', () => () => <div>Encounter launcher</div>);

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
    expect(screen.getByText('Encounter launcher')).toBeInTheDocument();
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
});
