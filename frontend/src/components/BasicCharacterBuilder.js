import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { RACES, CLASSES } from '../data/characterRules5e';
import { API_BASE } from '../lib/api';

const defaultsByClass = {
  Fighter: { strength: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, intelligence: 8 },
  Wizard: { intelligence: 15, constitution: 14, dexterity: 13, wisdom: 12, charisma: 10, strength: 8 },
  Rogue: { dexterity: 15, constitution: 14, intelligence: 13, charisma: 12, wisdom: 10, strength: 8 }
};

export default function BasicCharacterBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [characterClass, setCharacterClass] = useState('Fighter');
  const [race, setRace] = useState('Human');
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  const statBlock = useMemo(() => defaultsByClass[characterClass] || defaultsByClass.Fighter, [characterClass]);

  const submit = async () => {
    if (!name.trim()) return toast.error('Name is required');
    const cls = CLASSES[characterClass];
    const raceData = RACES[race];
    const conMod = Math.floor(((statBlock.constitution || 10) - 10) / 2);
    const maxHP = Math.max(1, (cls?.hitDie || 8) + conMod);

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        creation_mode: 'basic',
        character_class: characterClass,
        race,
        level: Number(level),
        background: 'Acolyte',
        alignment: 'Neutral',
        edition,
        ruleset_id: edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
        edition: '2014',
        ...statBlock,
        max_hit_points: maxHP,
        skill_proficiencies: (cls?.skillChoices || []).slice(0, cls?.skillCount || 2),
        saving_throw_proficiencies: cls?.savingThrows || [],
        armor_proficiencies: cls?.armorProficiencies || [],
        weapon_proficiencies: cls?.weaponProficiencies || [],
        languages: raceData?.languages?.filter(l => !l.includes('choice')) || ['Common'],
        class_features: (cls?.features?.[1] || []).map(name => ({ name, description: `${characterClass} feature` })),
        racial_traits: (raceData?.traits || []).map(name => ({ name, description: name }))
      };
      const res = await axios.post(`${API_BASE}/characters`, payload);
      toast.success('Basic character created!');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character');
    } finally {
      setLoading(false);
    }
  };

  return <div style={{ padding: 24, color: '#F8FAFC', background: '#0F0A1E', minHeight: '100vh' }}>
    <h1>Basic Build</h1>
    <p style={{ color: '#94A3B8' }}>Choose only the essentials. We auto-fill the rest.</p>
    <div style={{ maxWidth: 520, display: 'grid', gap: 12 }}>
      <input placeholder='Character Name' value={name} onChange={e => setName(e.target.value)} />
      <select value={level} onChange={e => setLevel(Number(e.target.value))}>{Array.from({ length: 20 }, (_, i) => i + 1).map(l => <option key={l} value={l}>{l}</option>)}</select>
      <select value={characterClass} onChange={e => setCharacterClass(e.target.value)}>{Object.keys(CLASSES).map(c => <option key={c} value={c}>{c}</option>)}</select>
      <select value={race} onChange={e => setRace(e.target.value)}>{Object.keys(RACES).map(r => <option key={r} value={r}>{r}</option>)}</select>
      <button disabled={loading} onClick={submit}>{loading ? 'Creating...' : 'Create Character'}</button>
    </div>
  </div>;
}
