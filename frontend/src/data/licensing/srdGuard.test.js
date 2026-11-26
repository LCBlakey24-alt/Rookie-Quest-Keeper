/**
 * Guard: nothing outside the SRD can quietly become a built-in option.
 *
 * Every built-in spell and subclass must either be named in SRD 5.1 / 5.2.1
 * (srdNames.json, taken from the official documents) or be on the policy's
 * list of paid-book names, which pickers never offer. Adding a new built-in
 * name that is in neither list fails this test: check it against the SRD
 * first, or add it as homebrew instead.
 */
import srdNames from './srdNames.json';
import { NON_SRD_BUILTIN_SPELLS, isNonSrdBuiltInSubclass } from './builtInContentPolicy';
import { SPELL_DATABASE } from '../spellDatabase';
import { CLASSES } from '../characterRules5e';

const key = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const srdSpells = new Set(srdNames.spells.map(key));
const srdSubclasses = new Set(srdNames.subclasses.map(key));
const hiddenSpells = new Set(NON_SRD_BUILTIN_SPELLS.map(key));

describe('built-in content stays within the SRD', () => {
  test('every built-in spell is SRD or on the hidden paid-book list', () => {
    const unknown = Object.values(SPELL_DATABASE).flat()
      .map((spell) => spell.name)
      .filter((name) => !srdSpells.has(key(name)) && !hiddenSpells.has(key(name)));
    expect(unknown).toEqual([]);
  });

  test('no hidden spell is actually in the SRD', () => {
    expect(NON_SRD_BUILTIN_SPELLS.filter((name) => srdSpells.has(key(name)))).toEqual([]);
  });

  test('every built-in subclass is SRD, the custom slot, or on the hidden paid-book list', () => {
    const unknown = Object.values(CLASSES).flatMap((info) => info.subclasses || [])
      .map((option) => (typeof option === 'object' ? option.name || option.label : option))
      .filter((name) => !/custom/i.test(name))
      .filter((name) => !srdSubclasses.has(key(name)) && !isNonSrdBuiltInSubclass(name));
    expect(unknown).toEqual([]);
  });
});

describe('paid-book subclasses carry no built-in feature text', () => {
  const { CLASS_FEATURES } = jest.requireActual('../classFeatures');
  const { BARBARIAN_SUBCLASS_FEATURES, getBarbarianSubclassSummary } = jest.requireActual('../barbarianSubclasses');
  const { getPaladinSubclassOptions, getPaladinSubclassSummary } = jest.requireActual('../paladinSubclasses');
  const { NON_SRD_SUBCLASS_NOTE } = jest.requireActual('./builtInContentPolicy');

  test('the class features file lists features only for SRD subclasses', () => {
    const offenders = [];
    Object.values(CLASS_FEATURES).forEach((classData) => {
      Object.values(classData.subclasses || {}).forEach((subclass) => {
        const isSrd = srdSubclasses.has(key(subclass.name));
        if (!isSrd && (subclass.features || []).length) offenders.push(subclass.name);
        if (!isSrd) expect(subclass.description).toBe(NON_SRD_SUBCLASS_NOTE);
        if (isSrd) expect((subclass.features || []).length).toBeGreaterThan(0);
      });
    });
    expect(offenders).toEqual([]);
  });

  test('barbarian paths outside the SRD keep their name but no features', () => {
    ['wild_heart', 'world_tree', 'zealot'].forEach((id) => {
      expect(BARBARIAN_SUBCLASS_FEATURES[id].features).toEqual([]);
      expect(BARBARIAN_SUBCLASS_FEATURES[id].label).toBeTruthy();
    });
    // A saved character with one still resolves, with nothing invented for it.
    const zealot = getBarbarianSubclassSummary('Path of the Zealot', 10, '2024');
    expect(zealot.label).toBe('Path of the Zealot');
    expect(zealot.activeFeatures).toEqual([]);
    expect(BARBARIAN_SUBCLASS_FEATURES.berserker.features.length).toBeGreaterThan(0);
  });

  test('paladin oaths outside the SRD keep their name but no named features', () => {
    ['Oath of the Ancients', 'Oath of Vengeance', 'Oath of Glory'].forEach((oath) => {
      const summary = getPaladinSubclassSummary(oath, 20, '2024');
      expect(summary.label).toBe(oath);
      summary.activeFeatures.forEach((feature) => expect(feature.name).toBe(`${oath} feature`));
    });
    const devotion = getPaladinSubclassSummary('Oath of Devotion', 20, '2014');
    expect(devotion.activeFeatures.map((feature) => feature.name)).toContain('Aura of Devotion');
    expect(getPaladinSubclassOptions('2014').map((option) => option.label)).toContain('Oath of Devotion');
  });
});
