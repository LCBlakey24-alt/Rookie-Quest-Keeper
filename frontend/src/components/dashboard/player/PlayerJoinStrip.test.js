import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerJoinStrip from './PlayerJoinStrip';

describe('PlayerJoinStrip', () => {
  test('shows character name, level and class in the join selector', () => {
    render(
      <PlayerJoinStrip
        characters={[
          { id: 'c1', name: 'Javen', level: 8, character_class: 'Warlock' },
          { id: 'c2', name: 'Mira', level: 3, class: 'Rogue' },
        ]}
        selectedCharacterId="c1"
        onSelectedCharacterChange={jest.fn()}
        onJoinCampaign={jest.fn()}
      />,
    );

    expect(screen.getByRole('option', { name: 'Javen — Lv 8 Warlock' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mira — Lv 3 Rogue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enter Join Code/i })).toBeInTheDocument();
  });
});
