import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
      const res = await apiClient.get(`/character-templates`, { params: { ruleset_id: rulesetId } });
      setTemplates(res.data?.templates || []);
    };
    load().catch(() => toast.error('Failed to load templates'));
  }, [rulesetId]);

  const runMatch = async () => {
    setLoadingMatch(true);
    try {
      const res = await apiClient.post(`/character-templates/ai-match`, { ruleset_id: rulesetId, description });
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
      // Fetch full template details (with stats, skills, spells, etc.)
      const { data: full } = await apiClient.get(`/character-templates/${template.id}`);
      const abilities = full.ability_scores || {};
      const payload = {
        name: name.trim(),
        race: full.race || template.race,
        subrace: full.subrace || '',
        character_class: full.character_class || template.character_class,
        subclass: full.subclass || '',
        background: full.background || template.background || '',
        level: 1,
        alignment: full.alignment || 'Neutral',
        edition,
        ruleset_id: rulesetId,
        strength: abilities.strength ?? 10,
        dexterity: abilities.dexterity ?? 10,
        constitution: abilities.constitution ?? 10,
        intelligence: abilities.intelligence ?? 10,
        wisdom: abilities.wisdom ?? 10,
        charisma: abilities.charisma ?? 10,
        skill_proficiencies: full.skill_proficiencies || [],
        spells_known: (full.spells_known || []).map(s => typeof s === 'string' ? { name: s } : s),
        cantrips_known: (full.cantrips_known || []).map(s => typeof s === 'string' ? { name: s } : s),
      };
      const res = await apiClient.post(`/characters`, payload);
      toast.success('Premade character created');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character from template');
    } finally {
      setCreatingTemplateId('');
    }
  };

  const NAVY = '#1F1F23';
  const PANEL = '#27272B';
  const GOLD = '#7C3AED';
  const GOLD_BRIGHT = '#A78BFA';
  const TEXT = '#F8FAFC';
  const TEXT_MUTED = '#94A3B8';
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    background: NAVY, border: `1px solid ${GOLD}`,
    color: TEXT, fontSize: 14, outline: 'none'
  };

  return <div style={{ padding: 32, color: TEXT, background: NAVY, minHeight: '100vh' }}>
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <button onClick={() => navigate('/characters/new')} style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', marginBottom: 14, fontSize: 13 }}>← Back to Modes</button>
      <h1 style={{ fontSize: 28, color: GOLD, margin: 0 }}>Premade Characters</h1>
      <p style={{ color: TEXT_MUTED, marginTop: 4, marginBottom: 20, fontSize: 14 }}>
        Pick a ready-to-play hero. We'll apply their stats, skills, and spells in one click.
      </p>
      <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: TEXT_MUTED }}>Character Name
          <input placeholder='Enter name...' value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} data-testid="premade-name" />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ fontSize: 12, color: TEXT_MUTED }}>Edition
            <select value={edition} onChange={e => setEdition(e.target.value)} style={inputStyle} data-testid="premade-edition">
              <option value='2014'>2014 Rules</option>
              <option value='2024'>2024 Rules</option>
            </select>
          </label>
          <div />
        </div>
        <label style={{ fontSize: 12, color: TEXT_MUTED }}>AI Match — describe how you want to play
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder='e.g. "I want a sneaky character who talks their way out of trouble"' style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} data-testid="premade-description" />
        </label>
        <button onClick={runMatch} disabled={loadingMatch} data-testid="premade-match-btn"
          onMouseEnter={e => { if (!loadingMatch) e.currentTarget.style.background = GOLD_BRIGHT; }}
          onMouseLeave={e => { if (!loadingMatch) e.currentTarget.style.background = GOLD; }}
          style={{ padding: '10px 18px', borderRadius: 8, background: GOLD, border: `1px solid ${GOLD}`, color: NAVY, fontWeight: 700, cursor: loadingMatch ? 'not-allowed' : 'pointer', opacity: loadingMatch ? 0.6 : 1, alignSelf: 'flex-start', fontSize: 13 }}>
          {loadingMatch ? 'Matching…' : 'Find Best Match'}
        </button>
        {match?.best_match && (
          <div style={{ padding: 14, borderRadius: 10, background: PANEL, border: `1px solid ${GOLD}` }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Best Match</div>
            <div style={{ fontSize: 17, color: GOLD, fontWeight: 700 }}>
              {match.best_match.name} <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 400 }}>· {match.best_match.character_class}</span>
            </div>
            {match.rationale && <div style={{ fontSize: 13, color: TEXT, marginTop: 6, lineHeight: 1.5 }}>{match.rationale}</div>}
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 18, color: GOLD, marginBottom: 10, borderBottom: `1px solid ${GOLD}`, paddingBottom: 6 }}>
        All Templates
      </h2>
      {templates.length === 0 && <div style={{ color: TEXT_MUTED, padding: 20 }}>Loading templates…</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {templates.map(t => {
          const isBest = match?.best_match?.id === t.id;
          return (
            <div key={t.id} data-testid={`template-${t.id}`} style={{
              border: `1px solid ${isBest ? GOLD_BRIGHT : GOLD}`,
              boxShadow: isBest ? `0 0 0 2px rgba(124, 58, 237, 0.20)` : 'none',
              borderRadius: 10, padding: 14, background: PANEL,
              display: 'flex', flexDirection: 'column', gap: 6
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>{t.name}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.4, flex: 1 }}>{t.pitch}</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 0.5 }}>
                {t.character_class}{t.subrace ? ` · ${t.subrace} ${t.race}` : ` · ${t.race}`}{t.background ? ` · ${t.background}` : ''}
              </div>
              <button
                disabled={!!creatingTemplateId}
                onClick={() => createFromTemplate(t)}
                data-testid={`use-template-${t.id}`}
                onMouseEnter={e => { if (!creatingTemplateId) e.currentTarget.style.background = GOLD_BRIGHT; }}
                onMouseLeave={e => { if (!creatingTemplateId) e.currentTarget.style.background = GOLD; }}
                style={{ marginTop: 4, padding: '8px 12px', borderRadius: 6, background: GOLD, border: `1px solid ${GOLD}`, color: NAVY, fontWeight: 700, cursor: creatingTemplateId ? 'not-allowed' : 'pointer', fontSize: 12, opacity: creatingTemplateId && creatingTemplateId !== t.id ? 0.5 : 1 }}>
                {creatingTemplateId === t.id ? 'Creating…' : 'Use Template'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </div>;
}
