import React from 'react';
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CompactCommandOverview from './CompactCommandOverview';

const character = {
  id: 'hero-1',
  name: 'Rina Ironstride',
  level: 5,
  character_class: 'Fighter',
  strength: 18,
  dexterity: 14,
  constitution: 16,
  intelligence: 10,
  wisdom: 12,
  charisma: 8,
  equipped: { mainHand: { name: 'Longsword', type: 'weapon', damage: '1d8' } },
  inventory: [{ name: 'Healing Potion', quantity: 2 }],
  resources: { second_wind: { label: 'Second Wind', current: 1, max: 2, restore: 'short-rest' } },
};

test('Compact Command reads saved ability values and uses the existing dice callback', () => {
  const onRoll = jest.fn();
  render(<CompactCommandOverview character={character} proficiencyBonus={3} onRoll={onRoll} onCharacterUpdate={jest.fn()} onOpenTab={jest.fn()} />);
  expect(screen.getByTestId('mobile-compact-command')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Roll Strength check, +4 modifier' }));
  expect(onRoll).toHaveBeenCalledWith('Strength Check', 4);
  expect(screen.getByRole('button', { name: 'Roll Charisma check, -1 modifier' })).toHaveTextContent('Score 8');
});

test('Attack and inventory shortcuts open the real sheet panels rather than faking rolls or use', () => {
  const onOpenTab = jest.fn();
  render(<CompactCommandOverview character={character} proficiencyBonus={3} onRoll={jest.fn()} onCharacterUpdate={jest.fn()} onOpenTab={onOpenTab} />);
  expect(screen.getByText('Longsword')).toBeInTheDocument();
  expect(screen.getByText('Healing Potion')).toBeInTheDocument();
  expect(screen.getByText('× 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Longsword/i }));
  expect(onOpenTab).toHaveBeenCalledWith('combat');
  fireEvent.click(screen.getByRole('button', { name: /Healing Potion/i }));
  expect(onOpenTab).toHaveBeenCalledWith('inventory');
  fireEvent.click(screen.getByRole('button', { name: /Full stats, skills and saves/i }));
  expect(onOpenTab).toHaveBeenCalledWith('full-stats');
  const resources = screen.getByRole('region', { name: 'Limited-use resources' });
  expect(within(resources).getByText('Second Wind')).toBeInTheDocument();
});

test('Incomplete characters display truthful empty states instead of made-up attacks or items', () => {
  render(<CompactCommandOverview character={{ id: 'new-hero', name: 'New Hero' }} proficiencyBonus={2} onRoll={jest.fn()} onCharacterUpdate={jest.fn()} onOpenTab={jest.fn()} />);
  expect(screen.getByText(/No equipped weapons yet/)).toBeInTheDocument();
  expect(screen.getByText(/No items saved yet/)).toBeInTheDocument();
  expect(screen.getByText(/No limited-use resources/)).toBeInTheDocument();
});

test('Compact Command renders white-gradient heading targets around real resource and inventory data', () => {
  render(<CompactCommandOverview character={character} proficiencyBonus={3} onRoll={jest.fn()} onCharacterUpdate={jest.fn()} onOpenTab={jest.fn()} />);
  ['Abilities', 'Attacks', 'Resources', 'Inventory'].forEach(label => {
    const title = screen.getByRole('heading', { name: label, level: 2 });
    expect(title).toHaveClass('rqk-cc-title');
    expect(within(title).getByText(label)).toBeInTheDocument();
  });

  const css = fs.readFileSync(path.join(__dirname, 'CompactCommandMobile.css'), 'utf8');
  expect(css).toContain('@media (max-width: 719px)');
  expect(css).toContain('padding: 4px !important;');
  expect(css).toContain('--rq-cc-title-gradient: linear-gradient(');
  expect(css).toContain('clip-path: polygon(');
  expect(css).toContain('color: #fff !important;');
  expect(css).toContain('font-family: var(--rq-body-font, Manrope, Inter, system-ui, sans-serif)');
  expect(css).toContain('var(--rq-citrus-yellow, #F2C94C) 28%');
  expect(css).toContain('var(--rq-citrus-blood, #CE393A) 72%');
  expect(css).toContain('display: none !important; /* no extra heading on tablet or desktop */');
  expect(css).toContain('.clean-sheet-header .clean-sheet-hero-options-toggle');
  expect(css).toContain('.clean-sheet-rest-menu-wrap');
});
