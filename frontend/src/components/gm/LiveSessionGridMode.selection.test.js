import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LiveSessionGridMode from './LiveSessionGridMode';

jest.mock('./LiveEncounterLauncher', () => () => <div>Encounter launcher</div>);

describe('Live Play wax-seal navigation', () => {
  beforeEach(() => localStorage.clear());

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
