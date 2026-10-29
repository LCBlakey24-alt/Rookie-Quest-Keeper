import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CleanSheetTabs from './CleanSheetTabs';

function renderTabs(initialEntry, onBack = jest.fn()) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/characters/:characterId"
          element={<CleanSheetTabs tabs={[]} activeTab="stats" onSelectTab={() => {}} onBack={onBack} />}
        />
        <Route path="/player/campaign/:campaignId" element={<div>Campaign return target</div>} />
        <Route path="/player" element={<div>Player home return target</div>} />
        <Route path="/characters" element={<div>Characters library return target</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return onBack;
}

describe('CleanSheetTabs player return context', () => {
  test('returns to the player campaign that opened the sheet', () => {
    const onBack = renderTabs({
      pathname: '/characters/hero-1',
      state: { playerReturnTo: '/player/campaign/campaign-a' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to campaign' }));

    expect(screen.getByText('Campaign return target')).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });

  test('returns to player home when opened from the player dashboard', () => {
    renderTabs({
      pathname: '/characters/hero-1',
      state: { playerReturnTo: '/player' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to player home' }));

    expect(screen.getByText('Player home return target')).toBeInTheDocument();
  });

  test('returns to the characters library when a sheet is opened from My Characters', () => {
    const onBack = renderTabs({
      pathname: '/characters/hero-1',
      state: { playerReturnTo: '/characters' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to characters' }));
    expect(screen.getByText('Characters library return target')).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
  });

  test('ignores unsafe return state and keeps the existing fallback callback', () => {
    const onBack = renderTabs({
      pathname: '/characters/hero-1',
      state: { playerReturnTo: 'https://example.com/phish' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});


describe('selected character sheet navigation', () => {
  test('marks only the current tab as selected for screen readers', () => {
    render(
      <MemoryRouter>
        <CleanSheetTabs
          tabs={[
            { id: 'stats', label: 'Stats', icon: () => null },
            { id: 'combat', label: 'Actions', icon: () => null },
          ]}
          activeTab="combat"
          onSelectTab={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Stats' })).not.toHaveAttribute('aria-current');
  });
});
