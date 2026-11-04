import { FEATS, featCategoryForEdition, featDescriptionForEdition, getFeatsByEdition } from '../../levelUpData';
import { FEAT_REGISTRY, canonicalFeatId, getFeatById, getFeatsForRuleset } from './featRegistry';

// The shipped catalogue carries only feats licensed under the SRD. SRD 5.2
// (CC-BY-4.0) licenses four Origin feats, two General feats and seven Epic
// Boons; SRD 5.1 licenses Grappler alone. Everything the PHB adds on top is
// the table's own homebrew -- see docs/licensing/SRD_FEATS.md.
const ORIGIN_FEATS_2024 = ['Alert', 'Magic Initiate', 'Savage Attacker', 'Skilled'];
const GENERAL_FEATS_BOTH = ['Ability Score Improvement', 'Grappler'];
const EPIC_BOONS_2024 = [
  'Boon of Combat Prowess',
  'Boon of Dimensional Travel',
  'Boon of Fate',
  'Boon of Irresistible Offense',
  'Boon of Spell Recall',
  'Boon of the Night Spirit',
  'Boon of Truesight',
];

// Feats that used to ship but are not SRD-licensed. They now live in the
// private homebrew pack, so re-adding one here is a licensing regression.
const UNLICENSED_FEATS = ['Lucky', 'Tough', 'Healer', 'Crafter', 'Musician', 'Tavern Brawler', 'War Caster', 'Athlete', 'Boon of Fortitude'];

const names = (feats) => feats.map((feat) => feat.name);

describe('the shipped catalogue is SRD-licensed only', () => {
  test('every shipped feat declares an SRD source', () => {
    FEATS.forEach((feat) => {
      expect(feat.source).toMatch(/^srd-5\.[12]$/);
    });
  });

  test.each(UNLICENSED_FEATS)('%s is not shipped in the app catalogue', (featName) => {
    expect(names(FEATS)).not.toContain(featName);
  });
});

describe('feat categories are resolved per edition', () => {
  test('2014 offers only the feats SRD 5.1 licenses, as General feats', () => {
    expect(names(getFeatsByEdition('2014', 'general')).sort()).toEqual([...GENERAL_FEATS_BOTH].sort());
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

  test('2024 offers exactly the SRD Origin feats', () => {
    expect(names(getFeatsByEdition('2024', 'origin')).sort()).toEqual([...ORIGIN_FEATS_2024].sort());
  });

  test('2024 offers exactly the SRD Epic Boons', () => {
    expect(names(getFeatsByEdition('2024', 'epic')).sort()).toEqual([...EPIC_BOONS_2024].sort());
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
  test('the 2014 wording of a reworked feat is used for 2014', () => {
    // Grappler is the one feat both SRDs license, and it was rewritten
    // between editions, so each edition must read its own wording.
    const grappler2024 = getFeatsForRuleset({ edition: '2024', category: 'general' })
      .find((feat) => feat.name === 'Grappler');
    const grappler2014 = getFeatsForRuleset({ edition: '2014', category: 'general' })
      .find((feat) => feat.name === 'Grappler');

    expect(grappler2024.description).toMatch(/Unarmed Strike/);
    expect(grappler2014.description).toMatch(/pin a grappled creature/);
    expect(grappler2024.description).not.toEqual(grappler2014.description);
  });

  test('a feat with one wording returns it for both editions', () => {
    const asi = FEATS.find((feat) => feat.name === 'Ability Score Improvement');
    expect(featDescriptionForEdition(asi, '2014')).toEqual(asi.description);
    expect(featDescriptionForEdition(asi, '2024')).toEqual(asi.description);
  });

  test('getFeatsForRuleset reports the edition category, not the base one', () => {
    const grappler2014 = getFeatsForRuleset({ edition: '2014', category: 'general' })
      .find((feat) => feat.name === 'Grappler');
    const alert2024 = getFeatsForRuleset({ edition: '2024', category: 'origin' })
      .find((feat) => feat.name === 'Alert');

    expect(grappler2014.category).toBe('general');
    expect(alert2024.category).toBe('origin');
  });
});

// No shipped feat needs a per-edition category override any more: the feats
// that changed category between editions are all unlicensed and now live in
// homebrew. The override still has to work, because an imported homebrew feat
// carries `categoryByEdition` through, so it is covered with fixtures.
describe('per-edition overrides (helper contract)', () => {
  const homebrewTough = {
    name: 'Tough',
    description: '+2 HP per level',
    category: 'general',
    categoryByEdition: { '2024': 'origin' },
    editions: ['2014', '2024'],
  };

  test('falls back to the base category when there is no override', () => {
    const plain = { name: 'Plain', category: 'general' };
    expect(featCategoryForEdition(plain, '2014')).toBe('general');
    expect(featCategoryForEdition(plain, '2024')).toBe('general');
  });

  test('applies the override for the edition that has one', () => {
    expect(featCategoryForEdition(homebrewTough, '2014')).toBe('general');
    expect(featCategoryForEdition(homebrewTough, '2024')).toBe('origin');
  });

  test('falls back to the base wording when there is no override', () => {
    expect(featDescriptionForEdition(homebrewTough, '2014')).toBe('+2 HP per level');
  });

  test('applies the wording override for the edition that has one', () => {
    const reworded = { ...homebrewTough, descriptionByEdition: { '2014': 'Old wording' } };
    expect(featDescriptionForEdition(reworded, '2014')).toBe('Old wording');
    expect(featDescriptionForEdition(reworded, '2024')).toBe('+2 HP per level');
  });
});

describe('no duplicate or suffixed feat entries remain', () => {
  test('no feat is presented to players with an "(Origin)" or "(Epic)" suffix', () => {
    // These were duplicate/decorated entries whose names would be written
    // into a saved character sheet verbatim.
    ['2014', '2024'].forEach((edition) => {
      names(getFeatsByEdition(edition)).forEach((name) => {
        expect(name).not.toMatch(/\((?:Origin|Epic)\)/);
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
  // Saved sheets keep the name they were written with. Alert and Savage
  // Attacker once had a duplicate "(Origin)" entry, and the Epic Boons once
  // carried an "(Epic)" suffix, so those names must still resolve.
  const LEGACY_NAMES = [
    ['Alert (Origin)', 'Alert'],
    ['Savage Attacker (Origin)', 'Savage Attacker'],
    ['Boon of Combat Prowess (Epic)', 'Boon of Combat Prowess'],
    ['Boon of Truesight (Epic)', 'Boon of Truesight'],
    ['Boon of the Night Spirit (Epic)', 'Boon of the Night Spirit'],
  ];

  test.each(LEGACY_NAMES)('legacy name %s resolves to %s', (legacyName, currentName) => {
    const resolved = getFeatById(legacyName);
    expect(resolved).not.toBeNull();
    expect(resolved.name).toBe(currentName);
  });

  test('every shipped feat that was renamed carries an alias for its old name', () => {
    getFeatsByEdition('2024', 'epic').forEach((boon) => {
      expect(boon.aliases).toContain(`${boon.name} (Epic)`);
    });
  });

  test('an alias never displaces a real feat of its own', () => {
    FEATS.forEach((feat) => {
      expect(FEAT_REGISTRY[canonicalFeatId(feat.name)].name).toBe(feat.name);
    });
  });

  test('current feat names still resolve', () => {
    expect(getFeatById('Grappler').name).toBe('Grappler');
    expect(getFeatById('grappler').name).toBe('Grappler');
  });
});
