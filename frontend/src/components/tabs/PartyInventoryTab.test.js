import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PartyInventoryTab from './PartyInventoryTab';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

function successfulInitialGet(url) {
  if (url.endsWith('/inventory/grant-targets')) return Promise.resolve({ data: [] });
  if (url.endsWith('/inventory')) return Promise.resolve({ data: [{ id: 'item-1', name: 'Rope', item_type: 'misc', quantity: 1 }] });
  if (url.endsWith('/currency')) return Promise.resolve({ data: { gold: 10 } });
  return Promise.reject(new Error(`Unexpected URL: ${url}`));
}

describe('PartyInventoryTab reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockImplementation(successfulInitialGet);
  });

  test('keeps last-known loot when a manual inventory refresh fails', async () => {
    render(<PartyInventoryTab campaignId="campaign-1" />);

    expect(await screen.findByText('Rope')).toBeInTheDocument();

    apiClient.get.mockImplementation((url) => {
      if (url.endsWith('/inventory')) return Promise.reject(new Error('offline'));
      if (url.endsWith('/currency')) return Promise.resolve({ data: { gold: 10 } });
      if (url.endsWith('/inventory/grant-targets')) return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Inventory' }));

    expect(await screen.findByTestId('party-inventory-refresh-warning')).toHaveTextContent('party loot');
    expect(screen.getByText('Rope')).toBeInTheDocument();
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      'Party inventory only partly refreshed',
      expect.any(Object),
    ));
  });

  test('restores previous funds when a currency save fails', async () => {
    apiClient.put.mockRejectedValue(new Error('offline'));
    render(<PartyInventoryTab campaignId="campaign-1" />);

    const gpLabel = await screen.findByText('GP');
    const gpCard = gpLabel.closest('article');
    expect(gpCard).not.toBeNull();
    expect(within(gpCard).getByText('10')).toBeInTheDocument();

    fireEvent.click(within(gpCard).getByRole('button', { name: '+1' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'Could not update party funds',
      expect.objectContaining({ description: expect.stringMatching(/restored/i) }),
    ));
    await waitFor(() => expect(within(gpCard).getByText('10')).toBeInTheDocument());
    expect(within(gpCard).queryByText('11')).not.toBeInTheDocument();
  });
});
