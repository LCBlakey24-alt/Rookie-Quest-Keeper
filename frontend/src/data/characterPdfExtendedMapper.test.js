import { mapFullCharacterPdfFields } from './characterPdfExtendedMapper';

const character = {
  id: 'self-owned-pc-1', name:'Mira Fenwalker', rules_edition:'2024',
  character_class:'Cleric', level:5, race:'Human', background:'Acolyte',
  strength:12,dexterity:14,constitution:16,intelligence:10,wisdom:18,charisma:12,
  proficiency_bonus:3,saving_throw_proficiencies:['Wisdom','Charisma'],
  skill_proficiencies:['Perception'],max_hit_points:43,
  current_hit_points:26,temporary_hit_points:0,hit_dice:'5d8',hit_dice_remaining:3,
  spellcasting_ability:'Wisdom',spell_save_dc:15,spell_attack_bonus:7,
  spell_slots:{1:4,2:3,3:2},spell_slots_remaining:{1:2,2:3,3:1},
  spells_prepared:[{name:'Cure Wounds',level:1},{name:'Healing Word',level:1}],
  cantrips_known:[{name:'Guidance',level:0}],
  inventory:[{name:'Mace',quantity:1,weight:4},{name:'Shield',quantity:1,weight:6}],
  class_features:[{name:'Channel Divinity',description:'A cleric resource'}],
  currency:{gp:23,sp:9},
  resources:{channel_divinity:{current:1,max:2,restore:'short-rest'}},
  backstory:'An adventurous healer.',
  gm_notes:'Never print or expose a GM secret.',
  private_notes:'Private author only.',
};
const attacks = Array.from({length:7},(_,index)=>({
  title:'Weapon '+(index+1),attackMod:4,
  damageText:'1d6+1',details:'Melee, 5 ft',range:'5 ft',
}));

test('fills additional printable pages without marking page 2 attacks as overflow', () => {
  const result=mapFullCharacterPdfFields(character,{edition:'2024',attacks});
  expect(result.exportReady).toBe(true);
  expect(result.values['combat.details.attacks.7.name']).toBe('Weapon 7');
  expect(result.values['attacks.5.name']).toBe('Weapon 5');
  expect(result.values['magic.slots.1.spent']).toBe('2');
  expect(result.values['magic.slots.3.spent']).toBe('1');
  expect(result.values['magic.spells.1.name']).toBe('Guidance');
  expect(result.values['magic.spells.1.level']).toBe('0');
  expect(result.values['magic.spells.2.name']).toBe('Cure Wounds');
  expect(result.values['inventory.items.1.name']).toBe('Mace');
  expect(result.values['currency.gp']).toBe('23');
  expect(result.values['resources.1.current']).toBe('1');
  expect(result.values['resources.1.maximum']).toBe('2');
  expect(result.values['features.1.name']).toBe('Channel Divinity');
  expect(result.values['story.backstory']).toBe('An adventurous healer.');
});

test('GM/private notes are never printed, while explicitly shared notes may be', () => {
  const result=mapFullCharacterPdfFields(character,{
    attacks:attacks.slice(0,2),
    playerNotes:{campaign:'Cavern Expedition',notes:'Found a jade key'},
  });
  const output=JSON.stringify(result.values);
  expect(output).toContain('Found a jade key');
  expect(output).not.toContain('Never print or expose');
  expect(output).not.toContain('Private author only');
});

test('known spells and separate wizard spellbook are not silently presented as prepared', () => {
  const wizard={
    ...character,character_class:'Wizard',
    spells_prepared:[{name:'Shield',level:1}],
    spellbook:[{name:'Fireball',level:3},{name:'Shield',level:1}],
  };
  const result=mapFullCharacterPdfFields(wizard,{attacks:attacks.slice(0,2)});
  expect(result.values['magic.spells.2.name']).toBe('Shield');
  expect(JSON.stringify(result.values)).not.toContain('Fireball');
  expect(result.warnings.some(message=>/spellbook/.test(message))).toBe(true);
});

test('more than ten attacks or 24 spells require continuation pages', () => {
  const result=mapFullCharacterPdfFields({
    ...character,spells_prepared:Array.from({length:26},(_,index)=>({name:'Spell '+index,level:1})),
  },{attacks:Array.from({length:12},(_,index)=>({
    title:'Sword '+index,attackMod:5,damageText:'1d8+3',range:'5 ft',details:'Melee',
  }))});
  expect(result.exportReady).toBe(false);
  expect(result.overflow.some(row=>row.field==='magic.spells')).toBe(true);
  expect(result.overflow.some(row=>row.field==='combat.details.attacks')).toBe(true);
});

test('edition mismatch throws instead of quietly exporting the wrong reference pages', () => {
  expect(()=>mapFullCharacterPdfFields(character,{edition:'2014'})).toThrow(/edition/);
});

test('multiclass mixed hit dice require extra information instead of wrong die type', () => {
  const result=mapFullCharacterPdfFields({...character,hit_dice:'2d8+3d10'},
    {attacks:attacks.slice(0,1)});
  expect(result.exportReady).toBe(false);
  expect(result.values['combat.hit_dice.type']).toBeUndefined();
});
