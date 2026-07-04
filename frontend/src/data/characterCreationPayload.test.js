import { buildCharacterCreationPayloadFromTemplate, buildRookSpellLoadoutsForTemplate, calculateArmorClass, getCharacterCreationPayloadWarnings } from './characterCreationPayload';

const thorne = {
  name: 'Thorne the Blade',
  ruleset_id: 'dnd5e_2014',
  character_class: 'Fighter',
  race: 'Human',
  background: 'Soldier',
  alignment: 'Lawful Good',
  ability_scores: { strength: 15, dexterity: 13, constitution: 14, intelligence: 10, wisdom: 12, charisma: 8 },
  skill_proficiencies: ['Athletics', 'Intimidation'],
  fighting_style: 'Defense',
  equipment_pick: 'chain_mail',
};

const wizard = {
  name: 'Elara Moonveil',
  ruleset_id: 'dnd5e_2014',
  character_class: 'Wizard',
  race: 'Elf',
  subrace: 'High Elf',
  background: 'Sage',
  ability_scores: { strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 },
  skill_proficiencies: ['Arcana', 'Investigation'],
  cantrips_known: ['Fire Bolt', 'Mage Hand', 'Prestidigitation'],
  spells_known: ['Magic Missile', 'Shield'],
};

describe('character creation payload helper', () => {
  test('builds premade fighter payload with armour, shield, HP, proficiencies, languages, traits, and features', () => {
    const payload = buildCharacterCreationPayloadFromTemplate(thorne, { name: 'Sir Test', edition: '2014', rulesetId: 'dnd5e_2014' });

    expect(payload.name).toBe('Sir Test');
    expect(payload.max_hit_points).toBe(12);
    expect(payload.armor_class).toBe(19);
    expect(payload.equipped.armor.name).toBe('Chain Mail');
    expect(payload.equipped.shield.name).toBe('Shield');
    expect(payload.starting_equipment).toEqual(expect.arrayContaining(['Chain Mail', 'Shield', 'Longsword']));
    expect(payload.saving_throw_proficiencies).toEqual(['strength', 'constitution']);
    expect(payload.weapon_proficiencies).toContain('martial');
    expect(payload.languages).toContain('Common');
    expect(payload.racial_traits.length).toBeGreaterThan(0);
    expect(payload.class_features.map(feature => feature.name)).toEqual(expect.arrayContaining(['Fighting Style', 'Second Wind', 'Fighting Style: Defense']));
    expect(getCharacterCreationPayloadWarnings(payload)).toEqual([]);
  });

  test('builds premade caster payload with clean spell lists and spell stats', () => {
    const payload = buildCharacterCreationPayloadFromTemplate(wizard, { name: 'Elara', edition: '2014', rulesetId: 'dnd5e_2014' });

    expect(payload.cantrips_known).toEqual([{ name: 'Fire Bolt' }, { name: 'Mage Hand' }, { name: 'Prestidigitation' }]);
    expect(payload.spells_known).toEqual([{ name: 'Magic Missile' }, { name: 'Shield' }]);
    expect(payload.spellbook).toEqual([{ name: 'Magic Missile' }, { name: 'Shield' }]);
    expect(payload.spellcasting_ability).toBe('intelligence');
    expect(payload.spell_save_dc).toBe(12);
    expect(payload.spell_attack_bonus).toBe(4);
    expect(payload.spell_slots).toEqual({ 1: 2 });
    expect(payload.spell_slots_remaining).toEqual({ 1: 2 });
    expect(payload.spells_prepared.map(spell => spell.name)).toEqual(['Magic Missile', 'Shield']);
    expect(payload.spell_preparation_loadout).toBe('rook-balanced');
  });

  test('builds labeled Rook prepared spell loadouts for prepared casters', () => {
    const cleric = {
      character_class: 'Cleric',
      race: 'Dwarf',
      background: 'Acolyte',
      ability_scores: { wisdom: 15 },
    };
    const loadouts = buildRookSpellLoadoutsForTemplate(cleric);

    expect(loadouts.map(loadout => loadout.label)).toEqual(['Balanced', 'Healing', 'Power', 'Support']);
    expect(loadouts.find(loadout => loadout.id === 'rook-healing').spells.map(spell => spell.name)).toEqual(expect.arrayContaining(['Cure Wounds']));
    expect(loadouts.find(loadout => loadout.id === 'rook-power').spells.map(spell => spell.name)).toEqual(expect.arrayContaining(['Guiding Bolt']));
    expect(loadouts.find(loadout => loadout.id === 'rook-support').spells.map(spell => spell.name)).toEqual(expect.arrayContaining(['Bless']));
  });

  test('calculates armour AC with Dex caps, shields, and Defense style', () => {
    expect(calculateArmorClass({ dexterity: 16, armorKey: 'leather' })).toBe(14);
    expect(calculateArmorClass({ dexterity: 16, armorKey: 'scale_mail', shield: true })).toBe(18);
    expect(calculateArmorClass({ dexterity: 16, armorKey: 'chain_mail', shield: true, fightingStyle: 'Defense' })).toBe(19);
  });
});
