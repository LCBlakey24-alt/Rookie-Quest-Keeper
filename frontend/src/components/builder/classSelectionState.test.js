import {
  getAvailableSubclassOptionsForBuilder,
  getAvailableSubclassesForBuilder,
  getClassSelectionState,
} from './classSelectionState';

describe('class selection state', () => {
  test('returns package-backed subclasses for completed class packages', () => {
    const state = getClassSelectionState({ className: 'Sorcerer', edition: '2024', selectedSubclass: 'Wild Magic' });

    expect(state.hasPackage).toBe(true);
    expect(state.usesPackageSubclassOptions).toBe(true);
    expect(state.availableSubclasses).toEqual(expect.arrayContaining(['Draconic Bloodline', 'Wild Magic', 'Aberrant Mind', 'Clockwork Soul']));
    expect(state.selectedSubclassOption).toEqual(expect.objectContaining({ key: 'wild_magic' }));
    expect(state.selectedSubclassIsAvailable).toBe(true);
    expect(state.shouldClearSelectedSubclass).toBe(false);
  });

  test('marks a stale subclass selection when edition-specific options change', () => {
    const state = getClassSelectionState({ className: 'Sorcerer', edition: '2024', selectedSubclass: 'Divine Soul' });

    expect(state.availableSubclasses).not.toContain('Divine Soul');
    expect(state.selectedSubclassOption).toBeNull();
    expect(state.selectedSubclassIsAvailable).toBe(false);
    expect(state.shouldClearSelectedSubclass).toBe(true);
  });

  test('falls back to static subclass names for classes without package helpers', () => {
    const state = getClassSelectionState({
      className: 'Inventor',
      selectedSubclass: 'Gadgeteer',
      classes: {
        Inventor: {
          name: 'Inventor',
          subclasses: ['Gadgeteer', 'Alchemist'],
        },
      },
    });

    expect(state.hasPackage).toBe(false);
    expect(state.usesPackageSubclassOptions).toBe(false);
    expect(state.availableSubclasses).toEqual(['Gadgeteer', 'Alchemist']);
    expect(state.selectedSubclassOption).toEqual(expect.objectContaining({ value: 'Gadgeteer' }));
  });

  test('returns convenience lists for the builder component', () => {
    expect(getAvailableSubclassesForBuilder({ className: 'Fighter', edition: '2014' })).toEqual(expect.arrayContaining(['Champion', 'Battle Master', 'Eldritch Knight']));
    expect(getAvailableSubclassOptionsForBuilder({ className: 'Warlock', edition: '2014' })[0]).toEqual(expect.objectContaining({
      value: expect.any(String),
      label: expect.any(String),
      key: expect.any(String),
    }));
  });
});
