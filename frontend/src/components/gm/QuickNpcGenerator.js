import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Dices, Link2, RefreshCw, Save, Shield, Sparkles, Sword, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { generateCombatReadyNpc, NPC_COMBAT_PRESETS, npcToClipboardText } from '@/lib/npcStatBlockFactory';
import {
  buildRookieRelationshipPayload,
  generateRelatedNpcName,
  generateRookieName,
  ROOKIE_ANCESTRY_OPTIONS,
  ROOKIE_RELATIONSHIPS,
  relationshipDescription,
} from '@/lib/rookieEngine';

export default function QuickNpcGenerator({ theme = {}, campaignId }) {
  const [npc, setNpc] = useState(null);
  const [presetId, setPresetId] = useState('commoner');
  const [race, setRace] = useState('');
  const [gender, setGender] = useState('any');
  const [mode, setMode] = useState('quick');
  const [relationship, setRelationship] = useState('sibling');
  const [relatedNpcId, setRelatedNpcId] = useState('');
  const [campaignNpcs, setCampaignNpcs] = useState([]);
  const [generationMeta, setGenerationMeta] = useState(null);
  const [saving, setSaving] = useState(false);

  const selectedRelatedNpc = useMemo(
    () => campaignNpcs.find(item => item.id === relatedNpcId) || null,
    [campaignNpcs, relatedNpcId]
  );

  const loadCampaignNpcs = useCallback(async () => {
    if (!campaignId) return;
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/npcs`);
      const list = Array.isArray(response.data) ? response.data : [];
      setCampaignNpcs(list);
      setRelatedNpcId(prev => prev && list.some(item => item.id === prev) ? prev : '');
    } catch {
      setCampaignNpcs([]);
    }
  }, [campaignId]);

  useEffect(() => { loadCampaignNpcs(); }, [loadCampaignNpcs]);

  const generate = useCallback(() => {
    if (mode === 'related' && !selectedRelatedNpc) {
      toast.error('Choose the NPC this person is related to first');
      return;
    }

    const randomAncestry = ROOKIE_ANCESTRY_OPTIONS[Math.floor(Math.random() * ROOKIE_ANCESTRY_OPTIONS.length)]?.id || 'human';
    const generatedName = mode === 'related'
      ? generateRelatedNpcName({
          sourceNpc: selectedRelatedNpc,
          relationship,
          gender,
          ancestry: race,
        })
      : generateRookieName({
          ancestry: race || randomAncestry,
          gender,
        });

    const nextNpc = generateCombatReadyNpc({
      presetId,
      race: generatedName.race,
      name: generatedName.fullName,
    });

    if (mode === 'related' && selectedRelatedNpc) {
      const relationNote = relationshipDescription(relationship, selectedRelatedNpc, generatedName.fullName);
      nextNpc.notes = `${nextNpc.notes} ${relationNote}`.trim();
      nextNpc.backstory = `${nextNpc.backstory} ${relationNote}`.trim();
      if (!nextNpc.location && selectedRelatedNpc.location) nextNpc.location = selectedRelatedNpc.location;
    }

    setNpc(nextNpc);
    setGenerationMeta(generatedName);
  }, [gender, mode, presetId, race, relationship, selectedRelatedNpc]);

  const copyToClipboard = () => {
    if (!npc) return;
    navigator.clipboard.writeText(npcToClipboardText(npc));
    toast.success('Combat-ready NPC copied to clipboard');
  };

  const saveNpc = async () => {
    if (!npc || !campaignId) {
      toast.error('Generate an NPC inside a campaign first');
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/npcs`, npc);
      const savedNpc = response.data;
      setNpc(savedNpc);

      if (mode === 'related' && selectedRelatedNpc) {
        const relationshipPayload = buildRookieRelationshipPayload({
          sourceNpc: selectedRelatedNpc,
          targetNpc: savedNpc,
          relationship,
        });
        if (relationshipPayload) {
          try {
            await apiClient.post(`/campaigns/${campaignId}/npc-relationships`, relationshipPayload);
            toast.success(`${savedNpc.name} saved and linked to ${selectedRelatedNpc.name}`);
          } catch (relationshipError) {
            toast.info(`${savedNpc.name} was saved, but the relationship could not be linked automatically`, {
              description: relationshipError?.response?.data?.detail || 'You can add the relationship manually later.',
            });
          }
        }
      } else {
        toast.success(`${savedNpc.name || npc.name} saved as combat-ready NPC`);
      }
      await loadCampaignNpcs();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save NPC');
    } finally {
      setSaving(false);
    }
  };

  const textPrimary = theme.text?.primary || theme.text || '#fff';
  const textMuted = theme.text?.muted || theme.muted || 'rgba(255,255,255,0.58)';
  const textSecondary = theme.text?.secondary || theme.soft || 'rgba(255,255,255,0.74)';
  const panelBackground = theme.bg?.card || theme.card || '#3a3a3a';
  const surfaceBackground = theme.bg?.primary || theme.bg || '#242424';
  const accent = theme.accent?.gm || theme.accent?.primary || theme.primary || '#d00000';
  const border = theme.border || 'rgba(255,255,255,0.16)';

  const labelStyle = { fontSize: '10px', fontWeight: 900, color: textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 };
  const inputStyle = { minHeight: 36, width: '100%', background: surfaceBackground, border: `1px solid ${border}`, color: textPrimary, padding: '0 10px', borderRadius: 0 };
  const panelStyle = { background: panelBackground, border: `1px solid ${border}`, borderLeft: `6px solid ${accent}`, padding: 14, display: 'grid', gap: 12 };
  const valueStyle = { fontSize: 13, color: textSecondary, lineHeight: 1.45 };

  return (
    <div data-testid="quick-npc-generator" style={{ display: 'grid', gap: 12 }}>
      <section style={{ ...panelStyle, borderLeftWidth: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={17} color={accent} />
            <strong style={{ color: textPrimary, fontSize: 15 }}>Rookie Engine</strong>
            <span style={{ color: textMuted, fontSize: 11 }}>Local · no AI call</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => { setMode('quick'); setNpc(null); }} style={modeButtonStyle(mode === 'quick', accent, panelBackground, textPrimary, border)}><UserPlus size={14} /> Quick NPC</button>
            <button type="button" onClick={() => { setMode('related'); setNpc(null); }} style={modeButtonStyle(mode === 'related', accent, panelBackground, textPrimary, border)}><Link2 size={14} /> Related NPC</button>
          </div>
        </div>

        {mode === 'related' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
            <label><div style={labelStyle}>Related to</div><select value={relatedNpcId} onChange={(event) => setRelatedNpcId(event.target.value)} style={inputStyle}><option value="">Choose NPC…</option>{campaignNpcs.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><div style={labelStyle}>Relationship</div><select value={relationship} onChange={(event) => setRelationship(event.target.value)} style={inputStyle}>{ROOKIE_RELATIONSHIPS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <label><div style={labelStyle}>NPC role</div><select value={presetId} onChange={(event) => setPresetId(event.target.value)} style={inputStyle}>{NPC_COMBAT_PRESETS.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
          <label><div style={labelStyle}>Ancestry</div><select value={race} onChange={(event) => setRace(event.target.value)} style={inputStyle}><option value="">{mode === 'related' ? 'Use related NPC / random' : 'Random'}</option>{ROOKIE_ANCESTRY_OPTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label><div style={labelStyle}>Name style</div><select value={gender} onChange={(event) => setGender(event.target.value)} style={inputStyle}><option value="any">Any</option><option value="male">Masculine</option><option value="female">Feminine</option><option value="neutral">Neutral</option></select></label>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button data-testid="generate-npc-btn" onClick={generate} style={mainButtonStyle(accent)}>{npc ? <RefreshCw size={14} /> : <Sparkles size={14} />} {npc ? 'Reroll NPC' : mode === 'related' ? 'Generate Related NPC' : 'Generate NPC'}</button>
          {npc && <button data-testid="copy-npc-btn" onClick={copyToClipboard} style={secondaryButtonStyle(panelBackground, textPrimary)}><Copy size={14} /> Copy</button>}
          {npc && <button data-testid="save-combat-npc-btn" onClick={saveNpc} disabled={saving} style={mainButtonStyle(accent)}><Save size={14} /> {saving ? 'Saving…' : mode === 'related' ? 'Save & Link' : 'Save NPC'}</button>}
        </div>
      </section>

      {npc && (
        <article data-testid="npc-card" style={panelStyle}>
          <header style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, color: textPrimary }}>{npc.name}</div>
              <div style={{ fontSize: 12, color: accent, fontWeight: 900 }}>{npc.race} {npc.role} · Level {npc.level}</div>
              {mode === 'related' && selectedRelatedNpc && <div style={{ marginTop: 4, color: textSecondary, fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}><Users size={13} /> {relationshipDescription(relationship, selectedRelatedNpc, npc.name)}</div>}
              {generationMeta && <div style={{ marginTop: 4, color: textMuted, fontSize: 11 }}>{generationMeta.generationMethod === 'blended' ? 'Blended name' : 'Curated name'}{generationMeta.inheritedFamilyName ? ' · family name inherited' : ''}</div>}
            </div>
            <Dices size={18} color={textMuted} />
          </header>

          <div style={statStripStyle}>
            <Stat icon={Shield} label="AC" value={npc.ac} />
            <Stat icon={Dices} label="HP" value={npc.hp} />
            <Stat icon={Sword} label="PB" value={`+${npc.proficiency_bonus}`} />
            <Stat icon={Dices} label="Speed" value={npc.speed} />
          </div>

          <AbilityGrid stats={npc.stats} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <section><div style={labelStyle}>Skills</div><div style={valueStyle}>{(npc.skills || []).join(', ') || 'None'}</div></section>
            <section><div style={labelStyle}>Saving throws</div><div style={valueStyle}>{(npc.saving_throws || []).join(', ') || 'None'}</div></section>
          </div>

          <section><div style={labelStyle}>Attacks</div><div style={{ display: 'grid', gap: 6 }}>{(npc.attacks || []).map((attack, index) => <div key={`${attack.name}-${index}`} style={rowStyle}><strong>{attack.name}</strong><span>{attack.bonus ? `${attack.bonus} · ` : ''}{attack.damage || attack.notes}{attack.damage && attack.notes ? ` · ${attack.notes}` : ''}</span></div>)}</div></section>
          <section><div style={labelStyle}>Abilities</div><div style={{ display: 'grid', gap: 6 }}>{(npc.abilities || []).map((ability, index) => <div key={`${ability.name}-${index}`} style={rowStyle}><strong>{ability.name}</strong><span>{ability.description}</span></div>)}</div></section>
          {npc.spells && <section><div style={labelStyle}>Spells</div><div style={valueStyle}>DC {npc.spells.spell_save_dc}, attack +{npc.spells.spell_attack_bonus}. {(npc.spells.cantrips || []).join(', ')}. {(npc.spells.known_spells || []).join(', ')}</div></section>}
          <section><div style={labelStyle}>GM notes</div><div style={valueStyle}>{npc.description} {npc.backstory}</div></section>
        </article>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div style={statBoxStyle}><Icon size={14} /><strong>{value}</strong><span>{label}</span></div>;
}

function AbilityGrid({ stats = {} }) {
  const abilities = [['STR', stats.strength], ['DEX', stats.dexterity], ['CON', stats.constitution], ['INT', stats.intelligence], ['WIS', stats.wisdom], ['CHA', stats.charisma]];
  return <div style={abilityGridStyle}>{abilities.map(([label, value]) => <div key={label} style={abilityStyle}><span>{label}</span><strong>{value}</strong><small>{Math.floor(((Number(value) || 10) - 10) / 2) >= 0 ? '+' : ''}{Math.floor(((Number(value) || 10) - 10) / 2)}</small></div>)}</div>;
}

const mainButtonStyle = (accent) => ({ minHeight: 38, border: 0, background: accent, color: '#fff', padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 950, cursor: 'pointer', borderRadius: 0 });
const secondaryButtonStyle = (background, color) => ({ minHeight: 38, border: 0, background, color, padding: '0 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontWeight: 900, cursor: 'pointer', borderRadius: 0 });
const modeButtonStyle = (active, accent, background, color, border) => ({ minHeight: 32, border: `1px solid ${active ? accent : border}`, background: active ? accent : background, color, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer', borderRadius: 0, fontSize: 12 });
const statStripStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 8 };
const statBoxStyle = { display: 'grid', gap: 3, alignItems: 'center', justifyItems: 'center', background: '#242424', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', padding: 9, minHeight: 72 };
const abilityGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(58px, 1fr))', gap: 6, overflowX: 'auto' };
const abilityStyle = { display: 'grid', gap: 2, textAlign: 'center', background: '#242424', border: '1px solid rgba(255,255,255,0.16)', padding: 7, color: '#fff' };
const rowStyle = { display: 'grid', gap: 2, background: '#242424', borderLeft: '5px solid #d00000', padding: 8, color: '#fff', fontSize: 12 };
