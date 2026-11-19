import { subclassBlurb } from './subclassBlurbs';

test('2024 short names find the local summary', () => {
  expect(subclassBlurb('Wizard', 'Abjurer')).toMatch(/protective/i);
  expect(subclassBlurb('Wizard', 'Evoker')).toMatch(/battle-mage/i);
  expect(subclassBlurb('Wizard', 'Illusionist')).toMatch(/deception/i);
  expect(subclassBlurb('wizard', 'School of Divination')).toMatch(/foresight/i);
});

test('unknown names give no made-up text', () => {
  expect(subclassBlurb('Wizard', 'Zzyzx Tradition')).toBe('');
  expect(subclassBlurb('Unknownclass', 'Abjurer')).toBe('');
  expect(subclassBlurb('Wizard', '')).toBe('');
});
