import { describeLaunchReadiness } from './encounterLaunchReadiness';

const enemy = { id: 'g1', name: 'Goblin', type: 'enemy' };
const player = { id: 'p1', name: 'Rina', type: 'player', character_id: 'c1' };
const npc = { id: 'n1', name: 'Harbourmaster', type: 'npc' };
const temp = { id: 'q1', name: 'Wolf', type: 'enemy', temporary: true };

describe('a party that loaded and is simply empty', () => {
  test('two enemies and no players is a fight', () => {
    const result = describeLaunchReadiness({ roster: [enemy, { ...enemy, id: 'g2' }] });
    expect(result.canLaunch).toBe(true);
    expect(result.blockReason).toBe('');
  });

  test('one NPC and no players is a fight', () => {
    expect(describeLaunchReadiness({ roster: [npc] }).canLaunch).toBe(true);
  });

  test('a temporary creature on its own is a fight', () => {
    expect(describeLaunchReadiness({ roster: [temp] }).canLaunch).toBe(true);
  });

  test('an empty array is not proof that anything failed', () => {
    const result = describeLaunchReadiness({ roster: [] });
    expect(result.canLaunch).toBe(false);
    expect(result.blockReason).toContain('Choose a player, NPC or creature');
    expect(result.partyUnavailable).toBe(false);
  });
});

describe('optional lookups never block a fight', () => {
  test('a failed saved-NPC lookup warns and allows the verified roster', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'npcs', label: 'NPCs' }], roster: [player, enemy],
    });
    expect(result.canLaunch).toBe(true);
    expect(result.warnings.join(' ')).toContain('saved NPCs');
  });

  test('a failed companion lookup warns and allows the verified roster', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'liveState', label: 'Live state' }], roster: [player, enemy],
    });
    expect(result.canLaunch).toBe(true);
    expect(result.warnings.join(' ')).toContain('travelling companions');
  });

  test('both failing still does not block', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'npcs' }, { key: 'liveState' }], roster: [enemy],
    });
    expect(result.canLaunch).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });
});

describe('a party that could not be read is different from an empty one', () => {
  test('it is not assumed empty, and the GM is asked', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'players', label: 'Party' }], roster: [enemy], partyLoaded: false,
    });
    expect(result.canLaunch).toBe(false);
    expect(result.needsPartyConfirmation).toBe(true);
    expect(result.blockReason).toContain('without the player characters');
  });

  test('once the GM confirms, the verified roster launches', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'players' }], roster: [enemy],
      partyLoaded: false, withoutPartyConfirmed: true,
    });
    expect(result.canLaunch).toBe(true);
  });

  test('with nothing else selected there is nothing to confirm, only retry', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'players' }], roster: [], partyLoaded: false,
    });
    expect(result.canLaunch).toBe(false);
    expect(result.needsPartyConfirmation).toBe(false);
    expect(result.blockReason).toContain('The party could not be loaded, so some player characters may be missing.');
    expect(result.blockReason).toContain('Retry');
  });

  test('a party failure plus an optional failure still only asks about the party', () => {
    const result = describeLaunchReadiness({
      loadErrors: [{ key: 'players' }, { key: 'npcs' }], roster: [enemy], partyLoaded: false,
    });
    expect(result.needsPartyConfirmation).toBe(true);
    expect(result.warnings.join(' ')).toContain('saved NPCs');
  });
});

describe('when the encounters themselves could not be read', () => {
  test('an empty roster is blocked with a retry, not a vague message', () => {
    const result = describeLaunchReadiness({ loadErrors: [{ key: 'scenarios' }], roster: [] });
    expect(result.canLaunch).toBe(false);
    expect(result.blockReason).toContain('Retry');
  });

  test('but a roster the GM built by hand can still fight', () => {
    const result = describeLaunchReadiness({ loadErrors: [{ key: 'scenarios' }], roster: [temp] });
    expect(result.canLaunch).toBe(true);
  });
});
