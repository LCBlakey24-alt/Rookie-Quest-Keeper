import { getMonkBuilderReadiness } from './monkBuilderReadiness';

describe('monk builder readiness', () => {
  test('requires a subclass once Monk reaches level 3', () => {
    expect(getMonkBuilderReadiness({ level: 2 }).ready).toBe(true);
    expect(getMonkBuilderReadiness({ level: 3 }).ready).toBe(false);
    expect(getMonkBuilderReadiness({ level: 3, subclass: 'Way of Shadow' }).ready).toBe(true);
  });
});
