import React, { useEffect, useState } from 'react';
import { Save, Clipboard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';

const WORLD_SETTINGS = [
  ['custom', 'Custom setting'],
  ['high_fantasy', 'High fantasy'],
  ['classic_fantasy', 'Classic fantasy'],
  ['epic_fantasy', 'Epic fantasy'],
  ['gothic_horror', 'Gothic horror'],
  ['magipunk_noir', 'Magipunk / noir'],
  ['planar_adventure', 'Planar adventure'],
  ['fantasy_space', 'Fantasy space'],
];

const emptyOverview = {
  publicOverview: '',
  currentSituation: '',
  toneThemes: '',
  gmTruths: '',
  importParking: '',
};

const sectionMap = {
  publicOverview: 'Public Overview',
  currentSituation: 'Current Situation',
  toneThemes: 'Tone & Themes',
  gmTruths: 'GM Truths & Secrets',
  importParking: 'Import Parking',
};

function extractSection(content, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function parseOverview(content = '', worldNotes = '') {
  const hasStructuredSections = content.includes('## Public Overview') || content.includes('## Current Situation');
  if (!hasStructuredSections) {
    return {
      ...emptyOverview,
      publicOverview: content.trim(),
      importParking: worldNotes.trim(),
    };
  }

  return {
    publicOverview: extractSection(content, sectionMap.publicOverview),
    currentSituation: extractSection(content, sectionMap.currentSituation),
    toneThemes: extractSection(content, sectionMap.toneThemes),
    gmTruths: extractSection(content, sectionMap.gmTruths),
    importParking: extractSection(content, sectionMap.importParking),
  };
}

function serializeOverview(overview) {
  return [
    '# World Overview',
    '',
    '## Public Overview',
    overview.publicOverview?.trim() || '',
    '',
    '## Current Situation',
    overview.currentSituation?.trim() || '',
    '',
    '## Tone & Themes',
    overview.toneThemes?.trim() || '',
    '',
    '## GM Truths & Secrets',
    overview.gmTruths?.trim() || '',
    '',
    '## Import Parking',
    overview.importParking?.trim() || '',
  ].join('\n');
}

function serializeAIContext(overview) {
  return [
    'Tone & themes:',
    overview.toneThemes?.trim() || 'Not set',
    '',
    'Current situation:',
    overview.currentSituation?.trim() || 'Not set',
    '',
    'GM-only truths and secrets:',
    overview.gmTruths?.trim() || 'Not set',
    '',
    'Import parking / unsorted notes:',
    overview.importParking?.trim() || 'Not set',
  ].join('\n');
}

export default function CampaignSettingTab({ campaignId }) {
  const [overview, setOverview] = useState(emptyOverview);
  const [worldSetting, setWorldSetting] = useState('custom');
  const [availableSettings, setAvailableSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadOverview(); }, [campaignId]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const [settingRes, worldRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/setting`).catch(() => ({ data: {} })),
        apiClient.get(`/campaigns/${campaignId}/world-setting`).catch(() => ({ data: {} })),
      ]);

      const settingContent = settingRes.data?.content || '';
      const worldNotes = worldRes.data?.world_setting_notes || '';
      setOverview(parseOverview(settingContent, worldNotes));
      setWorldSetting(worldRes.data?.world_setting || 'custom');
      setAvailableSettings(Array.isArray(worldRes.data?.available_settings) ? worldRes.data.available_settings : []);
    } catch (error) {
      toast.error('Failed to load world overview');
    } finally {
      setLoading(false);
    }
  };

  const setField = (field, value) => setOverview(prev => ({ ...prev, [field]: value }));

  const saveOverview = async () => {
    try {
      setSaving(true);
      await Promise.all([
        apiClient.put(`/campaigns/${campaignId}/setting`, { content: serializeOverview(overview) }),
        apiClient.put(`/campaigns/${campaignId}/world-setting`, {
          world_setting: worldSetting,
          world_setting_notes: serializeAIContext(overview),
        }),
      ]);
      toast.success('World overview saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save world overview');
    } finally {
      setSaving(false);
    }
  };

  const copyOverview = async () => {
    try {
      await navigator.clipboard.writeText(serializeOverview(overview));
      toast.success('World overview copied');
    } catch {
      toast.error('Could not copy overview');
    }
  };

  if (loading) return <div style={loadingStyle}><div className="loading-spinner" /></div>;

  const settingOptions = availableSettings.length
    ? availableSettings.map(setting => [setting.id, `${setting.name}${setting.description ? ` - ${setting.description}` : ''}`])
    : WORLD_SETTINGS;

  return (
    <section style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>World Bible</p>
          <h2 style={titleStyle}>World Overview</h2>
          <p style={subtitleStyle}>A generic home for the campaign’s broad context. Put details into the most relevant reusable box later: locations, NPCs, powers, chronicle, handouts, or inventory.</p>
        </div>
        <div style={headerActionsStyle}>
          <Button type="button" onClick={loadOverview} style={secondaryButtonStyle}><RefreshCw size={16} /> Reload</Button>
          <Button type="button" onClick={copyOverview} style={secondaryButtonStyle}><Clipboard size={16} /> Copy</Button>
          <Button type="button" onClick={saveOverview} disabled={saving} style={primaryButtonStyle}><Save size={16} /> {saving ? 'Saving...' : 'Save Overview'}</Button>
        </div>
      </header>

      <section style={ruleStyle}>
        <p style={ruleLabelStyle}>Import rule</p>
        <p style={ruleTextStyle}>Do not create new campaign-specific boxes just to fit old notes. Paste unsorted material into Import Parking, then move each piece into an existing generic tool when it naturally belongs there.</p>
      </section>

      <div style={topGridStyle}>
        <label style={labelStyle}>
          World tone label
          <select value={worldSetting} onChange={(event) => setWorldSetting(event.target.value)} style={inputStyle}>
            {settingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <InfoCard title="Where content should go" items={['Places → Locations', 'People → NPCs & Figures', 'Gods/guilds/politics → Powers & Factions', 'Past events → Chronicle', 'Clues/reveals → Handouts & Secrets']} />
      </div>

      <div style={fieldGridStyle}>
        <OverviewField
          label="Public overview"
          help="Player-safe premise, broad world context, campaign pitch, and what everyone can know."
          value={overview.publicOverview}
          onChange={(value) => setField('publicOverview', value)}
          placeholder="What is this campaign about? What can players safely understand from the start?"
          tall
        />
        <OverviewField
          label="Current situation"
          help="What is happening now: active conflict, current arc, table focus, and immediate campaign pressure."
          value={overview.currentSituation}
          onChange={(value) => setField('currentSituation', value)}
          placeholder="What is currently happening in the campaign world?"
          tall
        />
        <OverviewField
          label="Tone & themes"
          help="The feel of the campaign: danger level, humour, horror, politics, exploration, rebuilding, mystery, etc."
          value={overview.toneThemes}
          onChange={(value) => setField('toneThemes', value)}
          placeholder="What should the campaign feel like at the table?"
        />
        <OverviewField
          label="GM truths & secrets"
          help="GM-only truth. Do not put player-facing handouts here; use Handouts & Secrets when it needs to be revealed."
          value={overview.gmTruths}
          onChange={(value) => setField('gmTruths', value)}
          placeholder="Hidden truths, spoilers, villain plans, secret causes, unrevealed lore."
        />
        <OverviewField
          label="Import parking"
          help="Temporary holding space for unsorted notes. Move things out once they clearly belong to Locations, NPCs, Powers, Chronicle, etc."
          value={overview.importParking}
          onChange={(value) => setField('importParking', value)}
          placeholder="Paste unsorted campaign material here first. Sort it later; do not create custom boxes just because the note exists."
          wide
          tall
        />
      </div>
    </section>
  );
}

function OverviewField({ label, help, value, onChange, placeholder, wide = false, tall = false }) {
  return (
    <label style={{ ...fieldStyle, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={fieldTopStyle}>{label}</span>
      <span style={helpStyle}>{help}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{ ...textareaStyle, minHeight: tall ? 160 : 120 }}
      />
    </label>
  );
}

function InfoCard({ title, items }) {
  return (
    <aside style={infoCardStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={infoListStyle}>{items.map(item => <span key={item} style={infoPillStyle}>{item}</span>)}</div>
    </aside>
  );
}

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const pageStyle = { display: 'grid', gap: 16, fontFamily: fontStack };
const loadingStyle = { minHeight: 240, display: 'grid', placeItems: 'center', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', background: '#3a3a3a', border: '1px solid rgba(255,255,255,0.16)', padding: 16, borderRadius: 0 };
const headerActionsStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' };
const eyebrowStyle = { margin: '0 0 5px', color: 'rgba(255,255,255,0.62)', fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: '#ffffff', fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1.02 };
const subtitleStyle = { margin: '7px 0 0', color: 'rgba(255,255,255,0.72)', fontSize: 14, lineHeight: 1.45, maxWidth: 780 };
const primaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: '#d00000', color: '#ffffff', padding: '0 14px', fontWeight: 950, display: 'inline-flex', alignItems: 'center', gap: 8 };
const secondaryButtonStyle = { minHeight: 42, border: 0, borderRadius: 0, background: '#2f2f2f', color: '#ffffff', padding: '0 14px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 8 };
const ruleStyle = { background: '#2f2f2f', borderLeft: '6px solid #d00000', padding: 14, display: 'grid', gap: 4 };
const ruleLabelStyle = { margin: 0, color: '#ffffff', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 950 };
const ruleTextStyle = { margin: 0, color: 'rgba(255,255,255,0.72)', lineHeight: 1.45, fontSize: 14 };
const topGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(220px, 360px) minmax(0, 1fr)', gap: 14 };
const labelStyle = { display: 'grid', gap: 7, color: 'rgba(255,255,255,0.62)', fontSize: 12, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { minHeight: 44, background: '#242424', border: '1px solid rgba(255,255,255,0.18)', color: '#ffffff', borderRadius: 0, padding: '0 11px', fontFamily: fontStack, fontWeight: 800, outline: 'none', colorScheme: 'dark' };
const infoCardStyle = { background: '#3a3a3a', border: '1px solid rgba(255,255,255,0.16)', padding: 14 };
const sectionTitleStyle = { margin: '0 0 10px', color: '#ffffff', fontSize: 17, fontWeight: 950 };
const infoListStyle = { display: 'flex', gap: 8, flexWrap: 'wrap' };
const infoPillStyle = { background: '#242424', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.14)', padding: '8px 10px', fontSize: 12, fontWeight: 850 };
const fieldGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 };
const fieldStyle = { display: 'grid', gap: 7, background: '#3a3a3a', border: '1px solid rgba(255,255,255,0.16)', padding: 14 };
const fieldTopStyle = { color: '#ffffff', fontSize: 15, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' };
const helpStyle = { color: 'rgba(255,255,255,0.62)', lineHeight: 1.4, fontSize: 13 };
const textareaStyle = { width: '100%', background: '#242424', border: '1px solid rgba(255,255,255,0.18)', color: '#ffffff', borderRadius: 0, padding: 12, resize: 'vertical', fontFamily: fontStack, lineHeight: 1.45, outline: 'none', colorScheme: 'dark' };
