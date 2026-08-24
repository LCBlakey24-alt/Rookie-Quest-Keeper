import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import HomebrewWorkshop from './HomebrewWorkshop';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ImageUploadPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-image-upload" />,
}));

function renderWorkshop() {
  return render(
    <MemoryRouter initialEntries={['/homebrew']}>
      <HomebrewWorkshop />
    </MemoryRouter>
  );
}

const savedSubclass = {
  id: 'hb-1',
  name: 'Scarab Pact',
  description: 'A saved subclass that must not disappear when refresh fails.',
  visibility: 'private',
  edition: '2014',
};

describe('HomebrewWorkshop library reliability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not present an initial load failure as an empty library', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('offline'));

    renderWorkshop();

    expect(await screen.findByTestId('hb-library-warning')).toHaveTextContent(
      'Homebrew library could not be loaded. Retry before assuming it is empty.'
    );
    expect(screen.queryByText(/No saved subclass yet\./i)).not.toBeInTheDocument();
  });

  test('preserves last-known-good homebrew when a manual refresh fails', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { homebrew: { subclass: [savedSubclass] } } })
      .mockRejectedValueOnce(new Error('offline'));

    renderWorkshop();

    expect(await screen.findByText('Scarab Pact')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('hb-refresh-library'));

    await waitFor(() => {
      expect(screen.getByTestId('hb-library-warning')).toHaveTextContent(
        'Library refresh failed. Showing your last loaded homebrew.'
      );
    });

    expect(screen.getByText('Scarab Pact')).toBeInTheDocument();
    expect(screen.queryByText(/No saved subclass yet\./i)).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith('Could not refresh your Homebrew library.');
  });

  test('treats malformed successful responses as failures instead of believable emptiness', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { homebrew: null } });

    renderWorkshop();

    expect(await screen.findByTestId('hb-library-warning')).toHaveTextContent(
      'Homebrew library could not be loaded. Retry before assuming it is empty.'
    );
    expect(screen.queryByText(/No saved subclass yet\./i)).not.toBeInTheDocument();
  });
});
