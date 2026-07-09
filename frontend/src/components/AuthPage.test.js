import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import AuthPage from './AuthPage';

jest.mock('@/lib/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function renderAuthPage(initialPath = '/auth') {
  const onLogin = jest.fn();
  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthPage onLogin={onLogin} />
    </MemoryRouter>
  );

  return { ...view, onLogin };
}

describe('AuthPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the login gateway with accessible tabs and fields', () => {
    renderAuthPage();

    expect(screen.getByTestId('auth-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome back, adventurer/i })).toBeInTheDocument();

    const signInTab = screen.getByRole('tab', { name: /sign in/i });
    const createAccountTab = screen.getByRole('tab', { name: /create account/i });

    expect(signInTab).toHaveAttribute('aria-selected', 'true');
    expect(createAccountTab).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('login-username')).toHaveAttribute('enterKeyHint', 'next');
    expect(screen.getByTestId('login-password')).toHaveAttribute('enterKeyHint', 'go');
  });

  test('switches to registration and exposes password guidance', () => {
    renderAuthPage();

    fireEvent.click(screen.getByRole('tab', { name: /create account/i }));

    expect(screen.getByRole('heading', { name: /create your keeper account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeRequired();
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('minLength', '8');
    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm your password to catch typos/i)).toBeInTheDocument();
  });

  test('toggles password visibility without leaving the login flow', () => {
    renderAuthPage();

    const passwordInput = screen.getByTestId('login-password');
    const revealButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(revealButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(revealButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: /welcome back, adventurer/i })).toBeInTheDocument();
  });

  test('opens the forgot password flow from the URL mode', () => {
    renderAuthPage('/auth?mode=forgot');

    expect(screen.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/recovery email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/recovery email/i)).toHaveAttribute('enterKeyHint', 'send');
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  test('opens the reset password flow when a token is present', () => {
    renderAuthPage('/auth?token=abc123');

    expect(screen.getByRole('heading', { name: /choose a new password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute('minLength', '8');
    expect(screen.getByLabelText(/new password/i)).toHaveAttribute('enterKeyHint', 'done');
    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
  });

  test('shows validation feedback before login submission', () => {
    renderAuthPage();

    fireEvent.click(screen.getByTestId('login-btn'));

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Please fill in all fields');
  });

  test('submits login credentials and reports the authenticated user', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { token: 'keeper-token', username: 'Rook' } });
    const { onLogin } = renderAuthPage();

    fireEvent.change(screen.getByTestId('login-username'), { target: { value: ' player@example.com ' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret-table-key' } });
    fireEvent.click(screen.getByTestId('login-btn'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'player@example.com',
        email: 'player@example.com',
        password: 'secret-table-key',
      });
    });

    expect(toast.success).toHaveBeenCalledWith('Welcome back!');
    expect(onLogin).toHaveBeenCalledWith('keeper-token', 'Rook');
  });
});
