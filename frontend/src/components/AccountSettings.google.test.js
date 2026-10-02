import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';

import AccountSettings from './AccountSettings';
import apiClient from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('AccountSettings Google-only password flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: {
        username: 'GoogleRook',
        email: 'rook@gmail.com',
        auth_provider: 'google',
      },
    });
    apiClient.post.mockResolvedValue({ data: { message: 'sent' } });
  });

  test('offers an email setup link instead of asking for an unknown current password', async () => {
    render(
      <MemoryRouter>
        <AccountSettings username="GoogleRook" onLogout={jest.fn()} />
      </MemoryRouter>,
    );

    const setupButton = await screen.findByTestId('google-password-setup-btn');
    expect(screen.queryByTestId('current-password')).not.toBeInTheDocument();
    expect(setupButton).toHaveTextContent('Email me a password setup link');

    fireEvent.click(setupButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'rook@gmail.com',
      });
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Password setup email sent. Check your inbox for the reset link.',
    );
  });

  test('asks for a recovery email before password setup when none is saved', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        username: 'GoogleRook',
        email: null,
        auth_provider: 'google',
      },
    });

    render(
      <MemoryRouter>
        <AccountSettings username="GoogleRook" onLogout={jest.fn()} />
      </MemoryRouter>,
    );

    const setupButton = await screen.findByTestId('google-password-setup-btn');
    expect(setupButton).toBeDisabled();
    expect(setupButton).toHaveTextContent('Add a recovery email first');
  });
});
