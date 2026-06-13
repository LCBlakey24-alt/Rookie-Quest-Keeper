import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';

const CLASS_OPTIONS = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
const GENRE_OPTIONS = [
  ['fantasy', 'Fantasy'],
  ['medieval', 'Medieval'],
  ['sci_fi', 'Sci-fi'],
  ['modern', 'Modern'],
  ['horror', 'Horror'],
  ['custom', 'Custom'],
];

function toForm(campaign = {}) {
  return {
    name: campaign.name || '',
    description: campaign.description || '',
    system: campaign.system || '5e 2024 Compatible',
    rules_edition: campaign.rules_edition || '2024',
    world_name: campaign.world_name || '',
    world_genre: campaign.world_genre || 'fantasy',
    world_setting: campaign.world_setting || 'custom',
    world_setting_notes: campaign.world_setting_notes || '',
    allow_exploding_dice: Boolean(campaign.allow_exploding_dice),
    allow_epic_levels: Boolean(campaign.allow_epic_levels),
    max_character_level: campaign.max_character_level || 20,
    available_classes: Array.isArray(campaign.available_classes) ? campaign.available_classes : [],
  };
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
      toast.error(error?.response?.data?.detail || 'Failed to load campaign rules');
    } finally {
      setLoading(false);
    }
  };

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

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
    try {
      setSaving(true);
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        world_name: form.world_name.trim(),
        system: form.rules_edition === '2024' ? '5e 2024 Compatible' : '5e 2014 Compatible',
        max_character_level: form.allow_epic_levels ? Number(form.max_character_level) || 20 : 20,
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

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Campaign Setup</p>
          <h2 style={titleStyle}>Table rules & player build locks</h2>
          <p style={subtitleStyle}>Keep the important campaign decisions here: edition, genre, optional rules, max level, and which classes players can use.</p>
        </div>
        <Button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Setup'}</Button>
      </header>

      <div style={gridStyle}>
        <label style={labelStyle}>Campaign name<input value={form.name} onChange={e => setField('name', e.target.value)} style={inputStyle} /></label>
        <label style={labelStyle}>World name<input value={form.world_name} onChange={e => setField('world_name', e.target.value)} placeholder="e.g. Veyr" style={inputStyle} /></label>
        <label style={labelStyle}>Genre<select value={form.world_genre} onChange={e => setField('world_genre', e.target.value)} style={inputStyle}>{GENRE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label style={labelStyle}>Rules edition<select value={form.rules_edition} onChange={e => setField('rules_edition', e.target.value)} style={inputStyle}><option value="2024">2024 rules</option><option value="2014">2014 rules</option></select></label>
      </div>

      <div style={toggleGridStyle}>
        <label style={toggleStyle}><input type="checkbox" checked={form.allow_exploding_dice} onChange={e => setField('allow_exploding_dice', e.target.checked)} /><span><strong>Exploding dice</strong><small>Non-d20 dice explode when they roll maximum.</small></span></label>
        <label style={toggleStyle}><input type="checkbox" checked={form.allow_epic_levels} onChange={e => setField('allow_epic_levels', e.target.checked)} /><span><strong>Beyond level 20</strong><small>Allow characters to keep multiclassing past level 20.</small></span></label>
        <label style={labelStyle}>Max character level<input type="number" min="1" max="60" disabled={!form.allow_epic_levels} value={form.max_character_level} onChange={e => setField('max_character_level', e.target.value)} style={inputStyle} /></label>
      </div>

      <label style={labelStyle}>Campaign pitch<textarea value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Short pitch players see/understand" style={{ ...inputStyle, minHeight: 86, resize: 'vertical' }} /></label>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <h3 style={sectionTitleStyle}>Allowed classes</h3>
          <p style={subtitleStyle}>Leave every class unticked to allow all classes. Tick classes only if this campaign has a restricted roster.</p>
        </div>
        <div style={classGridStyle}>{CLASS_OPTIONS.map(className => <label key={className} style={classPillStyle(form.available_classes.includes(className))}><input type="checkbox" checked={form.available_classes.includes(className)} onChange={() => toggleClass(className)} />{className}</label>)}</div>
      </section>
    </section>
  );
}

const pageStyle = { display: 'grid', gap: 14 };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, background: 'rgba(15,23,42,0.84)', border: '1px solid rgba(124,58,237,0.32)', padding: 16, borderRadius: 16 };
const eyebrowStyle = { margin: '0 0 5px', color: '#A78BFA', fontSize: 11, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: '#FFFFFF', fontSize: 'clamp(21px, 2vw, 28px)', fontWeight: 900 };
const subtitleStyle = { margin: '5px 0 0', color: '#CBD5E1', fontSize: 13, lineHeight: 1.45 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 };
const toggleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 };
const labelStyle = { display: 'grid', gap: 6, color: '#94A3B8', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 };
const inputStyle = { background: 'rgba(15,23,42,0.88)', color: '#F8FAFC', border: '1px solid rgba(148,163,184,0.24)', borderRadius: 12, padding: '11px 12px', outline: 'none', textTransform: 'none', letterSpacing: 0, fontWeight: 700 };
const toggleStyle = { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(15,23,42,0.84)', border: '1px solid rgba(124,58,237,0.26)', borderRadius: 14, padding: 12, color: '#E2E8F0', cursor: 'pointer' };
const cardStyle = { background: 'rgba(15,23,42,0.84)', border: '1px solid rgba(124,58,237,0.24)', borderRadius: 16, padding: 14 };
const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 };
const sectionTitleStyle = { color: '#FFFFFF', margin: 0, fontSize: 17, fontWeight: 900 };
const classGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 8 };
const classPillStyle = (active) => ({ display: 'inline-flex', alignItems: 'center', gap: 7, background: active ? 'rgba(124,58,237,0.20)' : 'rgba(15,23,42,0.86)', border: `1px solid ${active ? 'rgba(167,139,250,0.62)' : 'rgba(148,163,184,0.22)'}`, color: active ? '#FFFFFF' : '#CBD5E1', borderRadius: 999, padding: '8px 10px', fontSize: 12, fontWeight: 900, cursor: 'pointer' });
