import { NON_SRD_BUILTIN_SUBCLASSES, isNonSrdBuiltInSubclass, offerableSubclasses } from './builtInContentPolicy';
import { getCharacterBuilderClassOptions } from '../characterBuilderClassOptions';
import { getClassSelectionState } from '../../components/builder/classSelectionState';
import { CLASSES } from '../characterRules5e';
import * as policy from './builtInContentPolicy';
import { getFighterBuilderOptions } from '../fighterBuilderOptions';
import { SPELL_DATABASE, getSpellsForClass } from '../spellDatabase';
import { ITEMS_DATABASE } from '../itemsDatabase';

// The SRD subclass for each class (SRD 5.1 name / SRD 5.2.1 name).
const SRD_SUBCLASSES = {
  Barbarian: ['Path of the Berserker'], Bard: ['College of Lore'], Cleric: ['Life Domain'], Druid: ['Circle of the Land'],
  Fighter: ['Champion'], Monk: ['Way of the Open Hand', 'Warrior of the Open Hand'], Paladin: ['Oath of Devotion'],
  Ranger: ['Hunter'], Rogue: ['Thief'], Sorcerer: ['Draconic Bloodline', 'Draconic Sorcery'],
  Warlock: ['The Fiend', 'Fiend Patron'], Wizard: ['School of Evocation', 'Evoker'],
};

test('no SRD subclass is on the paid-book list', () => {
  Object.values(SRD_SUBCLASSES).flat().forEach((name) => expect(isNonSrdBuiltInSubclass(name)).toBe(false));
  expect(isNonSrdBuiltInSubclass('Samurai')).toBe(true);
  expect(isNonSrdBuiltInSubclass('school of abjuration')).toBe(true);
  expect(NON_SRD_BUILTIN_SUBCLASSES.length).toBeGreaterThan(80);
});

test('the builder offers only SRD subclasses and the custom slot, for every class and edition', () => {
  Object.keys(CLASSES).forEach((className) => ['2014', '2024'].forEach((edition) => {
    const { subclassOptions } = getCharacterBuilderClassOptions(className, { edition, level: 20 });
    subclassOptions.forEach((option) => {
      const allowed = SRD_SUBCLASSES[className].includes(option.label) || /custom/i.test(option.label);
      expect({ className, edition, label: option.label, allowed }).toEqual({ className, edition, label: option.label, allowed: true });
    });
    expect(subclassOptions.length).toBeGreaterThan(0);
  }));
});

test('a character that already has a paid-book subclass keeps it', () => {
  const kept = offerableSubclasses(['Champion', 'Battle Master', 'Samurai'], 'Samurai');
  expect(kept).toEqual(['Champion', 'Samurai']);
  const state = getClassSelectionState({ className: 'Ranger', edition: '2014', level: 5, selectedSubclass: 'Gloom Stalker' });
  expect(state.shouldClearSelectedSubclass).toBe(false);
  expect(state.availableSubclassOptions.map((option) => option.label)).toEqual(expect.arrayContaining(['Hunter', 'Gloom Stalker']));
});

test('homebrew subclasses are never hidden', () => {
  expect(offerableSubclasses(['Champion', 'Bloodbound Knight'], '')).toEqual(['Champion', 'Bloodbound Knight']);
  expect(offerableSubclasses([{ label: 'Oath of Starlight' }, { label: 'Oath of Glory' }])).toEqual([{ label: 'Oath of Starlight' }]);
});

describe('species and backgrounds, per edition', () => {
  const { offerableSpecies, offerableBackgrounds } = jest.requireActual('./builtInContentPolicy');
  const { RACES, BACKGROUNDS } = jest.requireActual('../characterRules5e');
  require('../applyOriginData');

  test('2014 offers the SRD 5.1 species and the original starters, never Aasimar, Goliath or Orc', () => {
    const offered = offerableSpecies(Object.keys(RACES), '2014');
    expect(offered).toEqual(expect.arrayContaining(['Human', 'Elf', 'Half-Elf', 'Half-Orc', 'Tiefling', 'Custom Lineage']));
    ['Aasimar', 'Goliath', 'Orc'].forEach((name) => expect(offered).not.toContain(name));
  });

  test('2024 offers the SRD 5.2.1 species, not Aasimar, Half-Elf or Half-Orc', () => {
    const offered = offerableSpecies(Object.keys(RACES), '2024');
    expect(offered).toEqual(expect.arrayContaining(['Human', 'Goliath', 'Orc', 'Tiefling']));
    ['Aasimar', 'Half-Elf', 'Half-Orc'].forEach((name) => expect(offered).not.toContain(name));
  });

  test('backgrounds: SRD for the edition plus the original starters', () => {
    const b2014 = offerableBackgrounds(Object.keys(BACKGROUNDS), '2014');
    const b2024 = offerableBackgrounds(Object.keys(BACKGROUNDS), '2024');
    expect(b2014).toEqual(expect.arrayContaining(['Acolyte', 'Adventurer', 'Custom Background']));
    ['Folk Hero', 'Noble', 'Criminal', 'Sage'].forEach((name) => expect(b2014).not.toContain(name));
    expect(b2024).toEqual(expect.arrayContaining(['Acolyte', 'Criminal', 'Sage', 'Soldier']));
    ['Folk Hero', 'Noble', 'Hermit', 'Urchin'].forEach((name) => expect(b2024).not.toContain(name));
  });

  test('a character keeps its current species and background', () => {
    expect(offerableSpecies(['Human', 'Aasimar'], '2024', 'Aasimar')).toEqual(['Human', 'Aasimar']);
    expect(offerableBackgrounds(['Acolyte', 'Folk Hero'], '2014', 'Folk Hero')).toEqual(['Acolyte', 'Folk Hero']);
  });

  test('homebrew origins are never hidden', () => {
    expect(offerableSpecies(['Human', 'Moonborn'], '2014')).toEqual(['Human', 'Moonborn']);
    expect(offerableBackgrounds(['Acolyte', 'Lamplighter'], '2014')).toEqual(['Acolyte', 'Lamplighter']);
  });
});

describe('fighting styles, spells and magic items', () => {
  test('only SRD fighting styles are offered, in both editions', () => {
    expect(getFighterBuilderOptions(1, '2014').fightingStyles.map((s) => s.name)).toEqual(
      ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'],
    );
    const styles2024 = getFighterBuilderOptions(1, '2024').fightingStyles.map((s) => s.name);
    policy.NON_SRD_FIGHTING_STYLES.forEach((name) => expect(styles2024).not.toContain(name));
    expect(styles2024).toEqual(expect.arrayContaining(['Archery', 'Defense', 'Great Weapon Fighting', 'Two-Weapon Fighting']));
  });

  test("a character's current fighting style is kept", () => {
    expect(getFighterBuilderOptions(1, '2024', 'Blind Fighting').fightingStyles.map((s) => s.name)).toContain('Blind Fighting');
    expect(policy.offerableFightingStyles(['Archery', 'Interception'], ['Interception'])).toEqual(['Archery', 'Interception']);
  });

  test('every listed non-SRD spell exists in the built-in data, so the list stays accurate', () => {
    const names = new Set(Object.values(SPELL_DATABASE).flat().map((spell) => spell.name));
    policy.NON_SRD_BUILTIN_SPELLS.forEach((name) => expect(names).toContain(name));
  });

  test('class spell pickers no longer offer the non-SRD spells', () => {
    ['Wizard', 'Sorcerer', 'Warlock', 'Cleric', 'Druid', 'Bard', 'Paladin', 'Ranger'].forEach((className) => {
      const offered = Object.values(policy.offerableSpellLists(getSpellsForClass(className))).flat().map((spell) => spell.name);
      offered.forEach((name) => expect(policy.isNonSrdBuiltInSpell(name)).toBe(false));
    });
    const wizard = Object.values(policy.offerableSpellLists(getSpellsForClass('Wizard'))).flat().map((spell) => spell.name);
    expect(wizard).toContain('Hideous Laughter');
    expect(wizard).toContain('Magic Missile');
  });

  test('spells a character already has stay offered', () => {
    const character = { spells_known: [{ name: 'Witch Bolt' }], cantrips_known: ['Toll the Dead'] };
    const current = policy.characterSpellNames(character);
    expect(current).toEqual(['Toll the Dead', 'Witch Bolt']);
    const offered = Object.values(policy.offerableSpellLists(getSpellsForClass('Warlock'), current)).flat().map((spell) => spell.name);
    expect(offered).toEqual(expect.arrayContaining(['Witch Bolt', 'Toll the Dead']));
  });

  test('Potion of Fire Breath is not a built-in item', () => {
    expect(ITEMS_DATABASE.map((item) => item.name)).not.toContain('Potion of Fire Breath');
  });
});
