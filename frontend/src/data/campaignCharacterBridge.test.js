import {
  buildCampaignCharacterLinkPayload,
  filterCampaignParty,
  getCampaignPartyStats,
  isLinkedCampaignCharacter,
  normalizeCampaignCharacter,
  normalizeCampaignParty,
} from './campaignCharacterBridge';

const wizard = {
  id: 'char-wizard',
  name: 'Mira the Wizard',
  character_class: 'Wizard',
  subclass: 'Evocation',
  level: 3,
  race: 'Elf',
  armor_class: 12,
  current_hit_points: 14,
  max_hit_points: 18,
  temp_hp: 3,
  speed: 30,
  cantrips_known: [{ name: 'Fire Bolt' }],
  spellbook: [{ name: 'Shield' }],
  spells_prepared: [{ name: 'Shield' }],
  spell_slots: { 1: 4, 2: 2 },
};

const fighter = {
  id: 'char-fighter',
  name: 'Brak the Fighter',
  character_class: 'Fighter',
  level: 2,
  race: 'Goliath',
  armor_class: 18,
  current_hit_points: 22,
  max_hit_points: 22,
};

describe('campaign character bridge', () => {
  test('normalizes a linked campaign character summary', () => {
    const summary = normalizeCampaignCharacter({ username: 'Lewis', character_id: wizard.id, character: wizard });

    expect(summary.id).toBe(wizard.id);
    expect(summary.playerName).toBe('Lewis');
    expect(summary.name).toBe('Mira the Wizard');
    expect(summary.className).toBe('Wizard');
    expect(summary.level).toBe(3);
    expect(summary.armorClass).toBe(12);
    expect(summary.currentHp).toBe(14);
    expect(summary.maxHp).toBe(18);
    expect(summary.tempHp).toBe(3);
    expect(summary.spellcasting).toBe(true);
    expect(summary.linked).toBe(true);
  });

  test('detects linked and unlinked campaign character records', () => {
    expect(isLinkedCampaignCharacter({ character_id: 'abc' })).toBe(true);
    expect(isLinkedCampaignCharacter({ character: { id: 'abc' } })).toBe(true);
    expect(isLinkedCampaignCharacter({ name: 'Loose NPC' })).toBe(false);
  });

  test('joins player records with saved character records', () => {
    const party = normalizeCampaignParty(
      [
        { player_name: 'Lewis', character_id: wizard.id },
        { player_name: 'Charlotte', character_id: fighter.id },
      ],
      [wizard, fighter],
    );

    expect(party.map((member) => member.name)).toEqual(['Mira the Wizard', 'Brak the Fighter']);
    expect(party.map((member) => member.playerName)).toEqual(['Lewis', 'Charlotte']);
  });

  test('builds useful party stats for GM campaign pages', () => {
    const stats = getCampaignPartyStats([
      { username: 'Lewis', character_id: wizard.id, character: wizard },
      { username: 'Charlotte', character_id: fighter.id, character: fighter },
      { username: 'Guest', name: 'Unlinked Guest' },
    ]);

    expect(stats.total).toBe(3);
    expect(stats.linked).toBe(2);
    expect(stats.unlinked).toBe(1);
    expect(stats.spellcasters).toBe(1);
    expect(stats.totalCurrentHp).toBeGreaterThan(0);
    expect(stats.averageLevel).toBeGreaterThan(0);
  });

  test('filters party by character, player, class, subclass, or race', () => {
    const party = [
      { username: 'Lewis', character_id: wizard.id, character: wizard },
      { username: 'Charlotte', character_id: fighter.id, character: fighter },
    ];

    expect(filterCampaignParty(party, 'wizard')).toHaveLength(1);
    expect(filterCampaignParty(party, 'charlotte')).toHaveLength(1);
    expect(filterCampaignParty(party, 'goliath')).toHaveLength(1);
    expect(filterCampaignParty(party, 'missing')).toHaveLength(0);
  });

  test('builds a link payload from a saved character', () => {
    expect(buildCampaignCharacterLinkPayload(wizard)).toEqual({
      character_id: 'char-wizard',
      character_name: 'Mira the Wizard',
      character_class: 'Wizard',
      level: 3,
    });
    expect(buildCampaignCharacterLinkPayload({ name: 'No id' })).toBeNull();
  });
});
