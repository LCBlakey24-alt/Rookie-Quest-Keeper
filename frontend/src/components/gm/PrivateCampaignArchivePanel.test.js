import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import PrivateCampaignArchivePanel from './PrivateCampaignArchivePanel';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const sha = 'c'.repeat(40);
const file = { path: 'frontend/src/data/legacy-personal-world.js', source_blob_sha: sha };

beforeEach(() => {
  jest.clearAllMocks();
});

test('private archive stays collapsed and fetches no files until the owner opens it', async () => {
  apiClient.get.mockResolvedValue({ data: { files: [file] } });
  render(<PrivateCampaignArchivePanel campaignId="my-campaign" />);
  expect(apiClient.get).not.toHaveBeenCalled();
  expect(screen.queryByText('legacy-personal-world.js')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Personal GM source archive/ }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'legacy-personal-world.js' })).toBeInTheDocument());
  expect(apiClient.get).toHaveBeenCalledWith('/campaigns/my-campaign/private-source-archive');
});

test('source is only loaded on an authenticated file request, never embedded in the app', async () => {
  apiClient.get.mockImplementation(url => Promise.resolve({
    data: url.endsWith(sha)
      ? { path: file.path, source_text: 'Archived GM-only world notes' }
      : { files: [file] },
  }));
  render(<PrivateCampaignArchivePanel campaignId="owned" />);
  fireEvent.click(screen.getByRole('button', { name: /Personal GM source archive/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'legacy-personal-world.js' }));
  expect(await screen.findByRole('textbox', { name: 'Private archived source' }))
    .toHaveValue('Archived GM-only world notes');
  expect(apiClient.get).toHaveBeenCalledWith(`/campaigns/owned/private-source-archive/${sha}`);
});

test('a missing or forbidden archive shows no previous account source', async () => {
  apiClient.get.mockRejectedValue({ response: { status: 404 } });
  render(<PrivateCampaignArchivePanel campaignId="other-campaign" />);
  fireEvent.click(screen.getByRole('button', { name: /Personal GM source archive/ }));
  expect(await screen.findByRole('status')).toHaveTextContent('Private archive could not be loaded');
  expect(screen.queryByLabelText('Private archived source')).not.toBeInTheDocument();
});
