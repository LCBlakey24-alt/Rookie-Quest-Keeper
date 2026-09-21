import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PlayerCampaignsPanel from './PlayerCampaignsPanel';

describe('PlayerCampaignsPanel membership states', () => {
  test('pending campaigns stay visible but cannot be opened before GM approval', () => {
    const onOpenCampaign = jest.fn();

    render(
      <PlayerCampaignsPanel
        campaigns={[{
          id: 'campaign-1',
          name: 'Tia-Karta',
          member_role: 'player',
          member_status: 'pending',
        }]}
        onJoinCampaign={jest.fn()}
        onOpenCampaign={onOpenCampaign}
      />,
    );

    expect(screen.getByText('Awaiting GM approval')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Awaiting Approval' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onOpenCampaign).not.toHaveBeenCalled();
  });

  test('approved campaigns remain openable', () => {
    const onOpenCampaign = jest.fn();
    const campaign = {
      id: 'campaign-1',
      name: 'Tia-Karta',
      member_role: 'player',
      member_status: 'active',
    };

    render(
      <PlayerCampaignsPanel
        campaigns={[campaign]}
        onJoinCampaign={jest.fn()}
        onOpenCampaign={onOpenCampaign}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Open Campaign/i }));
    expect(onOpenCampaign).toHaveBeenCalledWith(campaign);
  });
});
