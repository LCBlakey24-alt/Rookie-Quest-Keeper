import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LegalPages from './LegalPages';

function show(kind) {
  return render(<MemoryRouter><LegalPages kind={kind} /></MemoryRouter>);
}

describe('Public legal transparency pages', () => {
  test.each([
    ['privacy', 'Privacy Notice'],
    ['terms', 'Terms of Use'],
    ['cookies', 'Cookies & Device Storage'],
  ])('%s notice is publicly readable and linked to the other legal pages', (kind, heading) => {
    show(kind);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Legal pages' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Cookies' })).toHaveAttribute('href', '/cookies');
    expect(screen.getByRole('link', { name: 'Credits & licences' })).toHaveAttribute('href', '/credits');
  });

  test('operator is never fabricated; unverified info is clearly labelled pending', () => {
    show('privacy');
    if (!process.env.REACT_APP_PUBLIC_LEGAL_OPERATOR || !process.env.REACT_APP_PUBLIC_LEGAL_CONTACT) {
      expect(screen.getByText('Publication review required')).toBeInTheDocument();
    }
    expect(screen.getByText(/verified operator contact/i)).toBeInTheDocument();
  });

  test('privacy notice covers AI processors, retention and account rights', () => {
    show('privacy');
    expect(screen.getByRole('heading', { name: 'Service providers and international transfers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Retention and account deletion' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your privacy rights' })).toBeInTheDocument();
  });
});
