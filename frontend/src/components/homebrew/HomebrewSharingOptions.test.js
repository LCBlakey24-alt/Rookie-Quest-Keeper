import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import HomebrewSharingOptions from './HomebrewSharingOptions';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn() } }));

function Harness({ initial = {} }) {
  const [source, setSource] = useState(initial.source || 'original');
  const [visibility, setVisibility] = useState(initial.visibility || 'private');
  const [campaignId, setCampaignId] = useState('');
  return (
    <>
      <HomebrewSharingOptions source={source} onSourceChange={setSource} visibility={visibility}
        onVisibilityChange={setVisibility} campaignId={campaignId} onCampaignChange={setCampaignId} />
      <output data-testid="state">{`${source}|${visibility}|${campaignId}`}</output>
    </>
  );
}

beforeEach(() => apiClient.get.mockResolvedValue({ data: [{ id: 'camp', name: 'Synthetic One' }] }));

test('book content cannot be public, and switching to it steps public back to private', async () => {
  render(<Harness initial={{ visibility: 'public' }} />);
  fireEvent.click(screen.getByTestId('hb-source-published_book'));
  await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('published_book|private|'));
  expect(screen.getByTestId('hb-visibility-public')).toBeDisabled();
  expect(screen.getByRole('note')).toHaveTextContent(/cannot copy, export or publish/);
});

test('sharing with a campaign picks one of your campaigns from a list', async () => {
  render(<Harness />);
  fireEvent.click(screen.getByTestId('hb-visibility-campaign'));
  const select = await screen.findByTestId('hb-campaign');
  await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(2));
  fireEvent.change(select, { target: { value: 'camp' } });
  expect(screen.getByTestId('state')).toHaveTextContent('original|campaign|camp');
});
