import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { BACKGROUNDS, CLASSES, RACES } from '../data/characterRules5e';
import './FullCharacterCreatorV2.css';

const classFocus = { Fighter: 'strength', Barbarian: 'strength', Paladin: 'strength', Rogue: 'dexterity', Ranger: 'dexterity', Wizard: 'intelligence', Sorcerer: 'charisma', Warlock: 'charisma', Bard: 'charisma', Cleric: 'wisdom', Druid: 'wisdom', Monk: 'dexterity' };

export function buildBasicCreatorPreset({ name, characterClass, race, background, abilityFocus, magicPreference, equipmentMode }) {
  const safeClass = CLASSES[characterClass] ? characterClass : 'Fighter';
  return {
    source: 'basic-creator',
    name: name || '',
    characterClass: safeClass,
    race: RACES[race] ? race : 'Human',
    background: BACKGROUNDS[background] ? background : 'Soldier',
    abilityFocus: abilityFocus || classFocus[safeClass] || 'strength',
    equipmentMode: equipmentMode || 'recommended',
    notes: `Basic Creator preset. Magic preference: ${magicPreference || 'not sure'}`,
  };
}

export default function BasicCharacterCreator() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', characterClass: 'Fighter', race: 'Human', background: 'Soldier', abilityFocus: 'strength', magicPreference: 'not sure', equipmentMode: 'recommended' });
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const continueToReview = () => navigate('/characters/new/full', { state: { creatorPreset: buildBasicCreatorPreset(form) } });
  return <main className="full-creator-page"><header className="full-creator-header"><button onClick={() => navigate('/characters/new/modes')} className="full-creator-back"><ArrowLeft size={18}/> Creation routes</button><div><p className="full-creator-eyebrow">Basic Creator</p><h1>Pick the basics, then review before saving.</h1><p>Rook sets up a safe starter draft from your core choices. Full Creator opens next so you can change anything before the character is saved.</p></div></header><section className="full-creator-layout"><article className="full-creator-panel"><div className="full-creator-form-grid"><label><span>Name</span><input value={form.name} onChange={(e)=>update({ name: e.target.value })} placeholder="Hero name" /></label><label><span>Class</span><select value={form.characterClass} onChange={(e)=>update({ characterClass: e.target.value, abilityFocus: classFocus[e.target.value] || form.abilityFocus })}>{Object.keys(CLASSES).map(c => <option key={c}>{c}</option>)}</select></label><label><span>Species</span><select value={form.race} onChange={(e)=>update({ race: e.target.value })}>{Object.keys(RACES).map(r => <option key={r}>{r}</option>)}</select></label><label><span>Background</span><select value={form.background} onChange={(e)=>update({ background: e.target.value })}>{Object.keys(BACKGROUNDS).map(b => <option key={b}>{b}</option>)}</select></label><label><span>Ability focus</span><select value={form.abilityFocus} onChange={(e)=>update({ abilityFocus: e.target.value })}>{['strength','dexterity','constitution','intelligence','wisdom','charisma'].map(a => <option key={a} value={a}>{a}</option>)}</select></label><label><span>Magic preference</span><select value={form.magicPreference} onChange={(e)=>update({ magicPreference: e.target.value })}><option>not sure</option><option>I want magic</option><option>No magic</option><option>Some magic</option></select></label><label><span>Equipment</span><select value={form.equipmentMode} onChange={(e)=>update({ equipmentMode: e.target.value })}><option value="recommended">Starter gear</option><option value="custom">I will choose later</option></select></label></div><button type="button" onClick={continueToReview} className="full-creator-primary">Continue to Full Creator <ChevronRight size={18}/></button></article><aside className="full-creator-preview"><h2>What happens next?</h2><p>Full Creator opens with your selected class, species, background, ability focus, and equipment mode prefilled.</p><p>No direct save happens on this page, so Basic Creator cannot create an incomplete character record.</p></aside></section></main>;
}
