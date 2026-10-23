import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LiveSessionWithSecondScreenPage from './LiveSessionWithSecondScreenPage';

jest.mock('@/components/gm/LiveSessionGridPage', () => () => <main>Live GM tools</main>);
jest.mock('@/components/gm/LiveSecondScreenDock', () => ({ campaignId }) => (
  <section data-testid="mock-live-display">Campaign {campaignId}</section>
));

function renderLive() {
  return render(
    <MemoryRouter initialEntries={['/campaign/test-campaign/live']}>
      <Routes>
        <Route path="/campaign/:campaignId/live" element={<LiveSessionWithSecondScreenPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('responsive Live Play display controls', () => {
  test('keeps GM content accessible and exposes a labelled display toggle', () => {
    renderLive();
    expect(screen.getByText('Live GM tools')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Display controls' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'live-second-screen-panel');
    expect(screen.getByLabelText('Live display controls')).not.toHaveClass('is-open');
  });

  test('opens display drawer, focuses close action and restores focus on Escape', () => {
    renderLive();
    const toggle = screen.getByRole('button', { name: 'Display controls' });
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Live display controls')).toHaveClass('is-open');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const close = document.querySelector('.live-display-drawer-close');
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByLabelText('Live display controls')).not.toHaveClass('is-open');
    expect(toggle).toHaveFocus();
  });

  test('closes using the explicit drawer close control', () => {
    renderLive();
    fireEvent.click(screen.getByRole('button', { name: 'Display controls' }));
    fireEvent.click(document.querySelector('.live-display-drawer-close'));
    expect(screen.getByLabelText('Live display controls')).not.toHaveClass('is-open');
    expect(screen.getByRole('button', { name: 'Display controls' })).toHaveFocus();
  });
});
