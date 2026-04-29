import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';

export default function PremadeCharacterBuilder() {
  const navigate = useNavigate();
  const [edition, setEdition] = useState('2014');
  const [rulesetId, setRulesetId] = useState('dnd5e_2014');
  const [templates, setTemplates] = useState([]);
  const [description, setDescription] = useState('');
  const [match, setMatch] = useState(null);
  const [name, setName] = useState('');
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [creatingTemplateId, setCreatingTemplateId] = useState('');

  useEffect(() => {
    const next = edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014';
    setRulesetId(next);
  }, [edition]);

  useEffect(() => {
    const load = async () => {
      const res = await axios.get(`${API_BASE}/character-templates`, { params: { ruleset_id: rulesetId } });
      setTemplates(res.data?.templates || []);
    };
    load().catch(() => toast.error('Failed to load templates'));
  }, [rulesetId]);

  const runMatch = async () => {
    setLoadingMatch(true);
    try {
      const res = await axios.post(`${API_BASE}/character-templates/ai-match`, { ruleset_id: rulesetId, description });
      setMatch(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to match template');
    } finally {
      setLoadingMatch(false);
    }
  };

  const createFromTemplate = async (template) => {
    if (!name.trim()) return toast.error('Enter character name first');
    setCreatingTemplateId(template.id);
    try {
      const payload = {
        name: name.trim(),
        race: template.race,
        character_class: template.character_class,
        background: template.background || '',
        level: 1,
        alignment: 'Neutral',
        edition,
        ruleset_id: rulesetId,
        strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8
      };
      const res = await axios.post(`${API_BASE}/characters`, payload);
      toast.success('Premade character created');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character from template');
    } finally {
      setCreatingTemplateId('');
    }
  };

  return <div style={{ padding: 24, color: '#F8FAFC', background: '#0F0A1E', minHeight: '100vh' }}>
    <h1>Premade Characters</h1>
    <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
      <input placeholder='Character Name' value={name} onChange={(e) => setName(e.target.value)} />
      <select value={edition} onChange={e => setEdition(e.target.value)}><option value='2014'>2014 Rules</option><option value='2024'>2024 Rules</option></select>
      <textarea placeholder='AI Match: describe how you want to play...' value={description} onChange={e => setDescription(e.target.value)} />
      <button onClick={runMatch} disabled={loadingMatch}>{loadingMatch ? 'Matching...' : 'Find Best Match'}</button>
      {match?.best_match && <div>Best match: <strong>{match.best_match.name}</strong></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {templates.map(t => <div key={t.id} style={{ border: '1px solid #533', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>{t.name}</div>
          <div style={{ color: '#94A3B8', fontSize: 13 }}>{t.pitch}</div>
          <div style={{ fontSize: 12, margin: '8px 0' }}>{t.character_class} • {t.race}</div>
          <button disabled={!!creatingTemplateId} onClick={() => createFromTemplate(t)}>
            {creatingTemplateId === t.id ? 'Creating...' : 'Use Template'}
          </button>
        </div>)}
      </div>
    </div>
  </div>;
}
