import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignModeChooser from './CampaignModeChooser';

const campaign = {
  id: 'camp-7',
  name: 'Balderin',
  description: 'The crownless city has secrets.',
};

describe('CampaignModeChooser', () => {
  test('shows two distinct modes after selecting one campaign', () => {
    render(<CampaignModeChooser campaign={campaign} onBack={() => {}} onCreation={() => {}} onLive={() => {}} />);
    expect(screen.getByTestId('campaign-mode-selector')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Balderin' })).toBeInTheDocument();
    expect(screen.getByText('The crownless city has secrets.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Creation Mode for Balderin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Live Play Mode for Balderin' })).toBeInTheDocument();
    expect(screen.getByText(/same saved campaign/i)).toBeInTheDocument();
  });

  test('opens only the mode the GM selected', () => {
    const onBack = jest.fn();
    const onCreation = jest.fn();
    const onLive = jest.fn();
    render(<CampaignModeChooser campaign={campaign} onBack={onBack} onCreation={onCreation} onLive={onLive} />);
    fireEvent.click(screen.getByTestId('campaign-mode-creation'));
    expect(onCreation).toHaveBeenCalledTimes(1);
    expect(onLive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('campaign-mode-live'));
    expect(onLive).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'My Campaigns' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('does not require a prewritten description or session plan', () => {
    render(<CampaignModeChooser campaign={{ name: 'A new campaign' }} onBack={() => {}} onCreation={() => {}} onLive={() => {}} />);
    expect(screen.getByRole('heading', { name: 'A new campaign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Creation Mode for A new campaign' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Open Live Play Mode for A new campaign' })).toBeEnabled();
  });
});
