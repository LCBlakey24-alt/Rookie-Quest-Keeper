import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PlayerCharactersPanel from './PlayerCharactersPanel';
import PlayerDashboardContext from './PlayerDashboardContext';

const noop = () => {};

describe('player dashboard experience', () => {
  test('offers both create and import when the player has no characters', () => {
    const onCreateCharacter = jest.fn();
    const onImportCharacter = jest.fn();

    render(
      <PlayerCharactersPanel
        characters={[]}
        onCreateCharacter={onCreateCharacter}
        onImportCharacter={onImportCharacter}
        onOpenCharacter={noop}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create Character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import Character' }));

    expect(onCreateCharacter).toHaveBeenCalledTimes(1);
    expect(onImportCharacter).toHaveBeenCalledTimes(1);
  });

  test('shows saved character vitals without inventing missing values', () => {
    render(
      <PlayerCharactersPanel
        characters={[{
          id: 'hero-1',
          name: 'Rook',
          level: 4,
          race: 'Human',
          character_class: 'Fighter',
          current_hit_points: 0,
          max_hit_points: 20,
          armor_class: 16,
        }]}
        onCreateCharacter={noop}
        onImportCharacter={noop}
        onOpenCharacter={noop}
      />,
    );

    expect(screen.getByText('HP 0 / 20')).toBeInTheDocument();
    expect(screen.getByText('AC 16')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Character/i })).toBeInTheDocument();
  });

  test('uses player-facing guidance for each dashboard section', () => {
    const summaryCards = [];
    const { rerender } = render(<PlayerDashboardContext activeLabel="Characters" summaryCards={summaryCards} />);
    expect(screen.getByText(/Open a sheet to play/i)).toBeInTheDocument();

    rerender(<PlayerDashboardContext activeLabel="Received (2)" summaryCards={summaryCards} />);
    expect(screen.getByText(/Everything your GM has shared with you/i)).toBeInTheDocument();
  });
});
