import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import CleanSheetResourceRail from './CleanSheetResourceRail';

describe('CleanSheetResourceRail', () => {
  test('shows a Monk resource near the top of the sheet and spends the same saved tracker', async () => {
    const onCharacterUpdate = jest.fn().mockResolvedValue(true);
    const character = {
      id: 'monk-1',
      name: 'Kara',
      character_class: 'Monk',
      level: 5,
      rules_edition: '2014',
      resources: {
        ki: {
          label: 'Ki',
          className: 'Monk',
          current: 3,
          remaining: 3,
          max: 5,
          restore: 'short-rest',
        },
      },
    };

    render(<CleanSheetResourceRail character={character} onCharacterUpdate={onCharacterUpdate} />);

    expect(screen.getByTestId('player-resource-rail')).toBeInTheDocument();
    expect(screen.getByText('Ki')).toBeInTheDocument();
    expect(screen.getByLabelText('Ki: 3 of 5 remaining')).toBeInTheDocument();
    expect(screen.getByText(/Short Rest/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Spend one Ki' }));

    expect(onCharacterUpdate).toHaveBeenCalledWith({
      resources: {
        ki: {
          label: 'Ki',
          className: 'Monk',
          current: 2,
          remaining: 2,
          max: 5,
          restore: 'short-rest',
        },
      },
    }, { error: 'Could not update Ki' });
  });

  test('keeps Pact Magic out of the generic rail because spell pools belong in Spells', () => {
    const character = {
      id: 'warlock-1',
      name: 'Hex',
      character_class: 'Warlock',
      level: 5,
      rules_edition: '2014',
      resources: {
        pact_magic: {
          label: 'Pact Magic',
          className: 'Warlock',
          current: 2,
          remaining: 2,
          max: 2,
          slot_level: 3,
          restore: 'short-rest',
        },
      },
    };

    const { container } = render(<CleanSheetResourceRail character={character} onCharacterUpdate={jest.fn()} />);

    expect(container.querySelector('[data-testid="player-resource-rail"]')).toBeNull();
  });

  test('does not add an empty rail to characters with no limited-use resources', () => {
    const { container } = render(
      <CleanSheetResourceRail
        character={{ id: 'rogue-1', character_class: 'Rogue', level: 1, rules_edition: '2014' }}
        onCharacterUpdate={jest.fn()}
      />,
    );

    expect(container.querySelector('[data-testid="player-resource-rail"]')).toBeNull();
  });
});
