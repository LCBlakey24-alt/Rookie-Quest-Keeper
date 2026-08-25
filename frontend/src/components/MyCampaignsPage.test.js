import React from 'react';
import { render, screen } from '@testing-library/react';
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
    apiClient.get.mockResolvedValue({ data: [campaign] });
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

  test('does not render the retired campaign stats dashboard or toolbar', async () => {
    renderPage();

    await screen.findByRole('heading', { name: 'Baldering' });

    expect(screen.queryByText('Linked characters')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest update')).not.toBeInTheDocument();
    expect(screen.queryByText('Saved tables')).not.toBeInTheDocument();
    expect(screen.queryByText(/Keep prep tidy/i)).not.toBeInTheDocument();
  });
});
