import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import WorldDocumentPanel from './WorldDocumentPanel';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const drafts = {
  overview: 'A drowned coast of salt and bells.',
  overview_exists: false,
  lore: '',
  lore_exists: false,
  locations: [{ name: 'Gullhaven', location_type: 'Town', exists: false }, { name: 'Old Pier', exists: true }],
  npcs: [{ name: 'Mira Vane', role: 'Harbour master', exists: false }],
  factions: [],
  quests: [{ title: 'The Silent Ship', hook: 'A ship with no crew.', objectives: ['Board it'], exists: false }],
};

function upload() {
  const file = new File(['docx'], 'world.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  fireEvent.change(screen.getByTestId('world-document-file'), { target: { files: [file] } });
}

describe('WorldDocumentPanel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads a document into drafts, with existing records unticked', async () => {
    apiClient.post.mockResolvedValueOnce({ data: drafts });
    render(<WorldDocumentPanel campaignId="c1" />);
    upload();
    await screen.findByTestId('world-document-review');
    expect(apiClient.post).toHaveBeenCalledWith('/campaigns/c1/world-document/read', expect.any(FormData));
    expect(screen.getByTestId('world-document-pick-locations-0')).toBeChecked();
    expect(screen.getByTestId('world-document-pick-locations-1')).not.toBeChecked();
    expect(screen.getByTestId('world-document-pick-locations-1')).toBeDisabled();
    expect(screen.getByText('Already in your campaign')).toBeInTheDocument();
    expect(screen.getByTestId('world-document-save')).toHaveTextContent('Add 4 to campaign');
  });

  it('saves only the ticked drafts and reports back', async () => {
    const onSaved = jest.fn();
    apiClient.post
      .mockResolvedValueOnce({ data: drafts })
      .mockResolvedValueOnce({ data: { created: { locations: 1, npcs: 0, quests: 1, world_text: 1 }, skipped: {} } });
    render(<WorldDocumentPanel campaignId="c1" onSaved={onSaved} />);
    upload();
    await screen.findByTestId('world-document-review');
    fireEvent.click(screen.getByTestId('world-document-pick-npcs-0'));
    fireEvent.click(screen.getByTestId('world-document-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, payload] = apiClient.post.mock.calls[1];
    expect(url).toBe('/campaigns/c1/world-document/save');
    expect(payload.locations.map((item) => item.name)).toEqual(['Gullhaven']);
    expect(payload.npcs).toEqual([]);
    expect(payload.quests.map((item) => item.title)).toEqual(['The Silent Ship']);
    expect(payload.overview).toBe(drafts.overview);
    expect(screen.queryByTestId('world-document-review')).not.toBeInTheDocument();
  });

  it('refuses a file that is not a Word document without calling the server', () => {
    render(<WorldDocumentPanel campaignId="c1" />);
    const file = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('world-document-file'), { target: { files: [file] } });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
