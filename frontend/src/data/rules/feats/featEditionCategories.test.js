import { FEATS, featCategoryForEdition, featDescriptionForEdition, getFeatsByEdition } from '../../levelUpData';
import { FEAT_REGISTRY, canonicalFeatId, getFeatById, getFeatsForRuleset } from './featRegistry';

// The ten Origin feats in the 2024 rules. In 2014 these are ordinary feats
// (or, for Crafter and Musician, do not exist at all).
const ORIGIN_FEATS_2024 = [
  'Alert',
  'Crafter',
  'Healer',
  'Lucky',
  'Magic Initiate',
  'Musician',
  'Savage Attacker',
  'Skilled',
  'Tavern Brawler',
  'Tough',
];

// Origin feats that are General feats in 2014. 2014 has no Origin category,
// so these are the entries a single `category` value could not describe.
const GENERAL_IN_2014 = [
  'Alert',
  'Healer',
  'Lucky',
  'Magic Initiate',
  'Savage Attacker',
  'Skilled',
  'Tavern Brawler',
  'Tough',
];

const names = (feats) => feats.map((feat) => feat.name);

describe('feat categories are resolved per edition', () => {
  test('2014 offers the cross-edition feats as General feats', () => {
    // Magic Initiate, Skilled, Tavern Brawler and Tough were tagged
    // category: 'origin' for both editions, so a 2014 character asking for
    // General feats was never offered them at all.
    const general2014 = names(getFeatsByEdition('2014', 'general'));
    GENERAL_IN_2014.forEach((feat) => {
      expect(general2014).toContain(feat);
    });
  });

  test('2014 has no Origin feats, because that category does not exist in 2014', () => {
    expect(getFeatsByEdition('2014', 'origin')).toEqual([]);
  });

  test('2024 does not offer Origin feats as General feats', () => {
    // At a 2024 ASI level only General feats are legal, so an Origin feat
    // appearing in this list is an illegal choice presented to the player.
    const general2024 = names(getFeatsByEdition('2024', 'general'));
    ORIGIN_FEATS_2024.forEach((feat) => {
      expect(general2024).not.toContain(feat);
    });
  });

  test('2024 offers exactly the ten Origin feats', () => {
    expect(names(getFeatsByEdition('2024', 'origin')).sort()).toEqual(
      [...ORIGIN_FEATS_2024].sort(),
    );
  });

  test('a feat appears in exactly one category per edition', () => {
    ['2014', '2024'].forEach((edition) => {
      const seen = new Map();
      ['origin', 'general', 'epic'].forEach((category) => {
        getFeatsByEdition(edition, category).forEach((feat) => {
          expect(seen.has(feat.name)).toBe(false);
          seen.set(feat.name, category);
        });
      });
      // Every feat legal in the edition is reachable through some category.
      expect(seen.size).toBe(getFeatsByEdition(edition).length);
    });
  });
});

describe('edition-specific wording', () => {
  test('the 2024 rewrite of a reworked feat is used for 2024', () => {
    const lucky2024 = getFeatsForRuleset({ edition: '2024', category: 'origin' })
      .find((feat) => feat.name === 'Lucky');
    const lucky2014 = getFeatsForRuleset({ edition: '2014', category: 'general' })
      .find((feat) => feat.name === 'Lucky');

    expect(lucky2024.description).toMatch(/PB-many luck points/);
    expect(lucky2014.description).toMatch(/3 luck points/);
    expect(lucky2024.description).not.toEqual(lucky2014.description);
  });

  test('a feat with one wording returns it for both editions', () => {
    const tough = FEATS.find((feat) => feat.name === 'Tough');
    expect(featDescriptionForEdition(tough, '2014')).toEqual(tough.description);
    expect(featDescriptionForEdition(tough, '2024')).toEqual(tough.description);
  });

  test('getFeatsForRuleset reports the edition category, not the base one', () => {
    const tough2024 = getFeatsForRuleset({ edition: '2024', category: 'origin' })
      .find((feat) => feat.name === 'Tough');
    const tough2014 = getFeatsForRuleset({ edition: '2014', category: 'general' })
      .find((feat) => feat.name === 'Tough');

    expect(tough2024.category).toBe('origin');
    expect(tough2014.category).toBe('general');
  });
});

describe('no duplicate or suffixed feat entries remain', () => {
  test('no feat is presented to players with an "(Origin)" suffix', () => {
    // These were duplicate entries whose names would be written into a saved
    // character sheet verbatim.
    ['2014', '2024'].forEach((edition) => {
      names(getFeatsByEdition(edition)).forEach((name) => {
        expect(name).not.toMatch(/\(Origin\)/);
      });
    });
  });

  test('each feat name appears once in the source list', () => {
    const seen = FEATS.map((feat) => feat.name);
    expect(new Set(seen).size).toBe(seen.length);
  });

  test('a 2024 player is never shown the same feat twice', () => {
    const shown = names(getFeatsForRuleset({ edition: '2024' }));
    expect(new Set(shown).size).toBe(shown.length);
  });
});

describe('characters saved under the old feat names still resolve', () => {
  test.each(['Alert (Origin)', 'Healer (Origin)', 'Lucky (Origin)', 'Savage Attacker (Origin)'])(
    'legacy name %s resolves to its merged feat',
    (legacyName) => {
      const resolved = getFeatById(legacyName);
      expect(resolved).not.toBeNull();
      expect(resolved.name).toBe(legacyName.replace(' (Origin)', ''));
    },
  );

  test('an alias never displaces a real feat of its own', () => {
    FEATS.forEach((feat) => {
      expect(FEAT_REGISTRY[canonicalFeatId(feat.name)].name).toBe(feat.name);
    });
  });

  test('current feat names still resolve', () => {
    expect(getFeatById('Tough').name).toBe('Tough');
    expect(getFeatById('tough').name).toBe('Tough');
  });
});

describe('featCategoryForEdition', () => {
  test('falls back to the base category when there is no override', () => {
    const warCaster = FEATS.find((feat) => feat.name === 'War Caster');
    expect(featCategoryForEdition(warCaster, '2014')).toBe('general');
    expect(featCategoryForEdition(warCaster, '2024')).toBe('general');
  });

  test('applies the override for the edition that has one', () => {
    const alert = FEATS.find((feat) => feat.name === 'Alert');
    expect(featCategoryForEdition(alert, '2014')).toBe('general');
    expect(featCategoryForEdition(alert, '2024')).toBe('origin');
  });
});
