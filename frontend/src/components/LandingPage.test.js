import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import LandingPage, { LANDING_SECTIONS } from './LandingPage';

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}|{location.state?.from?.pathname || ''}</p>;
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('public beta notice', () => {
  test('appears on landing before the hero, with an actionable sign-in feedback link', () => {
    renderLanding();
    const beta = screen.getByTestId('beta-notice-landing');
    const hero = screen.getByRole('heading', { name: /Your campaign/ });
    expect(beta).toBeInTheDocument();
    expect(beta.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByTestId('beta-notice-feedback-login'));
    expect(screen.getByTestId('where')).toHaveTextContent('/auth|');
  });
});

describe('landing page wheel', () => {
  beforeEach(() => window.localStorage.clear());

  test('the arrows turn the wheel and the card below follows', () => {
    renderLanding();
    expect(screen.getByTestId('landing-section-characters')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('landing-wheel-next'));
    expect(screen.getByTestId('landing-section-campaigns')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('landing-wheel-prev'));
    fireEvent.click(screen.getByTestId('landing-wheel-prev'));
    expect(screen.getByTestId('landing-section-rook')).toBeInTheDocument();
  });

  test('the six sections are the parts of Keeper, with no admin', () => {
    expect(LANDING_SECTIONS.map((section) => section.label)).toEqual(['Characters', 'Campaigns', 'Live Play', 'Homebrew', 'Community', 'Rook']);
  });

  test('a section card starts sign-up headed for that part of Keeper', () => {
    renderLanding();
    fireEvent.click(screen.getByTestId('landing-wheel-next'));
    fireEvent.click(screen.getByRole('button', { name: /Start with Campaigns/ }));
    expect(screen.getByTestId('where')).toHaveTextContent('/auth?mode=register|/campaigns');
  });

  test('Show as list gives every section as a card and is remembered', () => {
    renderLanding();
    fireEvent.click(screen.getByTestId('landing-view-toggle'));
    const list = screen.getByTestId('landing-section-list');
    expect(list.querySelectorAll('.landing-section-card')).toHaveLength(6);
    expect(window.localStorage.getItem('rqk.landing.view')).toBe('list');
  });
});
