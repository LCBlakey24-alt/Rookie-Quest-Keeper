import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import HomebrewItemBuilder from './HomebrewItemBuilder';
import { emptyItemDraft } from '@/data/homebrewItemModel';

function Harness({ start = emptyItemDraft('weapon'), onDraft = () => {} }) {
  const [draft, setDraft] = useState(start);
  return <HomebrewItemBuilder draft={draft} onChange={next => { setDraft(next); onDraft(next); }} />;
}

test('a weapon shows its to-hit and damage on the sheet preview as you build it', () => {
  render(<Harness />);
  fireEvent.change(screen.getByTestId('hb-item-name'), { target: { value: 'Synthetic Emberblade' } });
  const preview = screen.getByTestId('hb-item-preview');
  expect(within(preview).getByText('Synthetic Emberblade')).toBeInTheDocument();
  expect(screen.getByTestId('hb-item-tohit')).toHaveTextContent('+5');
  expect(screen.getByTestId('hb-item-damage')).toHaveTextContent('1d8+3 slashing');

  fireEvent.click(screen.getByRole('button', { name: 'Raise Magic bonus' }));
  fireEvent.click(screen.getByTestId('hb-item-add-extra'));
  expect(screen.getByTestId('hb-item-tohit')).toHaveTextContent('+6');
  expect(screen.getByTestId('hb-item-damage')).toHaveTextContent('1d8+4 slashing + 1d6 fire');
});

test('roll buttons really roll and show the dice', () => {
  render(<Harness />);
  fireEvent.click(screen.getByTestId('hb-item-roll-damage'));
  const result = screen.getByTestId('hb-item-roll-result');
  const total = Number(within(result).getByText(/^\d+$/).textContent);
  expect(total).toBeGreaterThanOrEqual(4); // 1d8+3
  expect(total).toBeLessThanOrEqual(11);
  expect(result).toHaveTextContent('1d8+3 →');
});

test('armour shows the AC it gives', () => {
  render(<Harness />);
  fireEvent.click(screen.getByTestId('hb-item-kind-armour'));
  fireEvent.click(screen.getByTestId('hb-item-armour-heavy'));
  expect(screen.getByTestId('hb-item-ac')).toHaveTextContent('16');
});

test('resistances and immunities appear as sheet effects, and saved drafts keep them', () => {
  const seen = [];
  render(<Harness start={emptyItemDraft('wearable')} onDraft={d => seen.push(d)} />);
  fireEvent.click(within(screen.getByTestId('hb-item-resist')).getByRole('button', { name: 'Fire' }));
  fireEvent.click(within(screen.getByTestId('hb-item-immune')).getByRole('button', { name: 'Poison' }));
  const effects = screen.getByTestId('hb-item-effects');
  expect(effects).toHaveTextContent('Resistant to fire damage');
  expect(effects).toHaveTextContent('Immune to poison damage');
  expect(seen.at(-1).defences).toMatchObject({ resistances: ['fire'], immunities: ['poison'] });
});

test('confusing combinations get a plain warning', () => {
  render(<Harness />);
  const props = screen.getByTestId('hb-item-properties');
  fireEvent.click(within(props).getByRole('button', { name: 'Two-handed' }));
  fireEvent.click(within(props).getByRole('button', { name: 'Versatile' }));
  expect(screen.getByText(/Two-handed and versatile do not go together/)).toBeInTheDocument();
});
