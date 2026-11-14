import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import CampaignWorkbookImportDialog from './CampaignWorkbookImportDialog';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('CampaignWorkbookImportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.post.mockImplementation((url) => {
      if (url === '/campaign-workbook/preview') {
        return Promise.resolve({
          data: {
            format: 'RQK-WORKBOOK-V1', counts: { NPC: 1 },
            total_records: 1, target: 'existing', warnings: [],
          },
        });
      }
      if (url === '/campaign-workbook/import') {
        return Promise.resolve({ data: { campaign_id: 'camp-123', created_campaign: false, created: { NPC: 1 } } });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  const uploadFile = () => new File(
    ['fake docx contents'],
    'World.docx',
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  );

  test('offers new or existing campaign destination, reviews then imports', async () => {
    const onImported = jest.fn();
    render(<CampaignWorkbookImportDialog
      campaigns={[{ id: 'camp-123', name: 'The Sky Roads' }]}
      onImported={onImported}
      onClose={jest.fn()}
    />);
    const destination = screen.getByLabelText('Import destination');
    fireEvent.change(destination, { target: { value: 'camp-123' } });
    fireEvent.change(screen.getByLabelText('Completed .docx workbook'), { target: { files: [uploadFile()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview contents' }));
    expect(await screen.findByText('1 sections found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(
      expect.objectContaining({ campaign_id: 'camp-123' }),
    ));
    expect(apiClient.post.mock.calls[0][0]).toBe('/campaign-workbook/preview');
    expect(apiClient.post.mock.calls[1][0]).toBe('/campaign-workbook/import');
    expect(apiClient.post.mock.calls[0][1].get('campaign_id')).toBe('camp-123');
  });

  test('changing destination invalidates the approved preview', async () => {
    render(<CampaignWorkbookImportDialog
      campaigns={[{ id: 'camp-123', name: 'The Sky Roads' }]}
      onClose={jest.fn()}
    />);
    fireEvent.change(screen.getByLabelText('Completed .docx workbook'), { target: { files: [uploadFile()] } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview contents' }));
    expect(await screen.findByText('1 sections found')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Import destination'), { target: { value: 'camp-123' } });
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument();
  });

  test('rejects the wrong extension before making any requests', () => {
    render(<CampaignWorkbookImportDialog campaigns={[]} onClose={jest.fn()} />);
    const bad = new File(['bad'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Completed .docx workbook'), { target: { files: [bad] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/\.docx workbook/);
    expect(screen.getByRole('button', { name: 'Preview contents' })).toBeDisabled();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
