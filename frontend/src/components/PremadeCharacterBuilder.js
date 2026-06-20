import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { buildCharacterCreationPayloadFromTemplate, buildRookSpellLoadoutsForTemplate, getCharacterCreationPayloadWarnings } from '@/data/characterCreationPayload';

const PREPARED_SPELLCASTERS = new Set(['Wizard', 'Cleric', 'Druid', 'Paladin']);
const PREMADE_SPELL_PLAN_OPTIONS = [
  { id: 'rook-balanced', label: 'Balanced' },
  { id: 'rook-healing', label: 'Healing' },
  { id: 'rook-power', label: 'Power' },
  { id: 'rook-support', label: 'Support' },
  { id: 'prepare-later', label: 'Prepare later' },
];

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
  const [spellPlans, setSpellPlans] = useState({});

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
      const spellLoadoutId = spellPlans[template.id] || 'rook-balanced';
      const payload = buildCharacterCreationPayloadFromTemplate(full, { name, edition, rulesetId, spellLoadoutId });
      const warnings = getCharacterCreationPayloadWarnings(payload);
      if (warnings.length) {
        toast.warning(`Created with ${warnings.length} sheet detail${warnings.length === 1 ? '' : 's'} to review.`);
      }
      const res = await apiClient.post(`/characters`, payload);
      toast.success('Premade character created');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to create character from template');
    } finally {
      setCreatingTemplateId('');
    }
  };

  const NAVY = 'var(--rq-bg-main)';
  const PANEL = 'var(--rq-bg-panel)';
  const GOLD = 'var(--rq-accent-primary)';
  const GOLD_BRIGHT = 'var(--rq-accent-hover)';
  const TEXT = 'var(--rq-text-primary)';
  const TEXT_MUTED = 'var(--rq-text-muted)';
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
        Type what you want, let Rook suggest a specific hero, then create a ready-to-play sheet with stats, skills, gear, and caster spell plans.
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
        <label style={{ fontSize: 12, color: TEXT_MUTED }}>Rook Suggestion — describe how you want to play
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder='e.g. "I want a sneaky character who talks their way out of trouble"' style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} data-testid="premade-description" />
        </label>
        <button onClick={runMatch} disabled={loadingMatch} data-testid="premade-match-btn"
          onMouseEnter={e => { if (!loadingMatch) e.currentTarget.style.background = GOLD_BRIGHT; }}
          onMouseLeave={e => { if (!loadingMatch) e.currentTarget.style.background = GOLD; }}
          style={{ padding: '10px 18px', borderRadius: 8, background: GOLD, border: `1px solid ${GOLD}`, color: NAVY, fontWeight: 700, cursor: loadingMatch ? 'not-allowed' : 'pointer', opacity: loadingMatch ? 0.6 : 1, alignSelf: 'flex-start', fontSize: 13 }}>
          {loadingMatch ? 'Matching…' : 'Suggest a Hero'}
        </button>
        {match?.best_match && (
          <div style={{ padding: 14, borderRadius: 10, background: PANEL, border: `1px solid ${GOLD}` }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Suggested Hero</div>
            <div style={{ fontSize: 17, color: GOLD, fontWeight: 700 }}>
              {match.best_match.name} <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 400 }}>· {match.best_match.character_class}</span>
            </div>
            {match.rationale && <div style={{ fontSize: 13, color: TEXT, marginTop: 6, lineHeight: 1.5 }}>{match.rationale}</div>}
            {PREPARED_SPELLCASTERS.has(match.best_match.character_class) && (
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 8 }}>
                Rook will also apply a prepared spell plan for this caster. You can pick Healing, Power, Support, Balanced, or prepare spells yourself after creation.
              </div>
            )}
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
          const canPrepareSpells = PREPARED_SPELLCASTERS.has(t.character_class);
          const selectedPlan = spellPlans[t.id] || 'rook-balanced';
          const previewTemplate = { ...t, level: 1 };
          const suggestedPlans = canPrepareSpells ? buildRookSpellLoadoutsForTemplate(previewTemplate) : [];
          return (
            <div key={t.id} data-testid={`template-${t.id}`} style={{
              border: `1px solid ${isBest ? GOLD_BRIGHT : GOLD}`,
              boxShadow: isBest ? `0 0 0 2px rgba(192, 138, 61, 0.20)` : 'none',
              borderRadius: 10, padding: 14, background: PANEL,
              display: 'flex', flexDirection: 'column', gap: 6
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>{t.name}</div>
              <div style={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.4, flex: 1 }}>{t.pitch}</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 0.5 }}>
                {t.character_class}{t.subrace ? ` · ${t.subrace} ${t.race}` : ` · ${t.race}`}{t.background ? ` · ${t.background}` : ''}
              </div>
              {canPrepareSpells && (
                <label style={{ display: 'grid', gap: 4, color: TEXT_MUTED, fontSize: 11 }}>
                  Prepared spell plan
                  <select
                    value={selectedPlan}
                    onChange={(event) => setSpellPlans(current => ({ ...current, [t.id]: event.target.value }))}
                    data-testid={`spell-plan-${t.id}`}
                    style={{ ...inputStyle, padding: '7px 9px', fontSize: 12 }}
                  >
                    {PREMADE_SPELL_PLAN_OPTIONS.map(option => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                  <span style={{ lineHeight: 1.35 }}>
                    {selectedPlan === 'prepare-later'
                      ? 'Create with caster basics, then prepare your own saved setup on the sheet.'
                      : (suggestedPlans.find(plan => plan.id === selectedPlan)?.description || 'Rook will choose a natural prepared spell setup.')}
                  </span>
                </label>
              )}
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
