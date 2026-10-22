import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CampaignToolFinder from './CampaignToolFinder';

describe('Guild Ledger GM tool finder', () => {
  const setup = () => {
    const onSelect = jest.fn();
    render(<CampaignToolFinder
      campaignName="Spilsby Wednesday"
      activeTab="command-centre"
      onSelect={onSelect}
    />);
    return { onSelect };
  };

  test('opens a properly named, campaign-specific search dialog', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Find a campaign tool' }));
    const dialog = screen.getByRole('dialog', { name: 'Find a workspace' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText(/Spilsby Wednesday/)).toBeInTheDocument();
    expect(within(dialog).getByRole('searchbox', { name: 'Search campaign tools' })).toHaveFocus();
    expect(within(dialog).getByTestId('finder-tool-npcs')).toBeInTheDocument();
  });

  test('searches familiar words and opens the correct existing workspace', () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Find a campaign tool' }));
    const input = screen.getByRole('searchbox', { name: 'Search campaign tools' });
    fireEvent.change(input, { target: { value: 'relationships' } });
    fireEvent.click(screen.getByTestId('finder-tool-npcs'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('npcs');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('Ctrl+K opens from the keyboard; Escape closes and restores focus', () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'Find a campaign tool' });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('Enter navigates to the highlighted calendar and unknown searches never navigate', () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Find a campaign tool' }));
    const input = screen.getByRole('searchbox', { name: 'Search campaign tools' });
    fireEvent.change(input, { target: { value: 'calendar' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('chronicle');

    fireEvent.click(screen.getByRole('button', { name: 'Find a campaign tool' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'unfindable magical unicorn' } });
    expect(screen.getByText(/No matching tool/)).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
