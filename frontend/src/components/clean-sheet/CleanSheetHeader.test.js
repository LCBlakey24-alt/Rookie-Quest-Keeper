import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CleanSheetHeader, { compactSubtitleParts } from './CleanSheetHeader';

describe('CleanSheetHeader subtitle formatting', () => {
  test('uses the supplied multiclass progression instead of collapsing to the primary class', () => {
    expect(compactSubtitleParts(
      {
        race: 'human',
        character_class: 'Fighter',
        subclass: 'Champion',
        level: 5,
      },
      'Human • Fighter 3 (Champion) / Wizard 2 (Evocation) • Lv 5'
    )).toEqual([
      'Human',
      'Fighter 3 (Champion) / Wizard 2 (Evocation)',
    ]);
  });

  test('keeps subrace and multiclass progression while removing duplicate level copy', () => {
    expect(compactSubtitleParts(
      {
        race: 'elf',
        character_class: 'Fighter',
        level: 5,
      },
      'Elf • (High Elf) • Fighter 3 / Wizard 2 • Lv 5'
    )).toEqual([
      'Elf',
      '(High Elf)',
      'Fighter 3 / Wizard 2',
    ]);
  });

  test('falls back to direct character fields when no supplied subtitle exists', () => {
    expect(compactSubtitleParts({
      race: 'human',
      character_class: 'rogue',
      subclass: 'thief',
    }, '')).toEqual(['Human', 'Rogue', 'Thief']);
  });
});

test('mobile header keeps real character name, options and edit action available', () => {
  const onEdit = jest.fn();
  render(<CleanSheetHeader
    character={{ name: 'Rina Ironstride', level: 5, character_class: 'Fighter', race: 'Goliath' }}
    onEdit={onEdit}
    onLevelUp={jest.fn()}
  />);
  const title = screen.getByRole('heading', { name: 'Rina Ironstride', level: 1 });
  expect(title.querySelector('.rqk-cc-hero-name')).toHaveTextContent('Rina Ironstride');
  fireEvent.click(screen.getByRole('button', { name: 'Character options' }));
  fireEvent.click(screen.getByRole('menuitem', { name: /Edit Character/ }));
  expect(onEdit).toHaveBeenCalledTimes(1);
});
