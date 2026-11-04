import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import MyCampaignsPage from './MyCampaignsPage';

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
    error: jest.fn(),
  },
}));

const campaign = {
  id: 'camp-1',
  name: 'Baldering',
  campaign_type: 'high_fantasy',
  rules_edition: '2014',
  system: 'D&D 5e 2014 Compatible',
  linked_character_count: 4,
  description: 'Rebuild the Crownless City.',
  updated_at: '2026-08-24T12:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/campaigns']}>
      <MyCampaignsPage />
    </MemoryRouter>
  );
}

describe('MyCampaignsPage simplified library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockImplementation((url) => {
      if (url === '/library/campaigns' || url === '/campaigns') return Promise.resolve({ data: [campaign] });
      if (url === '/library/characters') return Promise.resolve({ data: [{ id: 'char-1', name: 'Javen Crow' }] });
      if (url === '/campaign-invites/joined/list') return Promise.resolve({ data: [] });
      return Promise.reject(new Error(`Unexpected API request: ${url}`));
    });
  });

  test('keeps the page focused on campaign selection and core actions', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Baldering' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Campaigns' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Campaign/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Baldering' })).toBeInTheDocument();
    expect(screen.getByText(/Rebuild the Crownless City/i)).toBeInTheDocument();
  });

  test('keeps loaded campaigns visible and warns when refresh fails', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Baldering' })).toBeInTheDocument();

    apiClient.get.mockRejectedValueOnce(new Error('network unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('Showing your last loaded campaigns')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Baldering' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled());
  });

  test('shows joined campaigns instead of falsely saying no campaigns exist', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/library/campaigns') return Promise.resolve({ data: [] });
      if (url === '/library/characters') return Promise.resolve({ data: [{ id: 'char-1', name: 'Javen Crow' }] });
      if (url === '/campaign-invites/joined/list') return Promise.resolve({ data: [{ id: 'joined-1', name: 'The Wednesday Party', description: 'A campaign I joined' }] });
      return Promise.reject(new Error('unexpected request'));
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'The Wednesday Party' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Joined as a Player' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /No campaigns you're managing/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No campaigns yet' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join by Code' })).toBeEnabled();
  });

  test('does not claim players have no characters or joined campaigns during failed requests', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === '/library/campaigns') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('network unavailable'));
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Checking your joined campaigns…' })).toBeInTheDocument();
    expect(await screen.findByText("Couldn't refresh all player campaign information")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join by Code' })).toBeDisabled();
    expect(screen.queryByRole('heading', { name: 'No campaigns yet' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry player tools' })).toBeEnabled();
  });

  test('allows retrying player tools after a failed character request', async () => {
    let recovered = false;
    apiClient.get.mockImplementation((url) => {
      if (url === '/library/campaigns') return Promise.resolve({ data: [campaign] });
      if (!recovered) return Promise.reject(new Error('network unavailable'));
      if (url === '/library/characters') return Promise.resolve({ data: [{ id: 'char-1', name: 'Javen Crow' }] });
      if (url === '/campaign-invites/joined/list') return Promise.resolve({ data: [] });
      return Promise.reject(new Error('unexpected request'));
    });

    renderPage();
    expect(await screen.findByText("Couldn't refresh all player campaign information")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join by Code' })).toBeDisabled();

    recovered = true;
    fireEvent.click(screen.getByRole('button', { name: 'Retry player tools' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Join by Code' })).toBeEnabled());
    await waitFor(() => expect(screen.queryByText("Couldn't refresh all player campaign information")).not.toBeInTheDocument());
  });

  test('retains last-good joined campaign when its refresh fails', async () => {
    let failJoined = false;
    apiClient.get.mockImplementation((url) => {
      if (url === '/library/campaigns') return Promise.resolve({ data: [] });
      if (url === '/library/characters') return Promise.resolve({ data: [{ id: 'char-1', name: 'Javen Crow' }] });
      if (url === '/campaign-invites/joined/list') {
        return failJoined ? Promise.reject(new Error('offline')) : Promise.resolve({ data: [{ id: 'joined-1', name: 'The Wednesday Party' }] });
      }
      return Promise.reject(new Error('unexpected request'));
    });

    renderPage();
    expect(await screen.findByRole('heading', { name: 'The Wednesday Party' })).toBeInTheDocument();

    failJoined = true;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText("Couldn't refresh all player campaign information")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Wednesday Party' })).toBeInTheDocument();
  });

  test('does not render the retired campaign stats dashboard or toolbar', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Baldering' });

    expect(screen.queryByText('Linked characters')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest update')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved tables')).not.toBeInTheDocument();
    expect(screen.queryByText(/Keep prep tidy/i)).not.toBeInTheDocument();
  });
});
