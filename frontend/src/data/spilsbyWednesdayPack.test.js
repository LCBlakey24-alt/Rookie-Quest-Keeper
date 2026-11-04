import pack, {
  spilsbyWednesdayDiscovery,
  spilsbyWednesdayLocations,
  spilsbyWednesdayParty,
  spilsbyWednesdaySnapshot,
} from './spilsbyWednesdayPack';

/**
 * The source document's rule is absolute: anything not explicitly recorded
 * as learned by the Wednesday party remains unknown to them. These names
 * are GM-only at the session-1 snapshot, so finding one in a player-facing
 * field is a leak, not a style problem.
 */
const GM_ONLY_TERMS = [
  'Koltoro',          // the mountain opponent; players do not know who they saw
  "Koltoro's heart",  // what the shard actually is
  'Malerin',          // the Firestarter's true name
];

const playerFacing = (entry) => [entry.playerSummary, entry.title, entry.category].join(' ');

describe('player-facing text never carries a GM secret', () => {
  test.each(GM_ONLY_TERMS)('%s does not appear in any player summary', (term) => {
    const leaks = pack.entries
      .filter((entry) => playerFacing(entry).toLowerCase().includes(term.toLowerCase()))
      .map((entry) => entry.id);

    expect(leaks).toEqual([]);
  });

  test('the shard stays generic where players can read it', () => {
    const resources = pack.entries.find((entry) => entry.id === 'spilsby-party-resources');
    // Players know only how it looks and behaves.
    expect(resources.playerSummary).toMatch(/shiny|smooth|repels/i);
    expect(resources.playerSummary.toLowerCase()).not.toContain('koltoro');
    // The GM side is where the truth lives.
    expect(resources.gmSecrets.toLowerCase()).toContain('koltoro');
  });

  test('the Firestarter keeps his true name on the GM side only', () => {
    const chronicle = pack.entries.find((entry) => entry.id === 'spilsby-session-1-record');
    expect(chronicle.playerSummary).toContain('Firestarter');
    expect(chronicle.playerSummary).not.toContain('Malerin');
    expect(chronicle.gmSecrets).toContain('Opian');
  });

  test('planned encounters are GM-only, with nothing player-facing', () => {
    // The party is outside the front door. None of this has happened.
    ['spilsby-hollowmere-prep', 'spilsby-hollowmere-rewards', 'spilsby-continuity-holds'].forEach((id) => {
      const entry = pack.entries.find((item) => item.id === id);
      expect(entry.playerSummary).toBe('');
      expect(entry.gmSecrets.length).toBeGreaterThan(0);
    });
  });
});

describe('the snapshot matches the source document', () => {
  test('records the 2014 baseline, not 2024', () => {
    // The character sheets were exported from D&D Beyond in 2024 layout,
    // but the campaign runs 2014 rules plus locked homebrew.
    expect(spilsbyWednesdaySnapshot.rulesEdition).toBe('2014');
  });

  test('places the party outside the manor with the infestation uncleared', () => {
    expect(spilsbyWednesdaySnapshot.currentLocation).toMatch(/outside the front door/i);
    expect(spilsbyWednesdaySnapshot.infestationCleared).toBe(false);
    expect(spilsbyWednesdaySnapshot.manorInteriorExplored).toBe(false);
    expect(spilsbyWednesdaySnapshot.sessionsCompleted).toBe(1);
  });

  test('has three characters and says so', () => {
    expect(spilsbyWednesdaySnapshot.partyCount).toBe(3);
    expect(spilsbyWednesdayParty).toHaveLength(3);
  });
});

describe('the party matches the corrected sheets', () => {
  test('Josh carries the corrected values, not the stale ones', () => {
    // The source marks AC 14 / HP 27 as stale. Importing those would make
    // the Hollowmere encounters wrong.
    const josh = spilsbyWednesdayParty.find((character) => character.character === 'Josh');
    expect(josh.armorClass).toBe(15);
    expect(josh.maxHp).toBe(41);
    expect(josh.speed).toBe('35 ft');
  });

  test.each([
    ['Rina Ironside', 19, 54],
    ['Orren Oakenshade', 16, 38],
  ])('%s is AC %i, HP %i', (name, ac, hp) => {
    const character = spilsbyWednesdayParty.find((entry) => entry.character === name);
    expect(character.armorClass).toBe(ac);
    expect(character.maxHp).toBe(hp);
  });

  test('every character has a full ability spread', () => {
    spilsbyWednesdayParty.forEach((character) => {
      ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].forEach((ability) => {
        expect(typeof character.abilities[ability]).toBe('number');
      });
    });
  });
});

describe('discovery state is kept apart from NPC profiles', () => {
  test('records how each NPC is known, not just that they exist', () => {
    const edwin = spilsbyWednesdayDiscovery.find((row) => row.npc === 'Edwin Hollowmere');
    const corvin = spilsbyWednesdayDiscovery.find((row) => row.npc === 'Corvin Hale');
    const koltoro = spilsbyWednesdayDiscovery.find((row) => row.npc === 'Koltoro');

    expect(edwin.status).toBe('met');
    expect(corvin.status).toMatch(/not met/);
    expect(koltoro.status).toMatch(/identity unknown/);
  });

  test('what players know about Opian stops at the disguise', () => {
    const opian = spilsbyWednesdayDiscovery.find((row) => row.npc === 'Opian');
    expect(opian.playersKnow).toMatch(/cow/i);
    expect(opian.status).toMatch(/true identity unknown/i);
  });

  test('the manor is reached but not explored', () => {
    const manor = spilsbyWednesdayLocations.find((row) => row.location === 'Hollowmere Manor');
    expect(manor.status).toMatch(/interior not yet explored/i);
  });
});

describe('the pack is importable', () => {
  test('every entry has an id, a destination and a title', () => {
    pack.entries.forEach((entry) => {
      expect(entry.id).toBeTruthy();
      expect(entry.destination).toBeTruthy();
      expect(entry.title).toBeTruthy();
    });
  });

  test('ids are unique, so a re-import updates rather than duplicates', () => {
    const ids = pack.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('uses destinations the existing pack panel understands', () => {
    const known = new Set([
      'worldOverview', 'worldAtlas', 'powers', 'npcs', 'storyArcs', 'chronicle',
      'sessionNotes', 'handouts', 'encounters', 'inventory', 'campaignRules',
    ]);
    pack.entries.forEach((entry) => {
      expect(known.has(entry.destination)).toBe(true);
    });
  });
});
