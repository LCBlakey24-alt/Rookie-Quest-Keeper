import {
  buildFullBuilderEquipmentState,
  defaultStartingEquipmentChoices,
  rollStartingGoldRule,
  selectedStartingEquipmentLabels,
  splitStartingCurrency,
  startingEquipmentChoicesComplete,
} from './fullBuilderEquipment';

describe('full builder starting equipment', () => {
  test('Fighter defaults are complete and include one choice from every class equipment group', () => {
    const choices = defaultStartingEquipmentChoices('Fighter');

    expect(choices).toEqual({
      armor: 'Chain Mail',
      primary: 'Longsword + Shield',
      secondary: 'Light Crossbow + bolts',
      pack: "Dungeoneer's Pack",
    });
    expect(startingEquipmentChoicesComplete('Fighter', choices)).toBe(true);
  });

  test('missing a required class equipment group keeps the equipment step incomplete', () => {
    const choices = defaultStartingEquipmentChoices('Fighter');
    delete choices.primary;

    expect(startingEquipmentChoicesComplete('Fighter', choices)).toBe(false);
  });

  test('Fighter class choices and background equipment are kept together', () => {
    const labels = selectedStartingEquipmentLabels({
      className: 'Fighter',
      selections: defaultStartingEquipmentChoices('Fighter'),
      backgroundEquipment: ['Insignia of rank', '10 gp'],
    });

    expect(labels).toEqual(expect.arrayContaining([
      'Chain Mail',
      'Longsword + Shield',
      'Light Crossbow + bolts',
      "Dungeoneer's Pack",
      'Insignia of rank',
      '10 gp',
    ]));
  });

  test('background coin is stored as currency instead of a fake inventory item', () => {
    const state = buildFullBuilderEquipmentState({
      className: 'Fighter',
      selections: defaultStartingEquipmentChoices('Fighter'),
      backgroundEquipment: ['Insignia of rank', '10 gp'],
      abilities: { dexterity: 14 },
    });

    expect(state.currency).toEqual({
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 10,
      platinum: 0,
    });
    expect(state.labels).toContain('Insignia of rank');
    expect(state.labels).not.toContain('10 gp');
    expect(state.items.some(item => item.name === '10 gp')).toBe(false);
  });

  test('currency extraction recognises each supported coin denomination', () => {
    expect(splitStartingCurrency(['2 pp', '3 gp', '4 ep', '5 sp', '6 cp', 'Rope'])).toEqual({
      equipmentLabels: ['Rope'],
      currency: {
        copper: 6,
        silver: 5,
        electrum: 4,
        gold: 3,
        platinum: 2,
      },
    });
  });

  test('starting gold rolls are deterministic and use the shared die primitive', () => {
    const values = [0, 0.999, 0.5];
    let index = 0;
    const result = rollStartingGoldRule(
      { dice: 3, die: 4, multiplier: 10 },
      () => values[index++],
    );

    expect(result).toBe(80);
    expect(rollStartingGoldRule({ fixed: true, average: 50 }, () => 0)).toBe(50);
  });

  test('Fighter chain mail and shield derive 18 AC and equip real combat items', () => {
    const state = buildFullBuilderEquipmentState({
      className: 'Fighter',
      selections: defaultStartingEquipmentChoices('Fighter'),
      abilities: { strength: 16, dexterity: 14, constitution: 14 },
    });

    expect(state.armorClass).toBe(18);
    expect(state.summary).toMatchObject({
      armor: 'Chain Mail',
      shield: 'Shield',
      mainHand: 'Longsword',
      offHand: 'Shield',
    });
    expect(state.items.find(item => item.name === 'Chain Mail')?.equipped).toBe(true);
    expect(state.items.find(item => item.name === 'Longsword')?.equipped).toBe(true);
    expect(state.items.find(item => item.name === 'Shield')?.equipped).toBe(true);
    expect(state.items.find(item => item.name === 'Crossbow Bolts')?.quantity).toBe(20);
  });

  test('Defense fighting style adds one AC only while armor is worn', () => {
    const fighter = buildFullBuilderEquipmentState({
      className: 'Fighter',
      selections: defaultStartingEquipmentChoices('Fighter'),
      abilities: { dexterity: 14 },
      fightingStyle: 'Defense',
    });
    const monk = buildFullBuilderEquipmentState({
      className: 'Monk',
      selections: defaultStartingEquipmentChoices('Monk'),
      abilities: { dexterity: 16, wisdom: 16 },
      fightingStyle: 'Defense',
    });

    expect(fighter.armorClass).toBe(19);
    expect(monk.armorClass).toBe(16);
  });

  test('Barbarian unarmored defense uses Dexterity plus Constitution', () => {
    const state = buildFullBuilderEquipmentState({
      className: 'Barbarian',
      selections: defaultStartingEquipmentChoices('Barbarian'),
      abilities: { dexterity: 14, constitution: 16 },
    });

    expect(state.summary.armor).toBe('');
    expect(state.armorClass).toBe(15);
  });

  test('custom classes without equipment groups keep their existing fallback equipment', () => {
    const labels = selectedStartingEquipmentLabels({
      className: 'Clockwork Knight',
      fallbackClassEquipment: ['Leather Armor', 'Dagger'],
      backgroundEquipment: ['Common clothes'],
    });

    expect(labels).toEqual(['Leather Armor', 'Dagger', 'Common clothes']);
    expect(startingEquipmentChoicesComplete('Clockwork Knight', {}, ['Leather Armor', 'Dagger'])).toBe(true);
  });
});
