/**
 * Two goblins are two goblins.
 *
 * sameCombatant returned true when two combatants merely shared a name and a
 * type, and it did so even when both carried distinct ids: the id branch only
 * returned true on a match, then fell through to the name comparison. So a
 * GM who put three guards in an encounter launched with one, and the missing
 * two gave no warning -- they were simply not in the initiative list.
 *
 * The deduplication that must survive is of REFERENCES to one thing: the
 * same player character reached through the prepared list and again through
 * the party roster, or the same saved NPC added twice.
 */
import { combinePreparedEncounterParty, playerToCombatant } from './LiveEncounterLauncher';

const ALL = list => list.map((item, index) => String(item.id || `${item.type || 'combatant'}:${item.name || 'unknown'}:${index}`));

describe('distinct creatures that happen to share a name', () => {
  test('two goblins with distinct ids both reach the fight', () => {
    const prepared = [
      { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7 },
      { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7 },
    ];
    const result = combinePreparedEncounterParty(prepared, [], ALL(prepared), []);
    expect(result).toHaveLength(2);
    expect(result.map(item => item.id)).toEqual(['g1', 'g2']);
  });

  test('a whole guard patrol survives', () => {
    const prepared = Array.from({ length: 6 }, (_, index) => (
      { id: `guard-${index}`, name: 'Town Guard', type: 'enemy', hp: 11 }
    ));
    const result = combinePreparedEncounterParty(prepared, [], ALL(prepared), []);
    expect(result).toHaveLength(6);
  });

  test('two anonymous creatures of the same name are not merged either', () => {
    // Quick-added from the bestiary, before anything has given them an id.
    const prepared = [
      { name: 'Wolf', type: 'enemy', hp: 11 },
      { name: 'Wolf', type: 'enemy', hp: 11 },
    ];
    const result = combinePreparedEncounterParty(prepared, [], ALL(prepared), []);
    expect(result).toHaveLength(2);
  });

  test('an object sharing a name with an enemy is kept', () => {
    const prepared = [
      { id: 'o1', name: 'Barrel', type: 'object', hp: 5 },
      { id: 'o2', name: 'Barrel', type: 'object', hp: 5 },
    ];
    expect(combinePreparedEncounterParty(prepared, [], ALL(prepared), [])).toHaveLength(2);
  });
});

describe('references to the same thing are still merged', () => {
  const player = { id: 'p1', character_id: 'char-1', name: 'Rina Ironside', hp: 22, max_hp: 54 };

  test('a player in both the prepared list and the party appears once', () => {
    const prepared = [{ id: 'p1', character_id: 'char-1', name: 'Rina Ironside', type: 'player' }];
    const result = combinePreparedEncounterParty(prepared, [player], ALL(prepared), ['p1']);
    expect(result).toHaveLength(1);
    expect(result[0].character_id).toBe('char-1');
  });

  test('the same character reached by different ids is still one person', () => {
    // A prepared token saved before the party row existed can carry its own
    // id while pointing at the same character.
    const prepared = [{ id: 'stale-token', character_id: 'char-1', name: 'Rina Ironside', type: 'player' }];
    const result = combinePreparedEncounterParty(prepared, [player], ALL(prepared), ['p1']);
    expect(result).toHaveLength(1);
  });

  test('a legacy roster player matched by legacy id appears once', () => {
    const legacy = { id: 'l1', legacy_player_id: 'legacy-9', name: 'Old Hand', hp: 10, max_hp: 10 };
    const prepared = [{ id: 'l1', legacy_player_id: 'legacy-9', name: 'Old Hand', type: 'player' }];
    const result = combinePreparedEncounterParty(prepared, [legacy], ALL(prepared), ['l1']);
    expect(result).toHaveLength(1);
  });

  test('two different players who share a name both appear', () => {
    // Two tables, two characters called Shadow. Neither should vanish.
    const one = { id: 'p1', character_id: 'char-1', name: 'Shadow', hp: 10, max_hp: 10 };
    const two = { id: 'p2', character_id: 'char-2', name: 'Shadow', hp: 12, max_hp: 12 };
    const result = combinePreparedEncounterParty([], [one, two], [], ['p1', 'p2']);
    expect(result).toHaveLength(2);
    expect(result.map(item => item.character_id).sort()).toEqual(['char-1', 'char-2']);
  });
});

describe('the GM\'s choices still decide who is in', () => {
  test('an unchecked player is left out and leaves no copy behind', () => {
    const player = { id: 'p1', character_id: 'char-1', name: 'Rina Ironside', hp: 22, max_hp: 54 };
    const prepared = [{ id: 'p1', character_id: 'char-1', name: 'Rina Ironside', type: 'player' }];
    const result = combinePreparedEncounterParty(prepared, [player], ALL(prepared), []);
    expect(result).toHaveLength(0);
  });

  test('disabling one of two identically named enemies removes only that one', () => {
    const prepared = [
      { id: 'g1', name: 'Goblin', type: 'enemy', hp: 7 },
      { id: 'g2', name: 'Goblin', type: 'enemy', hp: 7 },
    ];
    const result = combinePreparedEncounterParty(prepared, [], ['g1'], []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('g1');
  });

  test('disabling one of two anonymous creatures removes only that one', () => {
    const prepared = [
      { name: 'Wolf', type: 'enemy', hp: 11 },
      { name: 'Wolf', type: 'enemy', hp: 11 },
    ];
    // keyFor falls back to type:name:index, so the instances are addressable.
    const result = combinePreparedEncounterParty(prepared, [], ['enemy:Wolf:1'], []);
    expect(result).toHaveLength(1);
  });

  test('a player whose live row is missing still comes through from the prepared list', () => {
    const prepared = [{ id: 'p9', character_id: 'char-9', name: 'Absent', type: 'player', hp: 8 }];
    const result = combinePreparedEncounterParty(prepared, [], ALL(prepared), []);
    expect(result).toHaveLength(1);
  });

  test('live party state wins over the prepared snapshot', () => {
    const live = { id: 'p1', character_id: 'char-1', name: 'Rina Ironside', hp: 9, max_hp: 54, conditions: ['prone'] };
    const prepared = [{ id: 'p1', character_id: 'char-1', name: 'Rina Ironside', type: 'player', hp: 54 }];
    const result = combinePreparedEncounterParty(prepared, [live], ALL(prepared), ['p1']);
    expect(result[0].hp).toBe(9);
    expect(result[0].conditions).toEqual(['prone']);
    expect(result[0]).toEqual(playerToCombatant(live));
  });
});
