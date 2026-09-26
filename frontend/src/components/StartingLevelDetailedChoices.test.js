import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { AsiChoiceRow } from './StartingLevelDetailedChoices';

describe('starting-level feat ability choices', () => {
  test('shows and records an explicit ability choice for a choice-shaped homebrew feat', () => {
    const onChange = jest.fn();
    const abilityIncrease = { choose: 1, from: ['strength', 'dexterity'], amount: 1 };

    render(
      <AsiChoiceRow
        choice={{ id: 'asi-4', level: 4, label: 'Level 4 ASI / feat' }}
        selection={{
          mode: 'feat',
          featName: 'Flexible Athlete',
          featAbilityScoreIncrease: abilityIncrease,
          featAbilityChoices: [],
        }}
        featOptions={[{
          name: 'Flexible Athlete',
          description: 'Choose Strength or Dexterity.',
          ability_score_increase: abilityIncrease,
        }]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Feat ability increase (+1)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('DEX').closest('button'));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: 'feat',
      featName: 'Flexible Athlete',
      featAbilityChoices: ['dexterity'],
      featAbilityScoreIncrease: abilityIncrease,
    }));
  });

  test('explains fixed feat ability increases without asking for an extra choice', () => {
    render(
      <AsiChoiceRow
        choice={{ id: 'asi-4', level: 4, label: 'Level 4 ASI / feat' }}
        selection={{ mode: 'feat', featName: 'Mighty Mind' }}
        featOptions={[{
          name: 'Mighty Mind',
          ability_score_increase: { strength: 1, intelligence: 1 },
        }]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText(/STR \+1.*INT \+1.*automatically/i)).toBeInTheDocument();
    expect(screen.queryByText(/Feat ability increase \(\+1\)/i)).not.toBeInTheDocument();
  });
});
