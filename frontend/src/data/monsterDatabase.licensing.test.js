import { MONSTER_DATABASE } from './monsterDatabase';
import SRD_5_1_MONSTERS from './srd5eMonsters.generated.json';

// Only SRD creatures ship (docs/licensing/CONTENT_AUDIT.md). Non-SRD creatures
// belong in a table's own homebrew, not in the built-in bestiary.
test('the built-in bestiary is exactly the SRD 5.1 bestiary', () => {
  const srd = new Set(SRD_5_1_MONSTERS.map((creature) => creature.name));
  expect(MONSTER_DATABASE.every((creature) => srd.has(creature.name))).toBe(true);
  expect(MONSTER_DATABASE.some((creature) => creature.source === 'legacy-reference')).toBe(false);
});
