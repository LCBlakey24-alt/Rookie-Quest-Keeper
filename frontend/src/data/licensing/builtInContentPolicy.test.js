import { NON_SRD_BUILTIN_SUBCLASSES, isNonSrdBuiltInSubclass, offerableSubclasses } from './builtInContentPolicy';
import { getCharacterBuilderClassOptions } from '../characterBuilderClassOptions';
import { getClassSelectionState } from '../../components/builder/classSelectionState';
import { CLASSES } from '../characterRules5e';

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
