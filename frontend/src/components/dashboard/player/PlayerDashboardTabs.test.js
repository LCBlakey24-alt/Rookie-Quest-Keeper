import React from 'react';
import { render, screen } from '@testing-library/react';
import { Mail, Shield } from 'lucide-react';
import PlayerDashboardTabs from './PlayerDashboardTabs';

describe('PlayerDashboardTabs', () => {
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
});
