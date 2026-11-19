import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CampaignDocumentCard, { CAMPAIGN_DOCUMENT_AI_PROMPT } from './CampaignDocumentCard';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

test('offers the template, the AI prompt and an upload locked to this campaign', () => {
  render(<CampaignDocumentCard campaignId="camp-1" campaignName="The Mistward Coast" prominent />);
  expect(screen.getByRole('heading', { name: /Bring your whole campaign in at once/i })).toBeInTheDocument();
  expect(screen.getByTestId('campaign-document-download')).toBeInTheDocument();
  expect(screen.getByText(CAMPAIGN_DOCUMENT_AI_PROMPT)).toBeInTheDocument();

  fireEvent.click(screen.getByTestId('campaign-document-upload'));
  expect(screen.getByTestId('workbook-locked-target')).toHaveTextContent('Adds to: The Mistward Coast');
  expect(screen.queryByLabelText('Import destination')).toBeNull();
});

test('the AI prompt forbids invented content and asks for matching names', () => {
  expect(CAMPAIGN_DOCUMENT_AI_PROMPT).toMatch(/Don't invent names, game statistics or history/);
  expect(CAMPAIGN_DOCUMENT_AI_PROMPT).toMatch(/same names/);
});
