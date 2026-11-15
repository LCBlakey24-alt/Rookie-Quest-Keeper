/**
 * Draft PDF expansion mapping for Keeper's V6 7-page editable 2014/2024 sheets.
 * Works only with already authorised player-visible character records (#906).
 * No account IO, PDF binary, or UI changes; the live export remains unimplemented.
 *
 * All output field names are from the V6 template. Overflow is never truncated:
 * the eventual PDF renderer must create continuation pages or refuse the export.
 */
import { mapCharacterPageOne } from './characterPdfCoreMapper';

const isSet = (value) => value !== undefined && value !== null && value !== '';
const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const title = (value) => typeof value === 'string' ? value
  : String(value?.name || value?.title || value?.item_name || value?.label || '');
const clean = (value) => String(value).replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
const numeric = (value) => {
  if (!isSet(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const sign = (value) => {
  const n = numeric(value);
  return n === null ? value : n >= 0 ? '+' + n : String(n);
};
const limits = [
  [/^combat\.details\.attacks\.\d+\.name$/, 37],
  [/^combat\.details\.attacks\.\d+\.properties$/, 33],
  [/^combat\.details\.attacks\.\d+\.damage$/, 24],
  [/^resources\.\d+\.name$/, 40],
  [/^resources\.\d+\.recharge$/, 22],
  [/^magic\.spells\.\d+\.name$/, 33],
  [/^magic\.spells\.\d+\.notes$/, 19],
  [/^inventory\.items\.\d+\.name$/, 34],
  [/^inventory\.items\.\d+\.notes$/, 24],
  [/^features\.\d+\.name$/, 35],
  [/^features\.\d+\.effect$/, 95],
  [/^story\.(backstory|traits|ideals|bonds|flaws|allies)$/, 250],
  [/^story\.appearance\.description$/, 180],
  [/^journal\.notes\.1$/, 650],
  [/^magic\.special_notes$/, 85],
];
function limitFor(field) {
  const record = limits.find(([pattern]) => pattern.test(field));
  return record ? record[1] : 45;
}
function spellName(spell) { return title(spell); }
function spellLevel(spell, cantrip) {
  if (cantrip) return '0';
  const level = spell?.level ?? spell?.spell_level ?? spell?.spellLevel;
  return isSet(level) ? String(level) : '';
}
function spellsForExport(character) {
  // "Prepared" is different from "available/known/spellbook": never imply that
  // all Wizard spellbook or class library entries are prepared.
  const prepared = arr(character.spells_prepared || character.prepared_spells);
  const known = arr(character.spells_known || character.known_spells);
  const cantrips = arr(character.cantrips_known || character.cantrips);
  const main = prepared.length ? prepared : known;
  const seen = new Set();
  return [...cantrips.map(spell => ({spell,cantrip:true})),
    ...main.map(spell => ({spell,cantrip:false}))]
    .filter(({spell}) => {
      const key = spellName(spell).trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
function extractTrackers(character, explicit) {
  if (Array.isArray(explicit)) return explicit;
  const resources = character.resources;
  if (!resources || typeof resources !== 'object' || Array.isArray(resources)) return [];
  return Object.entries(resources).map(([name, raw]) => {
    const value = raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw : { current: raw };
    return { name, ...value };
  });
}
const readField = (source, ...fields) => {
  for (const field of fields) if (isSet(source?.[field])) return source[field];
  return null;
};

/**
 * @param {object} character - already ownership-checked record.
 * @param {object} options
 *   .edition 2014 or 2024, .attacks validated combat profiles
 *   .resources optional derived class trackers
 *   .playerNotes explicit player-selected, never GM-only notes
 *   .quickActions optional player-facing action labels
 * @returns {object} { edition, values, overflow, warnings, exportReady }
 */
export function mapFullCharacterPdfFields(character, options = {}) {
  const base = mapCharacterPageOne(character, options);
  const values = { ...base.values };
  const overflow = base.overflow.filter(record => record.field !== 'attacks');
  const warnings = [...base.warnings];
  const put = (field, value) => {
    if (!isSet(value)) return;
    if (typeof value === 'boolean') { values[field] = value; return; }
    if (typeof value === 'object') return;
    const str = clean(value);
    if (!str) return;
    if (str.length > limitFor(field)) {
      overflow.push({ field, value: str, maxCharacters: limitFor(field) });
      return;
    }
    values[field] = str;
  };
  const attackList = arr(options.attacks);
  attackList.slice(0,10).forEach((attack,index) => {
    const prefix = 'combat.details.attacks.' + (index+1) + '.';
    put(prefix+'name', attack.title || attack.name);
    put(prefix+'attack_bonus', isSet(attack.attackMod) ? sign(attack.attackMod) : attack.attack_bonus);
    put(prefix+'damage', readField(attack,'damageText','damage_text'));
    put(prefix+'properties', readField(attack,'details','properties','range'));
  });
  if (attackList.length>10) overflow.push({field:'combat.details.attacks',value:attackList.slice(10)});
  // Quick slots on page 1 remain summary only. Larger textual detail belongs here.
  for (const [field,key] of [['combat.action_options','actions'],['combat.reaction_options','reactions']]) {
    put(field,options.combatNotes?.[key]);
  }
  for (const key of ['resistances','immunities','vulnerabilities','senses']) {
    const items=character[key];
    put('combat.'+key,Array.isArray(items) ? items.map(title).join(', ') : items);
  }
  put('combat.notes', options.combatNotes?.additional);

  const trackers=extractTrackers(character,options.resources);
  trackers.slice(0,6).forEach((resource,index)=>{
    const prefix='resources.'+(index+1)+'.';
    put(prefix+'name',resource.name);
    put(prefix+'current',readField(resource,'current','remaining'));
    put(prefix+'maximum',readField(resource,'max','maximum','total'));
    put(prefix+'recharge',readField(resource,'restore','recovery','refresh'));
  });
  if (trackers.length>6) overflow.push({field:'resources',value:trackers.slice(6)});

  put('magic.casting_ability',character.spellcasting_ability);
  put('magic.save_dc',character.spell_save_dc);
  if (isSet(character.spell_attack_bonus)) put('magic.attack_bonus',sign(character.spell_attack_bonus));
  const prepared=arr(character.spells_prepared || character.prepared_spells);
  if (prepared.length) put('magic.prepared_count',prepared.length);
  put('magic.spell_focus', readField(character,'spellcasting_focus','spell_focus'));

  const totals=character.spell_slots || {};
  const remaining=character.spell_slots_remaining || {};
  const spent=character.used_spell_slots || {};
  for (let level=1;level<=9;level++){
    const key=String(level);
    const total=numeric(totals[key]);
    if(total===null) continue;
    put('magic.slots.'+level+'.total',total);
    const rawSpent=numeric(spent[key]);
    const remainingCount=numeric(remaining[key]);
    if(rawSpent!==null) put('magic.slots.'+level+'.spent',rawSpent);
    else if(remainingCount!==null) put('magic.slots.'+level+'.spent',Math.max(0,total-remainingCount));
  }
  const spells=spellsForExport(character);
  spells.slice(0,24).forEach(({spell,cantrip},index)=>{
    const prefix='magic.spells.'+(index+1)+'.';
    put(prefix+'name',spellName(spell));
    put(prefix+'level',spellLevel(spell,cantrip));
    const tags=[];
    if(spell?.ritual)tags.push('Ritual');
    if(spell?.concentration)tags.push('Conc.');
    put(prefix+'notes',tags.join(', '));
  });
  if(spells.length>24) overflow.push({field:'magic.spells',value:spells.slice(24)});
  const visibleSpellNames=new Set(spells.map(({spell})=>spellName(spell).toLowerCase()));
  // Include no extra spells in the active list without verifying preparation.
  // Instead, route any omitted sources to a continuation page for review.
  const unprepared=arr(character.spellbook).filter(spell=>
    !visibleSpellNames.has(spellName(spell).toLowerCase()));
  if(unprepared.length){
    overflow.push({field:'magic.spellbook',value:unprepared});
    warnings.push('Wizard spellbook entries need a separate appendix; only prepared or known spells appear in the play list.');
  }
  if(prepared.length){
    const otherKnown=arr(character.spells_known || character.known_spells).filter(spell=>
      !visibleSpellNames.has(spellName(spell).toLowerCase()));
    if(otherKnown.length)overflow.push({field:'magic.other_known_spells',value:otherKnown});
  }
  const always=arr(character.always_prepared_spells || character.alwaysPreparedSpells).filter(spell=>
    !visibleSpellNames.has(spellName(spell).toLowerCase()));
  if(always.length)overflow.push({field:'magic.always_prepared_spells',value:always});
  const pact=character.resources?.pact_magic || {};
  put('magic.pact.remaining',readField(pact,'current','remaining'));
  put('magic.pact.total',readField(pact,'max','maximum','total'));
  put('magic.concentration.current',typeof character.concentrating_on==='string'
    ?character.concentrating_on:title(character.concentrating_on || character.concentration));
  put('magic.special_notes',options.magicNotes);

  const money=character.currency || character.coins || {};
  [['cp','copper'],['sp','silver'],['ep','electrum'],['gp','gold'],['pp','platinum']].forEach(([key,alias])=>
    put('currency.'+key,readField(money,key,alias)));
  const items=arr(character.inventory).length ? arr(character.inventory) : arr(character.equipment);
  items.slice(0,17).forEach((item,index)=>{
    const prefix='inventory.items.'+(index+1)+'.';
    put(prefix+'name',title(item));
    put(prefix+'quantity',readField(item,'quantity','qty'));
    put(prefix+'weight',readField(item,'weight'));
    put(prefix+'notes',readField(item,'location','notes'));
  });
  if(items.length>17)overflow.push({field:'inventory.items',value:items.slice(17)});
  const attuned=arr(character.attuned_items || character.attunement);
  attuned.slice(0,3).forEach((item,index)=>put('inventory.attunement.'+(index+1),title(item)));
  if(attuned.length>3)overflow.push({field:'inventory.attunement',value:attuned.slice(3)});
  put('inventory.carry_weight',character.carry_weight);
  put('inventory.capacity',character.carry_capacity);
  put('inventory.storage',options.inventoryNotes?.storage);
  put('inventory.treasure_notes',options.inventoryNotes?.treasure);

  const featureCandidates=[
    ...arr(character.class_features), ...arr(character.features),
    ...arr(character.racial_traits), ...arr(character.species_traits),
    ...arr(character.background_features), ...arr(character.feats),
  ];
  const seenFeatures=new Set();
  const features=featureCandidates.filter(feature=>{
    const key=title(feature).toLowerCase();
    if(!key || seenFeatures.has(key))return false;
    seenFeatures.add(key);return true;
  });
  features.slice(0,7).forEach((feature,index)=>{
    const prefix='features.'+(index+1)+'.';
    put(prefix+'name',title(feature));
    put(prefix+'effect',readField(feature,'effect','description'));
  });
  if(features.length>7)overflow.push({field:'features',value:features.slice(7)});
  put('story.appearance.age_height',options.appearance?.ageHeight);
  put('story.appearance.eyes_hair',options.appearance?.eyesHair);
  put('story.appearance.description',character.appearance);
  put('story.traits',character.personality_traits || character.personality_trait);
  put('story.ideals',character.ideals || character.ideal);
  put('story.bonds',character.bonds || character.bond);
  put('story.flaws',character.flaws || character.flaw);
  put('story.backstory',character.backstory);
  put('story.allies',options.playerNotes?.allies);

  // Player-visible notes must be explicitly passed; do not read campaign
  // records or any character.gm_notes / private_notes fields.
  if(options.playerNotes){
    for (const key of ['campaign','session','location','quest','quests','milestones']){
      put('journal.'+key,options.playerNotes[key]);
    }
    put('journal.notes.1',options.playerNotes.notes);
    put('journal.notes.2',options.playerNotes.notesExtra);
  }
  return { edition:base.edition, values, overflow, warnings, exportReady:overflow.length===0 };
}
