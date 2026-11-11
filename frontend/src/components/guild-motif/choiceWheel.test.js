import { angleStep, optionAtTop, rotationForOption, settleRotation, shortLabels } from './choiceWheel';

test('the option at the top follows the rotation, in both directions', () => {
  expect(optionAtTop(0, 12)).toBe(0);
  expect(optionAtTop(-30, 12)).toBe(1);
  expect(optionAtTop(30, 12)).toBe(11);
  expect(optionAtTop(-360 * 3 - 60, 12)).toBe(2);
  expect(optionAtTop(-14, 12)).toBe(0);
  expect(optionAtTop(-16, 12)).toBe(1);
});

test('turning to an option takes the short way round and never returns -0', () => {
  expect(rotationForOption(11, 0, 12)).toBe(30);
  expect(rotationForOption(1, 0, 12)).toBe(-30);
  expect(rotationForOption(0, -350, 12)).toBe(-360);
  expect(Object.is(rotationForOption(0, 0, 12), -0)).toBe(false);
});

test('a released wheel settles on the nearest option', () => {
  expect(settleRotation(-44, 12)).toBe(-30);
  expect(settleRotation(-46, 12)).toBe(-60);
  expect(Object.is(settleRotation(-3, 12), -0)).toBe(false);
});

test('crossing the half-turn seam is a small step, not a jump', () => {
  expect(angleStep(170, -170)).toBe(20);
  expect(angleStep(-170, 170)).toBe(-20);
});

test('ring labels are three letters and unique', () => {
  const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Half-Elf', 'Tiefling', 'Aasimar', 'Goliath', 'Orc'];
  const short = shortLabels(races);
  expect(short).toEqual(['HUM', 'ELF', 'DWA', 'HAL', 'GNO', 'HOR', 'HEL', 'TIE', 'AAS', 'GOL', 'ORC']);
  expect(new Set(short).size).toBe(races.length);
  const classes = shortLabels(['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']);
  expect(new Set(classes).size).toBe(12);
  expect(classes.slice(0, 2)).toEqual(['BAR', 'BRD']);
});
