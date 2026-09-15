import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Mail, Shield } from 'lucide-react';
import PlayerDashboardTabs, { PLAYER_DASHBOARD_TAB_KEY } from './PlayerDashboardTabs';

const tabs = [
  { id: 'characters', label: 'Characters', icon: Shield, testId: 'tab-characters' },
  { id: 'handouts', label: 'Received', icon: Mail, testId: 'tab-handouts' },
];

describe('PlayerDashboardTabs', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('shows a compact unread badge without changing the tab label', () => {
    render(
      <PlayerDashboardTabs
        tabs={[
          { id: 'characters', label: 'Characters', icon: Shield, testId: 'tab-characters' },
          { id: 'handouts', label: 'Received', badge: 3, icon: Mail, testId: 'tab-handouts' },
        ]}
        activeTab="characters"
        setActiveTab={jest.fn()}
      >
        <div>Character content</div>
      </PlayerDashboardTabs>,
    );

    expect(screen.getByTestId('tab-handouts')).toHaveTextContent('Received');
    expect(screen.getByTestId('tab-handouts')).not.toHaveTextContent('Received (3)');
    expect(screen.getByLabelText('3 unread')).toHaveTextContent('3');
  });

  test('caps very large unread counts so mobile tabs stay stable', () => {
    render(
      <PlayerDashboardTabs
        tabs={[
          { id: 'handouts', label: 'Received', badge: 142, icon: Mail, testId: 'tab-handouts' },
        ]}
        activeTab="handouts"
        setActiveTab={jest.fn()}
      >
        <div>Handout content</div>
      </PlayerDashboardTabs>,
    );

    expect(screen.getByLabelText('142 unread')).toHaveTextContent('99+');
  });

  test('restores the last valid player section when returning to Player Home', () => {
    sessionStorage.setItem(PLAYER_DASHBOARD_TAB_KEY, 'handouts');
    const setActiveTab = jest.fn();

    render(
      <PlayerDashboardTabs tabs={tabs} activeTab="characters" setActiveTab={setActiveTab}>
        <div>Character content</div>
      </PlayerDashboardTabs>,
    );

    expect(setActiveTab).toHaveBeenCalledWith('handouts');
  });

  test('ignores a remembered section that is no longer a valid player tab', () => {
    sessionStorage.setItem(PLAYER_DASHBOARD_TAB_KEY, 'gm-secret');
    const setActiveTab = jest.fn();

    render(
      <PlayerDashboardTabs tabs={tabs} activeTab="characters" setActiveTab={setActiveTab}>
        <div>Character content</div>
      </PlayerDashboardTabs>,
    );

    expect(setActiveTab).not.toHaveBeenCalled();
  });

  test('remembers a section when the player changes tabs', () => {
    const setActiveTab = jest.fn();
    render(
      <PlayerDashboardTabs tabs={tabs} activeTab="characters" setActiveTab={setActiveTab}>
        <div>Character content</div>
      </PlayerDashboardTabs>,
    );

    fireEvent.mouseDown(screen.getByTestId('tab-handouts'), { button: 0, ctrlKey: false });

    expect(setActiveTab).toHaveBeenCalledWith('handouts');
    expect(sessionStorage.getItem(PLAYER_DASHBOARD_TAB_KEY)).toBe('handouts');
  });
});
