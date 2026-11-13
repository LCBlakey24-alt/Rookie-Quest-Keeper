import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import LivePartyRow from './LivePartyRow';

const party = [
  { id: 'c1', name: 'Ash Varrin', character_class: 'Fighter', level: 5, max_hit_points: 44, current_hit_points: 40, armor_class: 18 },
  { id: 'c2', name: 'Quill', character_class: 'Rogue', level: 5, max_hit_points: 30, current_hit_points: 0, armor_class: 15 },
];

describe('LivePartyRow', () => {
  test('shows each character as a hexagon portrait with HP and AC', () => {
    render(<LivePartyRow players={party} />);
    expect(screen.getAllByTestId('display-hex-portrait')).toHaveLength(2);
    expect(screen.getByTestId('live-party-c1')).toHaveTextContent('HP 40/44');
    expect(screen.getByTestId('live-party-c1')).toHaveTextContent('AC 18');
    expect(screen.getByTestId('live-party-c2')).toHaveClass('is-down');
  });

  test('tapping a character opens the party tool', () => {
    const onOpenParty = jest.fn();
    render(<LivePartyRow players={party} onOpenParty={onOpenParty} />);
    fireEvent.click(screen.getByTestId('live-party-c1'));
    expect(onOpenParty).toHaveBeenCalled();
  });

  test('an empty party shows nothing', () => {
    const { container } = render(<LivePartyRow players={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
