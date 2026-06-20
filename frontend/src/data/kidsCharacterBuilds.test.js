import { buildKidsCharacterPayload, buildKidsCharacterTemplate } from './kidsCharacterBuilds';

describe('kids character builds', () => {
  test('maps plain-English choices to a real Fighter sheet payload', () => {
    const payload = buildKidsCharacterPayload({
      name: 'Pip',
      heroTypeId: 'brave-fighter',
      speciesId: 'human',
      backgroundId: 'soldier',
      favoriteId: 'strong',
      gearId: 'sturdy',
    });

    expect(payload.creation_mode).toBe('kids');
    expect(payload.character_class).toBe('Fighter');
    expect(payload.race).toBe('Human');
    expect(payload.background).toBe('Soldier');
    expect(payload.max_hit_points).toBeGreaterThan(0);
    expect(payload.armor_class).toBeGreaterThan(10);
    expect(payload.saving_throw_proficiencies).toContain('strength');
    expect(payload.skill_proficiencies).toContain('Athletics');
    expect(payload.starting_equipment).toEqual(expect.arrayContaining(['Chain Mail', 'Shield']));
    expect(payload.class_features.length).toBeGreaterThan(0);
  });

  test('maps Magic User to real wizard spells and prepared choices', () => {
    const payload = buildKidsCharacterPayload({
      name: 'Mira',
      heroTypeId: 'magic-user',
      speciesId: 'elf',
      backgroundId: 'sage',
      favoriteId: 'clever',
      gearId: 'adventurer',
    });

    expect(payload.character_class).toBe('Wizard');
    expect(payload.cantrips_known.map(spell => spell.name)).toEqual(expect.arrayContaining(['Fire Bolt', 'Mage Hand']));
    expect(payload.spells_known.map(spell => spell.name)).toEqual(expect.arrayContaining(['Magic Missile', 'Shield']));
    expect(payload.spells_prepared.length).toBeGreaterThan(0);
    expect(payload.spell_save_dc).toBeGreaterThan(0);
    expect(payload.spell_slots).toEqual({ 1: 2 });
  });

  test('builds templates without exposing advanced rules to the UI', () => {
    const template = buildKidsCharacterTemplate({
      heroTypeId: 'helpful-healer',
      speciesId: 'dwarf',
      backgroundId: 'acolyte',
      favoriteId: 'kind',
      gearId: 'adventurer',
    });

    expect(template.character_class).toBe('Cleric');
    expect(template.spells_prepared).toEqual(expect.arrayContaining(['Cure Wounds', 'Bless']));
    expect(template.kids_summary.hero).toBe('Helpful Healer');
  });
});
