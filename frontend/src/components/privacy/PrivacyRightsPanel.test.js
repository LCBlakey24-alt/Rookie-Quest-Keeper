import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import PrivacyRightsPanel from './PrivacyRightsPanel';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('Account-owned privacy rights requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
  });

  test('requests have an explicit action type and are acknowledged, not called completed', async () => {
    apiClient.post.mockResolvedValue({
      data: { request: {
        id: 'request-1', request_type: 'access', details: '',
        status: 'received', created_at: '2026-11-14T12:00:00Z',
      } },
    });
    render(<PrivacyRightsPanel username="Owner" />);
    expect(await screen.findByTestId('privacy-rights-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('privacy-rights-submit'));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/privacy/requests', {
      request_type: 'access', details: '',
    }));
    expect(await screen.findByText('Received')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Your privacy request was received for review.');
    expect(screen.getByText(/submitting one does not automatically change or delete/i)).toBeInTheDocument();
  });

  test('displays only the request list returned by the authenticated API', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [{
      id: 'this-users-request', request_type: 'correction',
      status: 'needs_information', details: 'Correct the account record',
      public_note: 'Please check your recovery email.',
      created_at: '2026-11-14T12:00:00Z',
    }] });
    render(<PrivacyRightsPanel username="Owner" />);
    await waitFor(() => expect(screen.getByText('More information needed')).toBeInTheDocument());
    expect(screen.getByText(/Operator update: Please check your recovery email/)).toBeInTheDocument();
    expect(screen.queryByText(/admin notes/i)).not.toBeInTheDocument();
  });

  test('shows fetch errors instead of a misleading empty history', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('offline'));
    render(<PrivacyRightsPanel username="Owner" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load your private requests/i);
    expect(screen.queryByText(/No privacy requests have been submitted/)).not.toBeInTheDocument();
  });

  test('errors during submission do not claim the request was received', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('service unavailable'));
    render(<PrivacyRightsPanel username="Owner" />);
    fireEvent.click(screen.getByTestId('privacy-rights-submit'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
});
