import {
  canCharacterCastSpells,
  getCharacterSpellcastingInfo,
  getSpellSlotsForCaster,
} from './spellDatabase';
import { FEATURE_COSTS } from './classResources';

describe('spellcasting eligibility', () => {
  test('does not treat a plain fighter as a spellcaster', () => {
    expect(canCharacterCastSpells({
      character_class: 'Fighter',
      subclass: 'Champion',
      level: 5,
    })).toBe(false);
  });

  test('allows Eldritch Knight fighter spellcasting', () => {
    const character = {
      character_class: 'Fighter',
      subclass: 'Eldritch Knight',
      level: 5,
    };

    expect(canCharacterCastSpells(character)).toBe(true);

    const info = getCharacterSpellcastingInfo(character);
    expect(info.className).toBe('Fighter');
    expect(getSpellSlotsForCaster(info.classInfo, info.level)).toEqual({ 1: 2 });
  });

  test('keeps half casters spell-free until level 2', () => {
    expect(canCharacterCastSpells({
      character_class: 'Paladin',
      level: 1,
    })).toBe(false);

    expect(canCharacterCastSpells({
      character_class: 'Paladin',
      level: 2,
    })).toBe(true);
  });

  test('does not expose a spells tab for monk', () => {
    expect(canCharacterCastSpells({
      character_class: 'Monk',
      level: 5,
    })).toBe(false);
  });
});

describe('resource costs', () => {
  test('tracks key monk ki abilities', () => {
    expect(FEATURE_COSTS['Flurry of Blows']).toEqual({ resource: 'ki_points', cost: 1 });
    expect(FEATURE_COSTS['Patient Defense']).toEqual({ resource: 'ki_points', cost: 1 });
    expect(FEATURE_COSTS['Step of the Wind']).toEqual({ resource: 'ki_points', cost: 1 });
    expect(FEATURE_COSTS['Empty Body']).toEqual({ resource: 'ki_points', cost: 4 });
  });
});
