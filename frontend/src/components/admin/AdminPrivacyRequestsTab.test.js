import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import AdminPrivacyRequestsTab from './AdminPrivacyRequestsTab';

jest.mock('@/lib/apiClient', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const fixture = {
  id: 'privacy-1',
  username: 'TableMember',
  request_type: 'access',
  details: 'Please let me know what you hold.',
  status: 'received',
  created_at: '2026-11-14T12:00:00Z',
  admin_notes: '',
  public_note: '',
};

describe('Admin privacy rights queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [fixture] });
  });

  test('admin sees request and can record private notes and a public update', async () => {
    apiClient.patch.mockResolvedValue({ data: {
      ...fixture, status: 'in_review', admin_notes: 'Internal note',
      public_note: 'Request is being reviewed.',
    } });
    render(<AdminPrivacyRequestsTab />);
    expect(await screen.findByText(/access — TableMember/)).toBeInTheDocument();
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'in_review' } });
    fireEvent.change(screen.getByLabelText(/Internal operator notes/i), { target: { value: 'Internal note' } });
    fireEvent.change(screen.getByLabelText(/Message visible to this requester/i), { target: { value: 'Request is being reviewed.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save review status/i }));
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/admin/privacy/requests/privacy-1', {
      status: 'in_review',
      admin_notes: 'Internal note',
      public_note: 'Request is being reviewed.',
    }));
    expect(toast.success).toHaveBeenCalledWith('Request status saved.');
  });

  test('error when protected queue is unavailable is visible', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('forbidden'));
    render(<AdminPrivacyRequestsTab />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to read the protected privacy request queue/i);
  });
});
