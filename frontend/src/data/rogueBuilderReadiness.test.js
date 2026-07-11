import { getRogueBuilderReadiness } from './rogueBuilderReadiness';

describe('rogue builder readiness', () => {
  test('requires a subclass once Rogue reaches level 3', () => {
    expect(getRogueBuilderReadiness({ level: 2 }).ready).toBe(true);
    expect(getRogueBuilderReadiness({ level: 3 }).ready).toBe(false);
    expect(getRogueBuilderReadiness({ level: 3, subclass: 'Arcane Trickster' }).ready).toBe(false);
    expect(getRogueBuilderReadiness({ level: 3, subclass: 'Custom Rogue Subclass' }).ready).toBe(true);
  });
});
