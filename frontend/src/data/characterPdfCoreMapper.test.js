import { mapCharacterPageOne } from './characterPdfCoreMapper';

const base = {
  id: 'char-test-1', name: 'Mira Fenwalker', character_class: 'Cleric',
  subclass: 'Life', level: 5, rules_edition: '2024',
  race: 'Human', background: 'Acolyte',
  strength: 12, dexterity: 14, constitution: 16,
  intelligence: 10, wisdom: 18, charisma: 12,
  proficiency_bonus: 3, saving_throw_proficiencies: ['Wisdom', 'Charisma'],
  skill_proficiencies: ['Perception'], expertise_skills: [],
  max_hit_points: 43, current_hit_points: 26,
  temporary_hit_points: 0, hit_dice: '5d8', hit_dice_remaining: 3,
  exhaustion_level: 2, death_saves_successes: 1,
  death_saves_failures: 0, inspiration: true, conditions: ['Poisoned'],
  spell_save_dc: 15, spell_attack_bonus: 7,
  gm_notes: 'Private GM secret - NEVER EXPORT',
};
const profiles = [{
  title: 'Mace', attackMod: 4, damageText: '1d6+1 bludgeoning', range: '5 ft',
}];

test('maps the same key numbers displayed by the live sheet', () => {
  const result = mapCharacterPageOne(base, { edition: '2024', attacks: profiles });
  expect(result.edition).toBe('2024');
  expect(result.values['identity.name']).toBe('Mira Fenwalker');
  expect(result.values['abilities.wis.score']).toBe('18');
  expect(result.values['abilities.wis.modifier']).toBe('+4');
  expect(result.values['abilities.wis.save_bonus']).toBe('+7');
  expect(result.values['skills.perception.bonus']).toBe('+7');
  expect(result.values['combat.passive_perception']).toBe('17');
  expect(result.values['combat.current_hp']).toBe('26');
  expect(result.values['combat.hit_dice.remaining']).toBe('3');
  expect(result.values['combat.spell_save_dc']).toBe('15');
  expect(result.values['combat.spell_attack_bonus']).toBe('+7');
  expect(result.values['attacks.1.attack_bonus']).toBe('+4');
  expect(result.values['attacks.1.range']).toBe('5 ft');
  expect(result.values['combat.exhaustion.level.1']).toBe(true);
  expect(result.values['combat.exhaustion.level.2']).toBe(true);
  expect(result.values['combat.exhaustion.level.3']).toBeUndefined();
  expect(result.values['combat.death_saves.success.1']).toBe(true);
  expect(result.values['combat.inspiration']).toBe(true);
  expect(JSON.stringify(result)).not.toContain(base.gm_notes);
  expect(result.exportReady).toBe(true);
});

test('rejects wrong edition rather than mixing 2014 and 2024 sheets', () => {
  expect(() => mapCharacterPageOne(base, { edition: '2014' })).toThrow(/edition/);
});

test('2014 character retains its edition and no Heroic Inspiration assumptions', () => {
  const result = mapCharacterPageOne({ ...base, rules_edition: '2014' }, { edition: '2014', attacks: profiles });
  expect(result.edition).toBe('2014');
  expect(result.values['combat.inspiration']).toBe(true);
});

test('long fields and excess attacks are surfaced as overflow, never clipped', () => {
  const result = mapCharacterPageOne({
    ...base, name: 'A very long character name that cannot safely fit on one line',
  }, { edition: '2024', attacks: Array.from({length: 7}, (_, i) => ({
    title: 'Weapon ' + i, attackMod: 2, damageText: '1d6', range: '5 ft',
  })) });
  expect(result.exportReady).toBe(false);
  expect(result.values['identity.name']).toBeUndefined();
  expect(result.overflow).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'identity.name' }),
    expect.objectContaining({ field: 'attacks' }),
  ]));
});

test('mixed Hit Dice never get falsely represented as a single d8', () => {
  const result = mapCharacterPageOne({ ...base, hit_dice: '2d8+3d10' }, { attacks: profiles });
  expect(result.exportReady).toBe(false);
  expect(result.values['combat.hit_dice.type']).toBeUndefined();
  expect(result.warnings.some(w => /Multiclass/.test(w))).toBe(true);
});

test('missing ability score remains blank instead of inventing a 10', () => {
  const result = mapCharacterPageOne({ ...base, wisdom: null }, { attacks: profiles });
  expect(result.values['abilities.wis.score']).toBeUndefined();
  expect(result.values['abilities.wis.modifier']).toBeUndefined();
});
