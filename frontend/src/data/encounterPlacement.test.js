import { combatantSide, encounterTokens, otherSide, startingSquares, tokensToPlacements } from './encounterPlacement';

describe('friend or foe', () => {
  it('uses the GM choice, else players and NPCs are allies and creatures enemies', () => {
    expect(combatantSide({ type: 'player' })).toBe('ally');
    expect(combatantSide({ type: 'npc' })).toBe('ally');
    expect(combatantSide({ type: 'monster' })).toBe('enemy');
    expect(combatantSide({ type: 'npc', side: 'enemy' })).toBe('enemy');
    expect(combatantSide({ type: 'monster', side: 'ally' })).toBe('ally');
    expect(otherSide('ally')).toBe('enemy');
  });
});

describe('starting squares', () => {
  const combatants = [
    { id: 'hero', type: 'player' },
    { id: 'gob-1', type: 'monster' },
    { id: 'gob-2', type: 'monster' },
    { id: 'guide', type: 'npc', side: 'ally' },
  ];

  it('keeps saved squares on the map and fills the rest by side', () => {
    const squares = startingSquares(combatants, [{ id: 'gob-1', col: 10, row: 5 }, { id: 'hero', col: 99, row: 99 }], 20, 15);
    expect(squares['gob-1']).toEqual({ col: 10, row: 5 });
    expect(squares.hero).toEqual({ col: 1, row: 1 }); // off-map placement ignored
    expect(squares.guide).toEqual({ col: 1, row: 2 });
    expect(squares['gob-2']).toEqual({ col: 18, row: 1 });
  });

  it('never stacks two combatants on one square', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `m${i}`, type: 'monster' }));
    const cells = Object.values(startingSquares(many, [], 10, 8)).map(({ col, row }) => `${col},${row}`);
    expect(new Set(cells).size).toBe(40);
  });

  it('builds tokens with sides and turns them back into placements', () => {
    const tokens = encounterTokens(combatants, [], 20, 15);
    expect(tokens.find((t) => t.id === 'gob-1')).toMatchObject({ isEnemy: true, isAlly: false });
    expect(tokens.find((t) => t.id === 'guide')).toMatchObject({ isEnemy: false, isAlly: true });
    expect(tokensToPlacements([{ id: 'hero', x: 3, y: 4 }])).toEqual([{ id: 'hero', col: 3, row: 4 }]);
  });
});
