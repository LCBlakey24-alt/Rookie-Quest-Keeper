import React, { useEffect, useRef, useState } from 'react';
import { Clipboard, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/apiClient';

const WORLD_SETTINGS = [
  ['custom', 'Custom setting'], ['high_fantasy', 'High fantasy'], ['classic_fantasy', 'Classic fantasy'],
  ['epic_fantasy', 'Epic fantasy'], ['gothic_horror', 'Gothic horror'], ['magipunk_noir', 'Magipunk / noir'],
  ['planar_adventure', 'Planar adventure'], ['fantasy_space', 'Fantasy space'],
];

const emptyOverview = { publicOverview: '', currentSituation: '', toneThemes: '', gmTruths: '', importParking: '' };
const sectionMap = {
  publicOverview: 'Public Overview', currentSituation: 'Current Situation', toneThemes: 'Tone & Themes',
  gmTruths: 'GM Truths & Secrets', importParking: 'Import Parking',
};

function extractSection(content, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function parseOverview(content = '', worldNotes = '') {
  const structured = content.includes('## Public Overview') || content.includes('## Current Situation');
  if (!structured) return { ...emptyOverview, publicOverview: content.trim(), importParking: worldNotes.trim() };
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
    '# World Overview', '', '## Public Overview', overview.publicOverview?.trim() || '', '',
    '## Current Situation', overview.currentSituation?.trim() || '', '', '## Tone & Themes', overview.toneThemes?.trim() || '', '',
    '## GM Truths & Secrets', overview.gmTruths?.trim() || '', '', '## Import Parking', overview.importParking?.trim() || '',
  ].join('\n');
}

function serializeAIContext(overview) {
  return [
    'Tone & themes:', overview.toneThemes?.trim() || 'Not set', '',
    'Current situation:', overview.currentSituation?.trim() || 'Not set', '',
    'GM-only truths and secrets:', overview.gmTruths?.trim() || 'Not set', '',
    'Import parking / unsorted notes:', overview.importParking?.trim() || 'Not set',
  ].join('\n');
}

function responseObject(result) {
  if (result?.status !== 'fulfilled') return null;
  const data = result.value?.data;
  return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
}

function settingResponseData(result) {
  const data = responseObject(result);
  return data && typeof data.content === 'string' ? data : null;
}

function worldResponseData(result) {
  const data = responseObject(result);
  return data && typeof data.world_setting === 'string' && Array.isArray(data.available_settings) ? data : null;
}

export default function CampaignSettingTab({ campaignId }) {
  const loadRequestRef = useRef(0);
  const [overview, setOverview] = useState(emptyOverview);
  const [worldSetting, setWorldSetting] = useState('custom');
  const [availableSettings, setAvailableSettings] = useState([]);
  const [settingLoaded, setSettingLoaded] = useState(false);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [loadWarning, setLoadWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOverview({ reset: true, notifyFailure: false });
    return () => { loadRequestRef.current += 1; };
  }, [campaignId]);

  const loadOverview = async ({ reset = false, notifyFailure = true } = {}) => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const hadPriorData = reset ? false : settingLoaded || worldLoaded;

    if (reset) {
      setOverview(emptyOverview);
      setWorldSetting('custom');
      setAvailableSettings([]);
      setSettingLoaded(false);
      setWorldLoaded(false);
      setLoadWarning('');
    }

    setLoading(true);

    const [settingResult, worldResult] = await Promise.allSettled([
      apiClient.get(`/campaigns/${campaignId}/setting`),
      apiClient.get(`/campaigns/${campaignId}/world-setting`),
    ]);

    if (requestId !== loadRequestRef.current) return { ok: false, stale: true };

    const settingData = settingResponseData(settingResult);
    const worldData = worldResponseData(worldResult);
    const settingOk = Boolean(settingData);
    const worldOk = Boolean(worldData);

    if (settingOk) {
      setOverview(prev => {
        const worldNotes = worldOk && typeof worldData.world_setting_notes === 'string'
          ? worldData.world_setting_notes
          : prev.importParking;
        return parseOverview(settingData.content, worldNotes);
      });
      setSettingLoaded(true);
    }

    if (worldOk) {
      setWorldSetting(worldData.world_setting);
      setAvailableSettings(worldData.available_settings);
      setWorldLoaded(true);
    }

    if (settingOk && worldOk) {
      setLoadWarning('');
    } else {
      const message = hadPriorData
        ? 'Some world notes could not refresh. Showing the last loaded data for anything that failed.'
        : 'Some world notes could not be loaded. Failed sections are locked; retry before saving.';
      setLoadWarning(message);
      if (notifyFailure) toast.error(message);
    }

    setLoading(false);
    return { ok: settingOk && worldOk, partial: settingOk || worldOk };
  };

  const setField = (field, value) => setOverview(prev => ({ ...prev, [field]: value }));

  const saveOverview = async () => {
    if (!settingLoaded || !worldLoaded) {
      toast.error('Reload world notes successfully before saving');
      return;
    }

    try {
      setSaving(true);
      await Promise.all([
        apiClient.put(`/campaigns/${campaignId}/setting`, { content: serializeOverview(overview) }),
        apiClient.put(`/campaigns/${campaignId}/world-setting`, { world_setting: worldSetting, world_setting_notes: serializeAIContext(overview) }),
      ]);
      toast.success('World notes saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save world notes');
    } finally {
      setSaving(false);
    }
  };

  const copyOverview = async () => {
    try {
      await navigator.clipboard.writeText(serializeOverview(overview));
      toast.success('World notes copied');
    } catch {
      toast.error('Could not copy world notes');
    }
  };

  if (loading && !settingLoaded && !worldLoaded) return <div style={loadingStyle}><div className="loading-spinner" /></div>;

  const settingOptions = availableSettings.length
    ? availableSettings.map(setting => [setting.id, setting.name])
    : WORLD_SETTINGS;
  const saveBlocked = saving || loading || !settingLoaded || !worldLoaded;

  return (
    <section style={pageStyle} data-testid="campaign-setting-tab">
      {loadWarning && <div role="status" style={warningStyle} data-testid="campaign-setting-warning">{loadWarning}</div>}
      <header style={toolbarStyle}>
        <label style={toneStyle}>
          <span>World tone</span>
          <select value={worldSetting} onChange={event => setWorldSetting(event.target.value)} style={inputStyle} disabled={!worldLoaded}>
            {settingOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div style={actionsStyle}>
          <Button type="button" onClick={() => loadOverview()} disabled={loading} style={secondaryButtonStyle} data-testid="campaign-setting-reload"><RefreshCw size={14} /> {loading ? 'Reloading…' : 'Reload'}</Button>
          <Button type="button" onClick={copyOverview} style={secondaryButtonStyle}><Clipboard size={14} /> Copy</Button>
          <Button type="button" onClick={saveOverview} disabled={saveBlocked} style={primaryButtonStyle} data-testid="campaign-setting-save"><Save size={14} /> {saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </header>

      <div style={fieldGridStyle}>
        <OverviewField label="Public Overview" value={overview.publicOverview} onChange={value => setField('publicOverview', value)} placeholder="What can the players safely know about the campaign and world?" tall disabled={!settingLoaded} />
        <OverviewField label="Current Situation" value={overview.currentSituation} onChange={value => setField('currentSituation', value)} placeholder="What is happening in the world right now?" tall disabled={!settingLoaded} />
        <OverviewField label="Tone & Themes" value={overview.toneThemes} onChange={value => setField('toneThemes', value)} placeholder="Political, dangerous, hopeful, mysterious…" disabled={!settingLoaded} />
        <OverviewField label="GM Truths & Secrets" value={overview.gmTruths} onChange={value => setField('gmTruths', value)} placeholder="Hidden truths and unrevealed campaign information." disabled={!settingLoaded} />
        <OverviewField label="Unsorted Notes" value={overview.importParking} onChange={value => setField('importParking', value)} placeholder="Drop rough material here and sort it later." wide tall disabled={!settingLoaded} />
      </div>
    </section>
  );
}

function OverviewField({ label, value, onChange, placeholder, wide = false, tall = false, disabled = false }) {
  return (
    <label style={{ ...fieldStyle, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={fieldTopStyle}>{label}</span>
      <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={{ ...textareaStyle, minHeight: tall ? 150 : 105 }} disabled={disabled} />
    </label>
  );
}

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const pageStyle = { display: 'grid', gap: 8, fontFamily: fontStack };
const loadingStyle = { minHeight: 220, display: 'grid', placeItems: 'center', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)' };
const warningStyle = { padding: '9px 10px', background: 'rgba(217,146,34,0.1)', border: '1px solid #d99222', color: '#ffd28a', fontSize: 12, fontWeight: 850, lineHeight: 1.4 };
const toolbarStyle = { minHeight: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.16)', padding: 7 };
const toneStyle = { display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.62)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' };
const inputStyle = { minHeight: 34, background: '#242424', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '0 8px', fontFamily: fontStack, fontWeight: 800, colorScheme: 'dark' };
const actionsStyle = { display: 'flex', gap: 5, flexWrap: 'wrap' };
const primaryButtonStyle = { minHeight: 34, border: 0, background: '#d00000', color: '#fff', padding: '0 9px', fontWeight: 950, display: 'inline-flex', alignItems: 'center', gap: 5 };
const secondaryButtonStyle = { minHeight: 34, border: '1px solid rgba(255,255,255,0.16)', background: '#3a3a3a', color: '#fff', padding: '0 9px', fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 5 };
const fieldGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 7 };
const fieldStyle = { display: 'grid', gap: 5, background: '#3a3a3a', border: '1px solid rgba(255,255,255,0.16)', padding: 8 };
const fieldTopStyle = { color: '#fff', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.05em' };
const textareaStyle = { width: '100%', boxSizing: 'border-box', background: '#242424', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: 9, resize: 'vertical', fontFamily: fontStack, lineHeight: 1.4, outline: 'none', colorScheme: 'dark', fontSize: 12 };
