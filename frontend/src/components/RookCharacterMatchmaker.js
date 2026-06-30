import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Wand2 } from 'lucide-react';
import { CLASSES, RACES, BACKGROUNDS } from '../data/characterRules5e';
import { getSpellsForClass } from '../data/spellDatabase';
import { buildCreatorEquipmentPayload } from '../utils/creatorEquipmentPayload';
import './FullCharacterCreatorV2.css';

export const MATCH_ARCHETYPES = [
  { id: 'haunted-protector', title: 'The Haunted Protector', keywords: ['protect', 'guardian', 'haunted', 'dark', 'vengeance', 'batman', 'brooding'], classes: ['Paladin', 'Warlock', 'Fighter'], race: 'Human', background: 'Haunted One', playstyle: 'Protect allies, stand at the front, and bring a darker story hook.', difficulty: 'Balanced', magic: 'some', role: 'Frontline protector with story drama' },
  { id: 'arcane-trickster', title: 'The Sneaky Spellblade', keywords: ['sneaky', 'trick', 'steal', 'fast', 'clever', 'rogue', 'chaos'], classes: ['Rogue', 'Bard', 'Wizard'], race: 'Elf', background: 'Criminal', playstyle: 'Sneak, scout, solve problems, and use tricks instead of brute force.', difficulty: 'Balanced', magic: 'some', role: 'Scout, problem-solver, and chaos button' },
  { id: 'simple-warrior', title: 'The Reliable Frontliner', keywords: ['simple', 'hit', 'strong', 'tank', 'weapon', 'beginner', 'easy'], classes: ['Fighter', 'Barbarian'], race: 'Dwarf', background: 'Soldier', playstyle: 'Stay tough, hit hard, and keep turns easy to understand.', difficulty: 'Simple', magic: 'none', role: 'Straightforward frontline damage and defence' },
  { id: 'storm-mage', title: 'The Storm-Touched Mage', keywords: ['storm', 'lightning', 'magic', 'blast', 'power', 'wizard', 'mage'], classes: ['Sorcerer', 'Wizard', 'Warlock'], race: 'Human', background: 'Sage', playstyle: 'Use dramatic magic and ranged spells to control the fight.', difficulty: 'Complex', magic: 'yes', role: 'Ranged magical damage and spectacle' },
  { id: 'gentle-healer', title: 'The Gentle Healer', keywords: ['heal', 'kind', 'support', 'help', 'gentle', 'cleric', 'protect friends'], classes: ['Cleric', 'Druid', 'Bard'], race: 'Halfling', background: 'Acolyte', playstyle: 'Keep allies alive, support the party, and still have useful magic.', difficulty: 'Balanced', magic: 'yes', role: 'Healing, support, and calm table anchor' },
  { id: 'wild-shapeshifter', title: 'The Wild Shapeshifter', keywords: ['animal', 'nature', 'wild', 'transform', 'forest', 'druid'], classes: ['Druid', 'Ranger'], race: 'Elf', background: 'Outlander', playstyle: 'Use nature magic, survival skills, and animal-themed moments.', difficulty: 'Complex', magic: 'yes', role: 'Nature magic, utility, and flexible problem solving' },
  { id: 'smooth-talker', title: 'The Silver-Tongued Schemer', keywords: ['talk', 'charisma', 'funny', 'perform', 'music', 'lie', 'persuade', 'bard', 'villain'], classes: ['Bard', 'Rogue', 'Warlock'], race: 'Tiefling', background: 'Entertainer', playstyle: 'Talk your way through trouble and support allies with style.', difficulty: 'Balanced', magic: 'some', role: 'Face of the party, support, and social chaos' },
];

const abilityFocusByClass = { Fighter: 'strength', Barbarian: 'strength', Paladin: 'strength', Rogue: 'dexterity', Ranger: 'dexterity', Wizard: 'intelligence', Sorcerer: 'charisma', Warlock: 'charisma', Bard: 'charisma', Cleric: 'wisdom', Druid: 'wisdom' };
const filterOptions = ['fight', 'sneak', 'heal', 'protect', 'support', 'cause chaos'];

export function getRookCharacterMatches({ description = '', magic = 'not sure', complexity = 'balanced', role = '', preferredClass = '' } = {}) {
  const text = `${description} ${role} ${preferredClass}`.toLowerCase();
  const scored = MATCH_ARCHETYPES.map((a) => {
    let score = a.keywords.reduce((sum, k) => sum + (text.includes(k) ? 3 : 0), 0);
    if (preferredClass && a.classes.includes(preferredClass)) score += 8;
    if (magic !== 'not sure' && a.magic === magic) score += 4;
    if (complexity && a.difficulty.toLowerCase() === complexity) score += 3;
    return { ...a, score };
  }).sort((a, b) => b.score - a.score);
  const picked = [scored[0], scored.find((a) => a.difficulty === 'Simple') || scored[1], scored.find((a) => a.id !== scored[0].id && a.id !== (scored.find((x) => x.difficulty === 'Simple') || {}).id) || scored[2]];
  return picked.map((match, index) => ({ ...match, label: ['Best Match', 'Simpler Version', 'Wildcard'][index], suggestedClass: preferredClass && match.classes.includes(preferredClass) ? preferredClass : match.classes[0], sampleSpells: (getSpellsForClass(match.classes[0])?.cantrips || []).slice(0, 2).map(s => s.name), equipmentPreview: buildCreatorEquipmentPayload({ characterClass: match.classes[0], mode: 'recommended' })?.starting_equipment?.slice?.(0, 3) || [] }));
}

function safePreset(match, description) {
  return { source: 'rook-matchmaker', name: '', characterClass: CLASSES[match.suggestedClass] ? match.suggestedClass : 'Fighter', race: RACES[match.race] ? match.race : 'Human', background: BACKGROUNDS[match.background] ? match.background : 'Soldier', abilityFocus: abilityFocusByClass[match.suggestedClass] || 'strength', notes: `Matched from: ${description || match.title}` };
}

export default function RookCharacterMatchmaker() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [magic, setMagic] = useState('not sure');
  const [complexity, setComplexity] = useState('balanced');
  const [role, setRole] = useState('');
  const [preferredClass, setPreferredClass] = useState('');
  const matches = useMemo(() => getRookCharacterMatches({ description, magic, complexity, role, preferredClass }), [description, magic, complexity, role, preferredClass]);
  const openFull = (match) => navigate('/characters/new/full', { state: { creatorPreset: safePreset(match, description) } });

  return <main className="full-creator-page"><header className="full-creator-header"><button onClick={() => navigate('/characters/new/modes')} className="full-creator-back"><ArrowLeft size={18}/> Creation routes</button><div><p className="full-creator-eyebrow">Rook Character Matchmaker</p><h1>Describe your hero. Rook suggests a safe starter build.</h1><p>No external AI is used here. This MVP uses local rules and keyword matching, then opens Full Creator so you can review before saving.</p></div></header><section className="full-creator-layout"><article className="full-creator-panel"><div className="full-creator-section-title"><Search/><div><h2>What kind of hero do you want?</h2><p>Try “Batman but in D&D”, “magic but not too complicated”, or “protect people and hit things hard”.</p></div></div><label className="full-creator-wide-label"><span>Hero idea</span><textarea value={description} onChange={(e)=>setDescription(e.target.value)} rows={5} placeholder="I want to be creepy, mysterious, and useful outside combat" /></label><div className="full-creator-form-grid"><label><span>Magic</span><select value={magic} onChange={(e)=>setMagic(e.target.value)}><option>not sure</option><option value="yes">I want magic</option><option value="none">No magic</option><option value="some">Some magic</option></select></label><label><span>Complexity</span><select value={complexity} onChange={(e)=>setComplexity(e.target.value)}><option value="simple">Simple</option><option value="balanced">Balanced</option><option value="complex">Complex</option></select></label><label><span>Main role</span><select value={role} onChange={(e)=>setRole(e.target.value)}><option value="">Not sure</option>{filterOptions.map(o=><option key={o}>{o}</option>)}</select></label><label><span>Known class</span><select value={preferredClass} onChange={(e)=>setPreferredClass(e.target.value)}><option value="">No preference</option>{Object.keys(CLASSES).map(c=><option key={c}>{c}</option>)}</select></label></div></article><aside className="full-creator-preview"><h2>Rook’s 3 matches</h2>{matches.map((match)=><div key={match.label} className="full-creator-choice-block"><strong>{match.label}: {match.title}</strong><p>{match.suggestedClass} {match.race} · {match.background}</p><p>{match.playstyle}</p><p><b>Difficulty:</b> {match.difficulty}</p><p><b>Why it fits:</b> Keywords and filters point toward {match.role.toLowerCase()}.</p><p><b>Starting role:</b> {match.role}</p><button type="button" onClick={()=>openFull(match)} className="full-creator-primary"><Wand2 size={16}/> Use this character</button><button type="button" onClick={()=>openFull(match)} className="full-creator-secondary">Edit in Full Creator</button></div>)}</aside></section></main>;
}
