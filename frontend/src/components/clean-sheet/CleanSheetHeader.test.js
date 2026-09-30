import { compactSubtitleParts } from './CleanSheetHeader';

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
