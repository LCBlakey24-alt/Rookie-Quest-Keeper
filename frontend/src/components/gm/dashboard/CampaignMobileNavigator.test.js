import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignMobileNavigator from './CampaignMobileNavigator';
import { allTabs } from './campaignDashboardTabs';

describe('Guild Ledger mobile campaign navigation', () => {
  test('every GM tool remains one selection away without a nested menu', () => {
    const navigate = jest.fn();
    render(<CampaignMobileNavigator activeTab="npcs" onOpenTab={navigate} />);
    const select = screen.getByRole('combobox', { name: 'Jump to campaign workspace' });
    expect(select).toHaveValue('npcs');
    expect(screen.getByText('NPCs', { selector: 'strong' })).toBeInTheDocument();

    const options = [...select.querySelectorAll('option')];
    expect(options).toHaveLength(allTabs.length);
    expect(options.map(option => option.value)).toEqual(allTabs.map(tab => tab.id));

    fireEvent.change(select, { target: { value: 'chronicle' } });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('chronicle');
  });

  test('a campaign change reuses the controlled current workspace without keeping stale text', () => {
    const navigate = jest.fn();
    const view = render(<CampaignMobileNavigator activeTab="npcs" onOpenTab={navigate} />);
    view.rerender(<CampaignMobileNavigator activeTab="combat" onOpenTab={navigate} />);
    expect(screen.getByRole('combobox', { name: 'Jump to campaign workspace' })).toHaveValue('combat');
    expect(screen.getByText('Encounters', { selector: 'strong' })).toBeInTheDocument();
  });

  test('tool options are arranged by the real campaign sections', () => {
    render(<CampaignMobileNavigator activeTab="command-centre" onOpenTab={jest.fn()} />);
    const selector = screen.getByRole('combobox', { name: 'Jump to campaign workspace' });
    const groups = [...selector.querySelectorAll('optgroup')];
    expect(groups.map(group => group.label)).toEqual(['Campaign', 'World', 'Prep', 'More']);
    expect(selector.querySelector('option[value="npcs"]')).toBeInTheDocument();
    expect(selector.querySelector('option[value="chronicle"]')).toBeInTheDocument();
    expect(selector.querySelector('option[value="combat"]')).toBeInTheDocument();
  });
});
