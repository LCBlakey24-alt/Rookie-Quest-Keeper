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
    expect(screen.getByText(/Legal operator identification and a working contact route/i)).toBeInTheDocument();
  });

  test('describes the current free, unincorporated beta without inventing a company', () => {
    show('terms');
    expect(screen.getByText(/currently a free public beta/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free beta and any future paid features' })).toBeInTheDocument();
    expect(screen.getByText(/There are no Keeper subscription fees or paid account plans at present/i)).toBeInTheDocument();
    expect(screen.getByText(/Users will not be charged merely because the free beta is updated/i)).toBeInTheDocument();
  });

  test('privacy notice does not claim Keeper is an incorporated company', () => {
    show('privacy');
    expect(screen.getByText(/independently operated, unincorporated project/i)).toBeInTheDocument();
    expect(screen.getByText(/payment details are not required for a Keeper account/i)).toBeInTheDocument();
    expect(screen.getByText(/individual responsible for the service must be identified/i)).toBeInTheDocument();
  });

  test('privacy notice covers AI processors, retention and account rights', () => {
    show('privacy');
    expect(screen.getByRole('heading', { name: 'Service providers and international transfers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Retention and account deletion' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your privacy rights' })).toBeInTheDocument();
  });
});
