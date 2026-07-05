import { getRogueClassLevel, isRogueCharacter } from './rogueCharacterShape';
import { getRogueSheetSummary } from './rogueSheetSummary';

describe('rogue sheet summary', () => {
  test('detects Rogue levels from multiclass shapes', () => {
    expect(isRogueCharacter({ character_class: 'Fighter', classLevels: { Rogue: 5 } })).toBe(true);
    expect(getRogueClassLevel({ character_class: 'Wizard', multiclass_levels: { Rogue: 3 } })).toBe(3);
    expect(getRogueClassLevel({ classes: [{ name: 'Rogue', level: 7 }] })).toBe(7);
  });

  test('summarises Sneak Attack and core combat features', () => {
    const summary = getRogueSheetSummary({ character_class: 'Rogue', level: 7, subclass: 'Thief' });
    expect(summary.sneakAttackLabel).toBe('4d6');
    expect(summary.cunningAction).toBe(true);
    expect(summary.uncannyDodge).toBe(true);
    expect(summary.evasion).toBe(true);
    expect(summary.subclassLabel).toBe('Thief');
    expect(summary.subclassSupportedAutomation).toBe(true);
  });

  test('summarises user-added Rogue subclasses without built-in automation', () => {
    const summary = getRogueSheetSummary({ character_class: 'Rogue', level: 7, subclass: 'Custom Rogue Subclass' });
    expect(summary.subclassLabel).toBe('Custom / user-added subclass');
    expect(summary.subclassSupportedAutomation).toBe(false);
    expect(summary.subclassCustom).toBe(true);
  });
});
