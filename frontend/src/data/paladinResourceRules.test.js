import { buildInitialClassResources, getClassResourceRules } from './classResourceRules';

describe('paladin resource rules', () => {
  test('uses Paladin class level for Lay on Hands and secondary paladins', () => {
    expect(getClassResourceRules({ character_class: 'Paladin', level: 5 }).find(rule => rule.key === 'lay_on_hands').maxValue).toBe(25);
    expect(getClassResourceRules({ character_class: 'Fighter', level: 10, classLevels: { Paladin: 3 } }).find(rule => rule.key === 'lay_on_hands').maxValue).toBe(15);
  });

  test('uses 2024 Paladin Channel Divinity progression', () => {
    const levelNine = buildInitialClassResources({ character_class: 'Paladin', level: 9, rules_edition: '2024' });
    const levelEleven = buildInitialClassResources({ character_class: 'Paladin', level: 11, rules_edition: '2024' });
    expect(levelNine.channel_divinity.max).toBe(2);
    expect(levelEleven.channel_divinity.max).toBe(3);
    expect(levelNine.channel_divinity.restore).toBe('long-rest');
    expect(levelNine.channel_divinity.short_rest_restore).toBe(1);
  });
});