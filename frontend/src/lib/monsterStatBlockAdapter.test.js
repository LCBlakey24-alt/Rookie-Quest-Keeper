import { monsterCrValue, monsterToCombatant, normaliseMonsterStatBlock } from './monsterStatBlockAdapter';
import { canUseCombatRecord } from './combatReadiness';

test('unverified custom evidence gains no invented mechanics or combat readiness', () => {
  const original = {name:'Unknown evidence',combat_ready:false,hp:null,ac:null,stats:{},actions:[],cr:null};
  const copy = JSON.stringify(original);
  const result = normaliseMonsterStatBlock(original);
  expect(result).toMatchObject({combat_ready:false,hp:null,ac:null,cr:null,stats:{},actions:[],proficiency_bonus:null,speed:null});
  expect(() => monsterToCombatant(original)).toThrow(/confirmed HP and AC/);
  expect(JSON.stringify(original)).toBe(copy);
});

test('known custom actions and all supplied mechanics survive combat handoff', () => {
  const record = {name:'Synthetic guard',hp:20,ac:14,combat_ready:true,cr:null,
    stats:{strength:14},actions:[{name:'Spear',bonus:'+4',damage:'1d6+2'}],
    spells:{save_dc:13},legendary_actions:[{name:'Step'}],mechanics_status:'DM DRAFT'};
  const result = monsterToCombatant(record);
  expect(result).toMatchObject({hp:20,ac:14,stats:record.stats,actions:record.actions,spells:record.spells,legendary_actions:record.legendary_actions,mechanics_status:'DM DRAFT',cr:null});
});

test('empty action lists, zero initiative and incomplete ability scores remain recorded values', () => {
  const result=normaliseMonsterStatBlock({hp:7,ac:12,stats:{dexterity:18},initiativeMod:0,actions:[],source:'srd-5.1',cr:'0'});
  expect(result.actions).toEqual([]);
  expect(result.stats).toEqual({dexterity:18});
  expect(result.initiativeMod).toBe(0);
  expect(monsterCrValue(result.cr)).toBe(0);
  expect(result.combat_ready).toBe(true);
});

test('unknown CR is not zero and invalid/noncombat values fail readiness', () => {
  for (const value of [null,undefined,'','Unrated','unknown','1/0']) expect(monsterCrValue(value)).toBeNull();
  expect(monsterCrValue('1/4')).toBe(0.25);
  for (const record of [{hp:0,ac:10},{hp:10,ac:null},{hp:10,ac:10,combat_ready:false},{hp:10,ac:10,source:'legacy-reference'}]) expect(canUseCombatRecord(record)).toBe(false);
});
