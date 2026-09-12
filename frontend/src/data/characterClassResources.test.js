import { mergeCharacterClassResources } from './characterClassResources';

describe('character class resources', () => {
  test('spent Ki stays spent while a new level adds one usable point', () => {
    const resources = mergeCharacterClassResources({
      level: 2,
      edition: '2014',
      resources: {
        ki: { label: 'Ki', current: 0, remaining: 0, max: 2, restore: 'short-rest' },
      },
    }, { Monk: 3 });

    expect(resources.ki).toMatchObject({ max: 3, current: 1, remaining: 1 });
  });

  test('new Action Surge starts available but spent Second Wind does not refill', () => {
    const resources = mergeCharacterClassResources({
      level: 1,
      edition: '2014',
      resources: {
        second_wind: { current: 0, remaining: 0, max: 1, restore: 'short-rest' },
      },
    }, { Fighter: 2 });

    expect(resources.second_wind).toMatchObject({ max: 1, current: 0, remaining: 0 });
    expect(resources.action_surge).toMatchObject({ max: 1, current: 1, remaining: 1 });
  });

  test('sorcery point growth only grants newly added capacity', () => {
    const resources = mergeCharacterClassResources({
      level: 2,
      edition: '2014',
      resources: {
        sorcery_points: { current: 1, remaining: 1, max: 2 },
      },
    }, { Sorcerer: 3 });

    expect(resources.sorcery_points).toMatchObject({ max: 3, current: 2, remaining: 2 });
  });

  test('homebrew counters are preserved while core trackers are added', () => {
    const scarab = {
      label: 'Scarab Charges',
      current: 3,
      remaining: 3,
      max: 8,
      restore: 'long-rest',
      custom_note: 'Akara',
    };
    const resources = mergeCharacterClassResources({
      level: 8,
      edition: '2014',
      resources: { scarab_charges: scarab },
    }, { Warlock: 8 });

    expect(resources.scarab_charges).toEqual(scarab);
    expect(resources.pact_magic).toMatchObject({ max: 2, slot_level: 4, current: 2 });
  });

  test('missing trackers can remain absent for migration-safe calls', () => {
    expect(mergeCharacterClassResources(
      { level: 3, edition: '2014', resources: {} },
      { Fighter: 3 },
      { initialiseMissing: false },
    )).toEqual({});
  });
});
