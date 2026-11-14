import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BetaNotice from './BetaNotice';

function show(audience) {
  return render(<MemoryRouter><BetaNotice audience={audience} /></MemoryRouter>);
}

describe('Rookie Quest Keeper public beta transparency notice', () => {
  test('public visitors can see status and must sign in before sending feedback', () => {
    show('public');
    const notice = screen.getByTestId('beta-notice-landing');
    expect(notice).toHaveAccessibleName('Beta testing notice');
    expect(notice).toHaveTextContent('EARLY ACCESS · PUBLIC BETA');
    expect(notice).toHaveTextContent(/active development and being tested during real tabletop play/i);
    expect(notice).toHaveTextContent(/occasional bugs or interruptions are possible/i);
    expect(notice).toHaveTextContent(/honest feedback, issue reports and reviews/i);
    expect(screen.getByTestId('beta-notice-feedback-login')).toHaveAttribute('href', '/auth');
    expect(screen.queryByTestId('beta-notice-feedback')).not.toBeInTheDocument();
  });

  test('signed-in members can launch the existing feedback modal from the notice', () => {
    const spy = jest.fn();
    window.addEventListener('rook-feedback-open', spy);
    show('member');
    expect(screen.getByTestId('beta-notice-home')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('beta-notice-feedback'));
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener('rook-feedback-open', spy);
    expect(screen.queryByTestId('beta-notice-feedback-login')).not.toBeInTheDocument();
  });
});
