import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

jest.mock('@/components/dashboard/home/CreateCampaignDialog', () => ({
  __esModule: true,
  default: ({ onClose }) => (
    <section data-testid="create-campaign-dialog">
      <button type="button" onClick={onClose}>Close create campaign</button>
    </section>
  ),
}));

describe('MyCampaignsPage create shortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
  });

  test('opens the existing campaign creator when Home links to ?create=1', async () => {
    render(
      <MemoryRouter initialEntries={['/campaigns?create=1']}>
        <Routes>
          <Route path="/campaigns" element={<MyCampaignsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('create-campaign-dialog')).toBeInTheDocument());
  });
});
