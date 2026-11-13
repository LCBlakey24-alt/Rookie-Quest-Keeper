import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';

import HexTraitsView from './HexTraitsView';

const dwarf = {
  name: 'Brannoc', character_class: 'Fighter', level: 4, race: 'Dwarf', subrace: 'Hill Dwarf',
  languages: ['Common', 'Dwarvish'], feats: ['Alert'], background: 'Soldier',
  strength: 16, constitution: 16,
};

function show(props = {}) {
  render(<HexTraitsView character={dwarf} classFeatureSummary={[{ name: 'Second Wind', level: 1, type: 'bonus', description: 'Regain hit points as a bonus action.' }]} rulesEdition="2024" {...props} />);
}

test('the wheel has Class, Race, Feats and Background, and starts on Class', () => {
  show();
  const wheel = screen.getByRole('radiogroup', { name: /^Traits/ });
  expect(within(wheel).getAllByRole('radio').map((radio) => radio.getAttribute('aria-label'))).toEqual(['Class', 'Species', 'Feats', 'Background']);
  expect(screen.getByTestId('hex-trait-Second Wind')).toHaveTextContent('Level 1 · Bonus action');
});

test('turning to Race lists the race traits with key facts, and a trait opens to explain itself', () => {
  show();
  fireEvent.keyDown(screen.getByRole('radiogroup', { name: /^Traits/ }), { key: 'ArrowRight' });
  const facts = screen.getByTestId('hex-traits-facts');
  expect(facts).toHaveTextContent('Dwarf (Hill Dwarf)');
  expect(facts).toHaveTextContent('Darkvision60 ft');
  const resilience = screen.getByTestId('hex-trait-Dwarven Resilience');
  const name = within(resilience).getByRole('button');
  expect(name).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(name);
  expect(resilience).toHaveTextContent('advantage on saving throws against poison');
});

test('Feats explains an SRD feat; an empty section says so', () => {
  show({ character: { ...dwarf, background: '' } });
  const wheel = screen.getByRole('radiogroup', { name: /^Traits/ });
  fireEvent.keyDown(wheel, { key: 'ArrowRight' });
  fireEvent.keyDown(wheel, { key: 'ArrowRight' });
  fireEvent.click(within(screen.getByTestId('hex-trait-Alert')).getByRole('button'));
  expect(screen.getByTestId('hex-trait-Alert')).toHaveTextContent(/initiative/);
  fireEvent.keyDown(wheel, { key: 'ArrowRight' });
  expect(screen.getByTestId('hex-traits-list')).toHaveTextContent('No background saved yet.');
});

test('All details toggles the full class page', () => {
  const onMore = jest.fn();
  show({ onMore });
  fireEvent.click(screen.getByTestId('hex-traits-more'));
  expect(onMore).toHaveBeenCalled();
});
