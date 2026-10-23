import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RosterSplitView from './RosterSplitView';

const NPCS = [
  { id: 'jordan', name: 'Jordan Crow', role: 'General of the Shield', hp: 168 },
  { id: 'mabel', name: 'Mabel Barleybrook', role: 'Provisions', hp: 102 },
  { id: 'lucian', name: 'Lucian Grey', role: 'Councillor', hp: 52 },
];

function Wrapper({ items = NPCS, campaign = 'wednesday' }) {
  const [selectedId, setSelectedId] = React.useState('');
  return <RosterSplitView key={campaign} items={items} selectedId={selectedId}
    onSelect={setSelectedId} title="Campaign NPCs"
    getSubtitle={npc => npc.role} getBadge={npc => 'HP ' + npc.hp}
    renderDetail={npc => <div data-testid="single-stat-sheet"><h3>{npc.name} stat sheet</h3><p>HP {npc.hp}</p></div>} />;
}

describe('GM roster split reference', () => {
  test('shows a short name list and exactly one full stat block', () => {
    render(<Wrapper />);
    const roster = screen.getByRole('group', { name: 'Choose campaign npcs' });
    expect(within(roster).getAllByRole('button')).toHaveLength(3);
    expect(screen.getAllByTestId('single-stat-sheet')).toHaveLength(1);
    expect(screen.getByText('Jordan Crow stat sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('roster-select-mabel'));
    expect(screen.getByText('Mabel Barleybrook stat sheet')).toBeInTheDocument();
    expect(screen.queryByText('Jordan Crow stat sheet')).not.toBeInTheDocument();
    expect(screen.getByTestId('roster-select-mabel')).toHaveAttribute('aria-current', 'true');
  });

  test('arrow navigation changes the selection and keyboard focus', () => {
    render(<Wrapper />);
    const jordan = screen.getByTestId('roster-select-jordan');
    jordan.focus();
    fireEvent.keyDown(jordan, { key: 'ArrowDown' });
    expect(screen.getByTestId('roster-select-mabel')).toHaveFocus();
    expect(screen.getByText('Mabel Barleybrook stat sheet')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('roster-select-mabel'), { key: 'End' });
    expect(screen.getByTestId('roster-select-lucian')).toHaveFocus();
    expect(screen.getByText('Lucian Grey stat sheet')).toBeInTheDocument();
  });

  test('filtered empty lists never show a previous NPC stat sheet', () => {
    const view = render(<Wrapper items={NPCS} />);
    fireEvent.click(screen.getByTestId('roster-select-lucian'));
    view.rerender(<Wrapper items={[]} />);
    expect(screen.queryByTestId('single-stat-sheet')).not.toBeInTheDocument();
    expect(screen.getByText('No matching entries.')).toBeInTheDocument();
  });

  test('a campaign switch does not keep old detail selection', () => {
    const view = render(<Wrapper campaign="eldritch" />);
    fireEvent.click(screen.getByTestId('roster-select-mabel'));
    view.rerender(<Wrapper campaign="wednesday" />);
    expect(screen.getByText('Jordan Crow stat sheet')).toBeInTheDocument();
  });
});
