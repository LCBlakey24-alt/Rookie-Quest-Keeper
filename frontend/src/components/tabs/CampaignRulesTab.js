import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';
import {
  buildCampaignFeel,
  buildWorldSettingNotes,
  campaignTypes,
  joinSettingOptions,
  rulesSystemOptions,
  tonePresets,
  toneSliders,
  visibilityOptions,
} from '@/components/dashboard/home/unifiedDashboardUtils';

const CLASS_OPTIONS = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

function toForm(campaign = {}) {
  const preset = campaign.tone_preset || 'heroic_fantasy';
  const fallbackSliders = tonePresets[preset]?.values || tonePresets.heroic_fantasy.values;
  return {
    name: campaign.name || '',
    description: campaign.description || '',
    system: campaign.system || rulesSystemOptions[campaign.rules_edition] || 'D&D 5e 2024 Compatible',
    rules_edition: campaign.rules_edition || '2024',
    world_name: campaign.world_name || '',
    campaign_type: campaign.campaign_type || campaign.world_genre || 'fantasy',
    world_setting: campaign.world_setting || 'custom',
    world_setting_notes: campaign.world_setting_notes || '',
    tone_preset: preset,
    tone_sliders: campaign.tone_sliders && typeof campaign.tone_sliders === 'object' ? campaign.tone_sliders : { ...fallbackSliders },
    campaign_feel: campaign.campaign_feel || '',
    starting_level: campaign.starting_level || 1,
    party_size: campaign.party_size || 4,
    visibility: campaign.visibility || 'private',
    join_mode: campaign.join_mode || 'gm_approval',
    join_code_enabled: campaign.join_code_enabled !== false,
    allow_exploding_dice: Boolean(campaign.allow_exploding_dice),
    allow_epic_levels: Boolean(campaign.allow_epic_levels),
    max_character_level: campaign.max_character_level || 20,
    available_classes: Array.isArray(campaign.available_classes) ? campaign.available_classes : [],
  };
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

export default function CampaignRulesTab({ campaignId }) {
  const [form, setForm] = useState(toForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCampaign(); }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/campaigns/${campaignId}`);
      setForm(toForm(response.data || {}));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load campaign setup');
    } finally {
      setLoading(false);
    }
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const applyPreset = (presetId) => {
    const preset = tonePresets[presetId];
    if (!preset) return;
    setForm(prev => ({ ...prev, tone_preset: presetId, tone_sliders: { ...preset.values } }));
  };

  const updateSlider = (sliderId, value) => {
    const nextValue = Number(value);
    setForm(prev => ({
      ...prev,
      tone_preset: 'custom',
      tone_sliders: {
        ...(prev.tone_sliders || tonePresets.custom.values),
        [sliderId]: Number.isFinite(nextValue) ? nextValue : 5,
      },
    }));
  };

  const toggleClass = (className) => {
    setForm(prev => {
      const current = new Set(prev.available_classes || []);
      if (current.has(className)) current.delete(className);
      else current.add(className);
      return { ...prev, available_classes: Array.from(current) };
    });
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Campaign name is required');
    const campaignFeel = buildCampaignFeel(form);
    const setupForm = { ...form, campaign_feel: campaignFeel };

    try {
      setSaving(true);
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        world_name: form.world_name.trim(),
        campaign_type: form.campaign_type,
        world_genre: form.campaign_type,
        world_setting: form.world_setting || 'custom',
        world_setting_notes: buildWorldSettingNotes(setupForm),
        system: form.rules_edition === '2024' ? 'D&D 5e 2024 Compatible' : 'D&D 5e 2014 Compatible',
        campaign_feel: campaignFeel,
        starting_level: clampNumber(form.starting_level, 1, 1, 20),
        party_size: clampNumber(form.party_size, 4, 1, 12),
        max_character_level: form.allow_epic_levels ? clampNumber(form.max_character_level, 20, 1, 60) : 20,
      };
      const response = await apiClient.put(`/campaigns/${campaignId}`, payload);
      setForm(toForm(response.data || payload));
      toast.success('Campaign setup saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save campaign setup');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rq-panel"><div className="loading-spinner" /></div>;

  const campaignFeel = buildCampaignFeel(form);

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Campaign Setup</p>
          <h2 style={titleStyle}>Rules, identity & campaign feel</h2>
          <p style={subtitleStyle}>This is the private setup context Rook can use when helping with the campaign. It is separate from player-facing campaign notes.</p>
        </div>
        <Button onClick={save} disabled={saving} style={primaryButtonStyle}>{saving ? 'Saving…' : 'Save Setup'}</Button>
      </header>

      <section style={cardStyle}>
        <SectionHeading title="Campaign Identity" eyebrow="Basic info" />
        <div style={gridStyle}>
          <SetupInput label="Campaign name" value={form.name} onChange={value => setField('name', value)} />
          <SetupInput label="World / setting name" value={form.world_name} onChange={value => setField('world_name', value)} placeholder="Optional" />
          <SetupSelect label="Rules / system" value={form.rules_edition} onChange={value => setField('rules_edition', value)} options={rulesSystemOptions} />
          <SetupSelect label="Campaign type" value={form.campaign_type} onChange={value => setField('campaign_type', value)} options={campaignTypes} />
          <SetupNumber label="Starting level" value={form.starting_level} min="1" max="20" onChange={value => setField('starting_level', value)} />
          <SetupNumber label="Party size" value={form.party_size} min="1" max="12" onChange={value => setField('party_size', value)} />
          <SetupSelect label="Visibility" value={form.visibility} onChange={value => setField('visibility', value)} options={visibilityOptions} />
          <SetupSelect label="Join setting" value={form.join_mode} onChange={value => setField('join_mode', value)} options={joinSettingOptions} />
        </div>
        <SetupTextarea label="Campaign description / GM notes" value={form.description} onChange={value => setField('description', value)} placeholder="Optional private notes about the campaign premise, rules, or table idea." />
      </section>

      <section style={cardStyle}>
        <SectionHeading title="Campaign Feel" eyebrow="Private Rook context" subtitle="Presets set the sliders. Moving a slider turns the feel into Custom." />
        <div style={presetGridStyle}>{Object.entries(tonePresets).map(([id, preset]) => <button key={id} type="button" onClick={() => applyPreset(id)} style={presetButtonStyle(form.tone_preset === id)}>{preset.label}</button>)}</div>
        <div style={sliderGridStyle}>{toneSliders.map(slider => {
          const value = Number(form.tone_sliders?.[slider.id] ?? 5);
          return <label key={slider.id} style={sliderStyle}><span style={sliderLabelsStyle}><em>{slider.left}</em><strong>{value}/10</strong><em>{slider.right}</em></span><input type="range" min="0" max="10" step="1" value={value} onChange={event => updateSlider(slider.id, event.target.value)} /></label>;
        })}</div>
        <div style={feelBoxStyle}>
          <p style={eyebrowStyle}>Generated private feel</p>
          <p style={subtitleStyle}>{campaignFeel}</p>
        </div>
      </section>

      <section style={cardStyle}>
        <SectionHeading title="Table Rules" eyebrow="Player build locks" subtitle="Leave every class unticked to allow all classes. Tick classes only if this campaign has a restricted roster." />
        <div style={toggleGridStyle}>
          <label style={toggleStyle}><input type="checkbox" checked={form.allow_exploding_dice} onChange={e => setField('allow_exploding_dice', e.target.checked)} /><span><strong>Exploding dice</strong><small>Non-d20 dice explode when they roll maximum.</small></span></label>
          <label style={toggleStyle}><input type="checkbox" checked={form.allow_epic_levels} onChange={e => setField('allow_epic_levels', e.target.checked)} /><span><strong>Beyond level 20</strong><small>Allow characters to keep multiclassing past level 20.</small></span></label>
          <SetupNumber label="Max character level" value={form.max_character_level} min="1" max="60" disabled={!form.allow_epic_levels} onChange={value => setField('max_character_level', value)} />
        </div>
        <div style={classGridStyle}>{CLASS_OPTIONS.map(className => <label key={className} style={classPillStyle(form.available_classes.includes(className))}><input type="checkbox" checked={form.available_classes.includes(className)} onChange={() => toggleClass(className)} />{className}</label>)}</div>
      </section>
    </section>
  );
}

function SectionHeading({ eyebrow, title, subtitle }) {
  return <div style={sectionHeaderStyle}><div><p style={eyebrowStyle}>{eyebrow}</p><h3 style={sectionTitleStyle}>{title}</h3>{subtitle && <p style={subtitleStyle}>{subtitle}</p>}</div></div>;
}

function SetupInput({ label, value, onChange, placeholder = '' }) {
  return <label style={labelStyle}>{label}<input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={inputStyle} /></label>;
}

function SetupNumber({ label, value, onChange, min, max, disabled = false }) {
  return <label style={labelStyle}>{label}<input type="number" min={min} max={max} disabled={disabled} value={value} onChange={event => onChange(event.target.value)} style={inputStyle} /></label>;
}

function SetupTextarea({ label, value, onChange, placeholder = '' }) {
  return <label style={labelStyle}>{label}<textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={{ ...inputStyle, minHeight: 86, resize: 'vertical' }} /></label>;
}

function SetupSelect({ label, value, onChange, options }) {
  return <label style={labelStyle}>{label}<select value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>{Object.entries(options).map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

const panelBackground = 'linear-gradient(var(--rq-card, #1b0b2d), var(--rq-card, #1b0b2d)) padding-box, var(--rq-sunset-gradient, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542)) border-box';
const pageStyle = { display: 'grid', gap: 12 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', background: panelBackground, border: '1px solid transparent', borderRadius: 10, padding: 16, color: '#ffffff' };
const eyebrowStyle = { margin: '0 0 5px', color: '#ffffff', opacity: 0.84, fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: '#ffffff', fontFamily: 'var(--rq-heading-font, Cinzel, Georgia, serif)', fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, lineHeight: 1.05 };
const subtitleStyle = { margin: '5px 0 0', color: '#ffffff', fontSize: 13, lineHeight: 1.45 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 };
const toggleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 12 };
const labelStyle = { display: 'grid', gap: 6, color: '#ffffff', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6 };
const inputStyle = { width: '100%', background: '#0d0618', color: '#ffffff', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, padding: '11px 12px', outline: 'none', textTransform: 'none', letterSpacing: 0, fontWeight: 700 };
const toggleStyle = { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12, color: '#ffffff', cursor: 'pointer' };
const cardStyle = { display: 'grid', gap: 12, background: panelBackground, border: '1px solid transparent', borderRadius: 10, padding: 14, color: '#ffffff' };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' };
const sectionTitleStyle = { color: '#ffffff', margin: 0, fontFamily: 'var(--rq-heading-font, Cinzel, Georgia, serif)', fontSize: 21, fontWeight: 700 };
const primaryButtonStyle = { background: 'var(--rq-sunset-gradient, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542))', color: '#ffffff', border: '1px solid transparent', borderRadius: 8, fontWeight: 900 };
const presetGridStyle = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const presetButtonStyle = (active) => ({ minHeight: 36, background: active ? 'var(--rq-sunset-gradient, linear-gradient(135deg, #7357ff, #d84df1, #ff4f81, #ff9542))' : '#13081f', color: '#ffffff', border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.16)', borderRadius: 8, padding: '0 11px', fontWeight: 900, cursor: 'pointer' });
const sliderGridStyle = { display: 'grid', gap: 9 };
const sliderStyle = { display: 'grid', gap: 6, padding: 10, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8 };
const sliderLabelsStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: 8, alignItems: 'center', color: '#ffffff' };
const feelBoxStyle = { background: '#13081f', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 12 };
const classGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 8 };
const classPillStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 7, background: active ? 'rgba(255,79,129,0.16)' : '#0d0618', border: `1px solid ${active ? 'rgba(255,149,66,0.45)' : 'rgba(255,255,255,0.14)'}`, color: '#ffffff', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 900, cursor: 'pointer' });
