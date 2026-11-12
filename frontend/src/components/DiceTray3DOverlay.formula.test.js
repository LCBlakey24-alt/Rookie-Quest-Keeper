import { spelledFormula } from './DiceTray3DOverlay';

test('several dice are spelled out in the hexagon formula', () => {
  const dice = [{ result: 5 }, { result: 2 }, { result: 1 }];
  expect(spelledFormula(dice, '8 = 8')).toBe('5 + 2 + 1 = 8');
  expect(spelledFormula(dice, '8 + 3 = 11')).toBe('5 + 2 + 1 + 3 = 11');
});

test('one die, dropped dice and negative dice keep the plain formula', () => {
  expect(spelledFormula([{ result: 14 }], '14 + 2 = 16')).toBe('14 + 2 = 16');
  expect(spelledFormula([{ result: 14 }, { result: 3, dropped: true }], '14 = 14')).toBe('14 = 14');
  expect(spelledFormula([{ result: 4 }, { result: 2, sign: -1 }], '2 = 2')).toBe('2 = 2');
});
