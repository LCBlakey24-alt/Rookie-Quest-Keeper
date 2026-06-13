import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Eye, FileJson, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Button } from '@/components/ui/button';

const supportedTypes = [
  'classes', 'subclasses', 'species', 'races', 'backgrounds', 'feats',
  'features', 'spells', 'creatures', 'items', 'conditions', 'rules_references',
];

const samplePack = {
  pack_name: 'Friday Private Playtest Pack',
  description: 'Private campaign test content. Delete or replace before public/shared release.',
  edition: '2024',
  replace_existing: false,
  content: {
    creatures: [
      {
        name: 'Example Playtest Creature',
        armor_class: 13,
        hit_points: 18,
        actions: [{ name: 'Strike', description: 'Private/original playtest summary.' }],
      },
    ],
    items: [
      { name: 'Example Playtest Item', item_type: 'gear', description: 'Private/original playtest summary.' },
    ],
  },
};

function safeCounts(counts = {}) {
  return supportedTypes.filter(type => counts[type]).map(type => `${type}: ${counts[type]}`);
}

function normalizePackPayload(parsed, campaignId, scope, replaceExisting) {
  const payload = { ...parsed };
  payload.pack_name = payload.pack_name || payload.ruleset_name || 'Private Playtest Pack';
  payload.description = payload.description || payload.ruleset_description || '';
  payload.edition = payload.edition === '2014' ? '2014' : '2024';
  payload.replace_existing = replaceExisting;
  payload.campaign_id = scope === 'campaign' ? campaignId : null;

  if (!payload.content || typeof payload.content !== 'object' || Array.isArray(payload.content)) {
    payload.content = Object.fromEntries(
      supportedTypes
        .filter(type => Array.isArray(parsed[type]))
        .map(type => [type, parsed[type]])
    );
  }
  return payload;
}

function PrivatePlaytestPacksTab({ campaignId }) {
  const [jsonText, setJsonText] = useState(JSON.stringify(samplePack, null, 2));
  const [scope, setScope] = useState('campaign');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [validation, setValidation] = useState(null);
  const [packs, setPacks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedPack, setSelectedPack] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  const visiblePacks = useMemo(() => packs.filter(pack => {
    if (scope === 'campaign') return pack.campaign_id === campaignId;
    return !pack.campaign_id;
  }), [packs, campaignId, scope]);

  const parsePayload = useCallback(() => {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error('Invalid JSON. Please fix the formatting before validating.');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Pack JSON must be an object.');
    }
    return normalizePackPayload(parsed, campaignId, scope, replaceExisting);
  }, [jsonText, campaignId, scope, replaceExisting]);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    try {
      const [packsRes, summaryRes] = await Promise.all([
        apiClient.get('/user/content/playtest-packs'),
        apiClient.get('/user/content/playtest-packs/summary'),
      ]);
      setPacks(packsRes.data?.packs || []);
      setSummary(summaryRes.data || null);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load private playtest packs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPacks(); }, [loadPacks]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      JSON.parse(text);
      setJsonText(text);
      setValidation(null);
      toast.success(`Loaded ${file.name}`);
    } catch (error) {
      toast.error('That file is not valid JSON');
    } finally {
      event.target.value = '';
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const payload = parsePayload();
      const res = await apiClient.post('/user/content/playtest-packs/validate', payload);
      setValidation(res.data);
      if (res.data?.valid) toast.success('Pack is valid and ready to import');
      else toast.error('Pack needs fixes before import');
    } catch (error) {
      toast.error(error.message || error?.response?.data?.detail || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const payload = parsePayload();
      const res = await apiClient.post('/user/content/playtest-packs/import', payload);
      toast.success(res.data?.message || 'Private playtest pack imported');
      setValidation(null);
      await loadPacks();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (detail?.errors) {
        setValidation({ valid: false, errors: detail.errors, warnings: detail.warnings || [] });
        toast.error(detail.message || 'Pack failed validation');
      } else {
        toast.error(detail || error.message || 'Import failed');
      }
    } finally {
      setImporting(false);
    }
  };

  const handleInspect = async (packId) => {
    try {
      const res = await apiClient.get(`/user/content/playtest-packs/${packId}`);
      setSelectedPack(res.data?.pack || null);
      setSelectedRecords(res.data?.records || []);
    } catch (error) {
      toast.error('Failed to open playtest pack');
    }
  };

  const handleDelete = async (pack) => {
    if (!window.confirm(`Delete private playtest pack "${pack.pack_name}" and all ${pack.validation?.total_records || 'its'} imported records?`)) return;
    try {
      await apiClient.delete(`/user/content/playtest-packs/${pack.id}`);
      toast.success('Private playtest pack deleted');
      if (selectedPack?.id === pack.id) {
        setSelectedPack(null);
        setSelectedRecords([]);
      }
      await loadPacks();
    } catch (error) {
      toast.error('Failed to delete private playtest pack');
    }
  };

  const validationCounts = safeCounts(validation?.counts);

  return (
    <div data-testid="private-playtest-packs-tab" style={{ display: 'grid', gap: 18 }}>
      <section style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>Private content manager</p>
          <h2 style={titleStyle}><ShieldCheck size={24} /> Private Playtest Packs</h2>
          <p style={bodyStyle}>Upload private 2014/2024 playtest JSON for this campaign, validate it, import it, test it in the app, then delete or replace it before public/shared release.</p>
        </div>
        <Button onClick={loadPacks} disabled={loading} style={secondaryButtonStyle} data-testid="refresh-playtest-packs">
          <RefreshCw size={16} /> {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </section>

      <section style={warningStyle}>
        <AlertTriangle size={18} />
        <span>Do not commit protected publisher text into the repo. This screen stores user-owned private playtest data only; use original summaries or content you have rights to use.</span>
      </section>

      <div style={gridStyle}>
        <section style={panelStyle}>
          <div style={panelHeaderStyle}>
            <h3 style={panelTitleStyle}><FileJson size={18} /> Validate & Import JSON</h3>
            <label style={uploadLabelStyle}>
              <Upload size={15} /> Load JSON file
              <input type="file" accept=".json,application/json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={controlsStyle}>
            <label style={fieldLabelStyle}>Edition
              <select
                value={(() => { try { return JSON.parse(jsonText).edition === '2014' ? '2014' : '2024'; } catch { return '2024'; } })()}
                onChange={(event) => {
                  try {
                    const parsed = JSON.parse(jsonText);
                    setJsonText(JSON.stringify({ ...parsed, edition: event.target.value }, null, 2));
                  } catch { toast.error('Fix JSON before changing edition here'); }
                }}
                style={selectStyle}
              >
                <option value="2024">2024</option>
                <option value="2014">2014</option>
              </select>
            </label>
            <label style={fieldLabelStyle}>Scope
              <select value={scope} onChange={(event) => setScope(event.target.value)} style={selectStyle}>
                <option value="campaign">This campaign</option>
                <option value="global">My reusable private packs</option>
              </select>
            </label>
            <label style={checkboxLabelStyle}>
              <input type="checkbox" checked={replaceExisting} onChange={(event) => setReplaceExisting(event.target.checked)} />
              Replace matching pack name/scope on import
            </label>
          </div>

          <textarea
            value={jsonText}
            onChange={(event) => { setJsonText(event.target.value); setValidation(null); }}
            spellCheck={false}
            data-testid="playtest-pack-json"
            style={textareaStyle}
          />
          <div style={buttonRowStyle}>
            <Button onClick={handleValidate} disabled={validating || importing} style={secondaryButtonStyle} data-testid="validate-playtest-pack">
              {validating ? 'Validating…' : 'Validate pack'}
            </Button>
            <Button onClick={handleImport} disabled={importing || validating} style={primaryButtonStyle} data-testid="import-playtest-pack">
              {importing ? 'Importing…' : 'Import private pack'}
            </Button>
          </div>

          {validation && (
            <div style={validation.valid ? successBoxStyle : errorBoxStyle} data-testid="playtest-pack-validation-result">
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {validation.valid ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                {validation.valid ? 'Valid pack' : 'Pack needs fixes'}
              </strong>
              <p style={{ margin: '8px 0 0', color: '#D1D5DB', fontSize: 13 }}>Total records: {validation.total_records || 0}{validationCounts.length ? ` · ${validationCounts.join(' · ')}` : ''}</p>
              <IssueList title="Errors" issues={validation.errors || []} color="#FCA5A5" />
              <IssueList title="Warnings" issues={validation.warnings || []} color="#FDE68A" />
            </div>
          )}
        </section>

        <section style={panelStyle}>
          <h3 style={panelTitleStyle}><ShieldCheck size={18} /> Imported Packs</h3>
          <SummaryCards summary={summary} />
          <div style={toggleStyle}>
            <button type="button" onClick={() => setScope('campaign')} style={scopeButtonStyle(scope === 'campaign')}>This campaign</button>
            <button type="button" onClick={() => setScope('global')} style={scopeButtonStyle(scope === 'global')}>Reusable private</button>
          </div>
          {visiblePacks.length === 0 ? (
            <p style={emptyStyle}>No {scope === 'campaign' ? 'campaign-scoped' : 'reusable'} private playtest packs yet.</p>
          ) : visiblePacks.map(pack => (
            <article key={pack.id} style={packCardStyle} data-testid="playtest-pack-card">
              <div style={{ minWidth: 0 }}>
                <strong style={{ color: '#FFFFFF' }}>{pack.pack_name}</strong>
                <p style={smallTextStyle}>{pack.edition} · {pack.validation?.total_records || 0} records · {pack.campaign_id ? 'Campaign-scoped' : 'Reusable private'}</p>
                {pack.description && <p style={smallTextStyle}>{pack.description}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleInspect(pack.id)} style={iconButtonStyle} title="Inspect pack"><Eye size={15} /></button>
                <button type="button" onClick={() => handleDelete(pack)} style={dangerButtonStyle} title="Delete pack"><Trash2 size={15} /></button>
              </div>
            </article>
          ))}
        </section>
      </div>

      {selectedPack && (
        <section style={panelStyle} data-testid="playtest-pack-details">
          <h3 style={panelTitleStyle}><Eye size={18} /> {selectedPack.pack_name}</h3>
          <p style={bodyStyle}>{selectedPack.edition} · {selectedRecords.length} imported records</p>
          <div style={recordGridStyle}>
            {selectedRecords.slice(0, 120).map(record => (
              <div key={record.id} style={recordCardStyle}>
                <strong style={{ color: '#FFFFFF' }}>{record.name || 'Unnamed record'}</strong>
                <span style={smallTextStyle}>{record.content_type} · {record.edition}</span>
              </div>
            ))}
          </div>
          {selectedRecords.length > 120 && <p style={smallTextStyle}>Showing first 120 records.</p>}
        </section>
      )}
    </div>
  );
}

function IssueList({ title, issues, color }) {
  if (!issues?.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <strong style={{ color, fontSize: 12 }}>{title}</strong>
      <ul style={{ margin: '6px 0 0 18px', padding: 0, color: '#D1D5DB', fontSize: 12 }}>
        {issues.slice(0, 8).map((issue, index) => <li key={`${issue.path}-${index}`}>{issue.path}: {issue.message}</li>)}
      </ul>
      {issues.length > 8 && <p style={smallTextStyle}>+{issues.length - 8} more</p>}
    </div>
  );
}

function SummaryCards({ summary }) {
  if (!summary) return null;
  return (
    <div style={summaryGridStyle}>
      {['2024', '2014'].map(edition => (
        <div key={edition} style={summaryCardStyle}>
          <strong style={{ color: '#FFFFFF' }}>{edition}</strong>
          <span style={smallTextStyle}>{summary[edition]?.packs || 0} packs</span>
          <span style={smallTextStyle}>{Object.entries(summary[edition] || {}).filter(([key]) => key !== 'packs').reduce((total, [, count]) => total + Number(count || 0), 0)} records</span>
        </div>
      ))}
    </div>
  );
}

const heroStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', padding: 18, border: '1px solid rgba(239,68,68,0.42)', background: 'rgba(31,31,35,0.95)' };
const eyebrowStyle = { margin: '0 0 6px', color: '#EF4444', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1.4 };
const titleStyle = { margin: 0, color: '#FFFFFF', fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 };
const bodyStyle = { color: '#D1D5DB', fontSize: 14, lineHeight: 1.55, margin: '8px 0 0' };
const warningStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.10)', color: '#FDE68A', fontSize: 13, lineHeight: 1.45 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)', gap: 16 };
const panelStyle = { border: '1px solid rgba(239,68,68,0.32)', background: 'rgba(39,39,43,0.96)', padding: 16 };
const panelHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 };
const panelTitleStyle = { margin: '0 0 12px', color: '#FFFFFF', fontSize: 17, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 };
const controlsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 };
const fieldLabelStyle = { display: 'grid', gap: 6, color: '#D1D5DB', fontSize: 12, fontWeight: 800 };
const checkboxLabelStyle = { color: '#D1D5DB', fontSize: 12, fontWeight: 800, display: 'flex', gap: 8, alignItems: 'center', alignSelf: 'end', minHeight: 38 };
const selectStyle = { background: '#1F1F23', color: '#FFFFFF', border: '1px solid rgba(239,68,68,0.32)', padding: '9px 10px', borderRadius: 0 };
const textareaStyle = { width: '100%', minHeight: 360, background: '#151518', color: '#F9FAFB', border: '1px solid rgba(239,68,68,0.28)', padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.5, resize: 'vertical' };
const buttonRowStyle = { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 };
const primaryButtonStyle = { background: '#EF4444', color: '#FFFFFF', border: 'none', borderRadius: 0, fontWeight: 900 };
const secondaryButtonStyle = { background: 'rgba(239,68,68,0.12)', color: '#FFFFFF', border: '1px solid rgba(239,68,68,0.42)', borderRadius: 0, fontWeight: 900, display: 'inline-flex', gap: 8, alignItems: 'center' };
const uploadLabelStyle = { ...secondaryButtonStyle, padding: '9px 12px', cursor: 'pointer', fontSize: 13 };
const successBoxStyle = { marginTop: 12, padding: 12, border: '1px solid rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.10)', color: '#BBF7D0' };
const errorBoxStyle = { marginTop: 12, padding: 12, border: '1px solid rgba(239,68,68,0.55)', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5' };
const emptyStyle = { color: '#9CA3AF', border: '1px dashed rgba(156,163,175,0.35)', padding: 14, margin: 0, fontSize: 13 };
const smallTextStyle = { color: '#9CA3AF', fontSize: 12, lineHeight: 1.45, margin: '4px 0 0' };
const packCardStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(31,31,35,0.85)', marginBottom: 10 };
const iconButtonStyle = { background: 'rgba(239,68,68,0.12)', color: '#FFFFFF', border: '1px solid rgba(239,68,68,0.35)', padding: 8, cursor: 'pointer' };
const dangerButtonStyle = { background: 'rgba(220,38,38,0.18)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.45)', padding: 8, cursor: 'pointer' };
const toggleStyle = { display: 'flex', gap: 8, margin: '12px 0' };
const scopeButtonStyle = (active) => ({ flex: 1, padding: '9px 10px', cursor: 'pointer', background: active ? '#EF4444' : 'rgba(255,255,255,0.04)', color: '#FFFFFF', border: active ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.12)', fontWeight: 900 });
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 };
const summaryCardStyle = { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(31,31,35,0.85)', padding: 10, display: 'grid', gap: 2 };
const recordGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginTop: 12 };
const recordCardStyle = { border: '1px solid rgba(255,255,255,0.08)', background: '#1F1F23', padding: 10, display: 'grid', gap: 2 };

export default PrivatePlaytestPacksTab;
