import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthPage onLogin={jest.fn()} />
    </MemoryRouter>
  );
}

describe('AuthPage', () => {
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
});
