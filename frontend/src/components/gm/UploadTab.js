import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronRight, Copy, FileText, Folder, Image as ImageIcon, Map, Monitor, Music, Save, Search, Trash2, Upload, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../lib/apiClient';
import { buildTextHandoutPayload } from './UploadTabUtils';
import { createDisplayState, publishCampaignDisplayState } from '@/lib/liveDisplayBus';

const rq = {
  bg: 'var(--rq-bg-main, #1A1A1A)',
  panel: 'var(--rq-bg-panel, #242424)',
  elevated: 'var(--rq-bg-elevated, #323232)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  success: 'var(--rq-success, #2E8B57)',
  danger: 'var(--rq-danger, #C1121F)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

const MAX_INLINE_BYTES = 2.5 * 1024 * 1024;

const UPLOAD_TYPES = [
  { id: 'map', title: 'Maps', icon: Map, accept: 'image/*', description: 'World maps, dungeon maps, city layouts, battle maps', color: rq.accent },
  { id: 'character', title: 'NPC / Character Art', icon: Users, accept: 'image/*', description: 'NPC portraits, player art, tokens, faction faces', color: rq.accentHover },
  { id: 'document', title: 'Documents & Text', icon: FileText, accept: '.pdf,.doc,.docx,.txt,.md', description: 'Letters, clues, lore docs, rulings, prep notes', color: rq.textSecondary },
  { id: 'audio', title: 'Audio & Music', icon: Music, accept: 'audio/*', description: 'Ambience, stings, combat music, sound effects', color: rq.textSecondary },
  { id: 'misc', title: 'Other Files', icon: Folder, accept: '*', description: 'Anything else useful for the campaign', color: rq.muted },
];

function assetStorageKey(campaignId) {
  return `rqk.gm.assets.${campaignId || 'global'}`;
}

function typeMeta(type) {
  return UPLOAD_TYPES.find(item => item.id === type) || UPLOAD_TYPES[UPLOAD_TYPES.length - 1];
}

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function readFileData(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function readTextFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

function safeLoadAssets(campaignId) {
  try {
    const raw = localStorage.getItem(assetStorageKey(campaignId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function searchable(asset) {
  return [asset.name, asset.type, asset.category, asset.notes, asset.fileType, asset.sizeLabel].join(' ').toLowerCase();
}

export default function UploadTab({ theme, campaignId }) {
  const [assets, setAssets] = useState(() => safeLoadAssets(campaignId));
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [openAssets, setOpenAssets] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [uploadingType, setUploadingType] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [savingText, setSavingText] = useState(false);
  const fileInputRefs = useRef({});

  const ui = {
    panel: theme?.bg?.card || rq.panel,
    elevated: theme?.bg?.elevated || rq.elevated,
    border: theme?.border || rq.border,
    accent: theme?.accent?.primary || rq.accent,
    text: theme?.text?.primary || rq.text,
    textSecondary: theme?.text?.secondary || rq.textSecondary,
    muted: theme?.text?.muted || rq.muted,
  };

  useEffect(() => {
    setAssets(safeLoadAssets(campaignId));
    setOpenAssets({});
  }, [campaignId]);

  useEffect(() => {
    try { localStorage.setItem(assetStorageKey(campaignId), JSON.stringify(assets)); } catch { /* storage may be full */ }
  }, [assets, campaignId]);

  const stats = useMemo(() => UPLOAD_TYPES.map(type => ({ ...type, count: assets.filter(asset => asset.type === type.id).length })), [assets]);

  const filteredAssets = useMemo(() => {
    const term = query.trim().toLowerCase();
    return assets.filter(asset => {
      if (filter !== 'all' && asset.type !== filter) return false;
      if (!term) return true;
      return searchable(asset).includes(term);
    });
  }, [assets, filter, query]);

  const addFiles = async (type, files) => {
    if (!files?.length) return;
    setUploadingType(type);
    const nextAssets = [];
    const nextErrors = {};

    for (const file of Array.from(files)) {
      const signature = `${type}:${file.name}:${file.size}:${file.lastModified}`;
      const duplicate = assets.some(asset => asset.signature === signature) || nextAssets.some(asset => asset.signature === signature);
      if (duplicate) {
        nextErrors[signature] = `${file.name} skipped — already staged in this campaign.`;
        continue;
      }

      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      const isText = /\.(txt|md)$/i.test(file.name) || file.type.startsWith('text/');
      const canInline = file.size <= MAX_INLINE_BYTES && (isImage || isAudio || isText);
      let dataUrl = '';
      let text = '';

      if (canInline && (isImage || isAudio)) dataUrl = await readFileData(file);
      if (isText && file.size <= MAX_INLINE_BYTES) text = await readTextFile(file);

      nextAssets.push({
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        signature,
        type,
        name: file.name,
        size: file.size,
        sizeLabel: formatFileSize(file.size),
        fileType: file.type || 'Unknown file type',
        uploadedAt: new Date().toISOString(),
        dataUrl,
        text,
        notes: '',
        persistentMode: dataUrl || text ? 'browser-staged' : 'metadata-only',
      });
    }

    if (nextAssets.length) {
      setAssets(prev => [...nextAssets, ...prev]);
      toast.success(`${nextAssets.length} asset${nextAssets.length === 1 ? '' : 's'} staged`);
    }
    if (Object.keys(nextErrors).length) setUploadErrors(prev => ({ ...prev, ...nextErrors }));
    setUploadingType('');
  };

  const removeAsset = (assetId) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
    setOpenAssets(prev => {
      const next = { ...prev };
      delete next[assetId];
      return next;
    });
  };

  const updateAsset = (assetId, patch) => {
    setAssets(prev => prev.map(asset => asset.id === assetId ? { ...asset, ...patch } : asset));
  };

  const copyAssetSummary = async (asset) => {
    const text = [
      asset.name,
      `Type: ${typeMeta(asset.type).title}`,
      `File: ${asset.fileType}`,
      `Size: ${asset.sizeLabel}`,
      asset.notes ? `Notes: ${asset.notes}` : '',
      asset.text ? `\nText:\n${asset.text}` : '',
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Asset summary copied');
    } catch {
      toast.info('Copy failed on this device.');
    }
  };

  const sendToSecondScreen = async (asset) => {
    if (!asset.dataUrl || !(asset.fileType || '').startsWith('image/')) {
      toast.error('Only staged image assets can be sent to the second screen right now.');
      return;
    }
    await publishCampaignDisplayState(campaignId, createDisplayState('image', {
      display_target: 'standing-tv',
      title: asset.name,
      image_url: asset.dataUrl,
      caption: asset.notes || typeMeta(asset.type).title,
    }));
    toast.success('Sent to second screen', { description: asset.name });
  };

  const saveAssetAsHandout = async (asset) => {
    if (!campaignId) {
      toast.error('Open a campaign before saving this as a handout.');
      return;
    }
    const content = asset.text || [
      `Asset: ${asset.name}`,
      `Type: ${typeMeta(asset.type).title}`,
      `File type: ${asset.fileType}`,
      `Size: ${asset.sizeLabel}`,
      asset.notes ? `Notes: ${asset.notes}` : '',
      asset.dataUrl ? 'Image/audio is staged in the GM asset library for this browser.' : 'File metadata only. Add the file again if you need a preview.',
    ].filter(Boolean).join('\n');

    try {
      await apiClient.post(`/campaigns/${campaignId}/handouts`, buildTextHandoutPayload({ title: asset.name, content }));
      toast.success('Saved to Secrets & Handouts', { description: asset.name });
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save asset as handout');
    }
  };

  const clearError = (uploadId) => {
    setUploadErrors(prev => {
      const next = { ...prev };
      delete next[uploadId];
      return next;
    });
  };

  const saveTextHandout = async () => {
    const title = textTitle.trim();
    const content = textContent.trim();
    if (!title || !content) {
      toast.error('Add a title and campaign text before saving.');
      return;
    }
    if (!campaignId) {
      toast.error('Open a campaign before saving campaign material.');
      return;
    }
    try {
      setSavingText(true);
      await apiClient.post(`/campaigns/${campaignId}/handouts`, buildTextHandoutPayload({ title, content }));
      toast.success('Campaign text saved to Secrets & Handouts');
      setTextTitle('');
      setTextContent('');
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not save campaign text');
    } finally {
      setSavingText(false);
    }
  };

  return (
    <div style={pageStyle} data-testid="gm-upload-asset-library">
      <header style={headerStyle}>
        <Upload size={24} style={{ color: ui.accent }} />
        <div style={{ minWidth: 0 }}>
          <h3 style={headingStyle(ui)}>Campaign Asset Library</h3>
          <p style={subtleTextStyle(ui)}>Stage maps, portraits, audio, documents, clues, and text for the GM side. Images can be sent to the second screen.</p>
        </div>
      </header>

      <section style={noticeStyle(ui)}>
        <AlertCircle size={16} />
        <span><strong>Current storage:</strong> text handouts save persistently. Files are staged in this browser for your campaign; small images/audio/text are kept for preview, while larger files store metadata until proper backend file storage is connected.</span>
      </section>

      <section style={textIntakeStyle(ui)}>
        <div>
          <p style={eyebrowStyle(ui)}>Persistent text intake</p>
          <h4 style={sectionTitleStyle(ui)}>Save campaign text as a handout draft</h4>
          <p style={helperTextStyle(ui)}>Paste lore, boxed text, clues, letters, or session prep here. This saves into Secrets & Handouts.</p>
        </div>
        <div style={textFormStyle}>
          <input value={textTitle} onChange={event => setTextTitle(event.target.value)} placeholder="Title, e.g. Queen's Chair letter" style={fieldStyle(ui)} aria-label="Campaign text title" />
          <textarea value={textContent} onChange={event => setTextContent(event.target.value)} placeholder="Paste or type campaign text here..." style={{ ...fieldStyle(ui), minHeight: 110, resize: 'vertical', lineHeight: 1.5 }} aria-label="Campaign text content" />
          <button type="button" onClick={saveTextHandout} disabled={savingText || !textTitle.trim() || !textContent.trim()} style={saveTextButtonStyle(ui, savingText || !textTitle.trim() || !textContent.trim())}><Save size={16} /> {savingText ? 'Saving...' : 'Save to Secrets & Handouts'}</button>
        </div>
      </section>

      <section style={typeGridStyle}>
        {UPLOAD_TYPES.map(type => {
          const Icon = type.icon;
          const count = stats.find(item => item.id === type.id)?.count || 0;
          return (
            <article key={type.id} style={uploadCardStyle(ui)}>
              <div style={uploadCardTopStyle}>
                <div style={iconBoxStyle(type)}><Icon size={23} /></div>
                <div style={{ minWidth: 0 }}>
                  <h4 style={uploadTitleStyle(ui)}>{type.title}</h4>
                  <p style={uploadHelpStyle(ui)}>{type.description}</p>
                </div>
                <span style={countStyle(ui)}>{count}</span>
              </div>
              <input ref={el => fileInputRefs.current[type.id] = el} type="file" accept={type.accept} multiple onChange={(event) => addFiles(type.id, event.target.files)} style={{ display: 'none' }} />
              <button type="button" onClick={() => fileInputRefs.current[type.id]?.click()} style={uploadButtonStyle(ui)} disabled={uploadingType === type.id}><Upload size={16} /> {uploadingType === type.id ? 'Staging...' : 'Add Files'}</button>
            </article>
          );
        })}
      </section>

      {Object.entries(uploadErrors).filter(([, err]) => err).length > 0 && (
        <section style={errorsStyle(ui)}>
          <h4 style={errorTitleStyle}><AlertCircle size={16} /> Upload Notes</h4>
          {Object.entries(uploadErrors).filter(([, err]) => err).map(([uploadId, error]) => (
            <div key={uploadId} style={errorRowStyle(ui)}><span>{error}</span><button type="button" onClick={() => clearError(uploadId)} style={iconButtonStyle}><X size={16} /></button></div>
          ))}
        </section>
      )}

      <section style={libraryPanelStyle(ui)}>
        <div style={libraryHeaderStyle}>
          <div>
            <p style={eyebrowStyle(ui)}>Staged assets</p>
            <h4 style={sectionTitleStyle(ui)}>Campaign files</h4>
          </div>
          <div style={filterWrapStyle}>
            <label style={searchStyle(ui)}><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search assets..." style={searchInputStyle(ui)} /></label>
            <select value={filter} onChange={event => setFilter(event.target.value)} style={selectStyle(ui)}><option value="all">All assets</option>{UPLOAD_TYPES.map(type => <option key={type.id} value={type.id}>{type.title}</option>)}</select>
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div style={emptyStyle(ui)}><Folder size={42} style={{ opacity: 0.55 }} /><strong>No assets here yet</strong><span>Add files above, or use the text intake to create persistent handout drafts.</span></div>
        ) : (
          <div style={assetGridStyle}>
            {filteredAssets.map(asset => {
              const meta = typeMeta(asset.type);
              const Icon = meta.icon;
              const open = Boolean(openAssets[asset.id]);
              return (
                <article key={asset.id} className="gm-asset-card" data-open={open ? 'true' : 'false'} style={assetCardStyle(ui)}>
                  <button type="button" onClick={() => setOpenAssets(prev => ({ ...prev, [asset.id]: !prev[asset.id] }))} style={assetToggleStyle(ui)} aria-expanded={open ? 'true' : 'false'}>
                    {asset.dataUrl && asset.fileType.startsWith('image/') ? <img src={asset.dataUrl} alt="" style={thumbStyle} /> : <span style={assetIconStyle(meta)}><Icon size={18} /></span>}
                    <span style={{ minWidth: 0, flex: 1 }}><strong style={assetNameStyle(ui)}>{asset.name}</strong><small style={assetMetaStyle(ui)}>{meta.title} · {asset.sizeLabel}</small></span>
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {open && (
                    <div style={assetDetailsStyle(ui)}>
                      <p style={helperTextStyle(ui)}><strong>Mode:</strong> {asset.persistentMode === 'browser-staged' ? 'Browser-staged preview' : 'Metadata only'} · {asset.fileType}</p>
                      {asset.dataUrl && asset.fileType.startsWith('image/') && <img src={asset.dataUrl} alt={asset.name} style={previewStyle} />}
                      {asset.dataUrl && asset.fileType.startsWith('audio/') && <audio controls src={asset.dataUrl} style={{ width: '100%' }} />}
                      {asset.text && <textarea value={asset.text} readOnly style={{ ...fieldStyle(ui), minHeight: 120, lineHeight: 1.45 }} />}
                      <textarea value={asset.notes || ''} onChange={event => updateAsset(asset.id, { notes: event.target.value })} placeholder="GM notes, scene use, who sees it, where it belongs..." style={{ ...fieldStyle(ui), minHeight: 78, resize: 'vertical' }} />
                      <div style={assetActionsStyle}>
                        <button type="button" onClick={() => copyAssetSummary(asset)} style={secondaryButtonStyle(ui)}><Copy size={14} /> Copy</button>
                        <button type="button" onClick={() => saveAssetAsHandout(asset)} style={secondaryButtonStyle(ui)}><FileText size={14} /> Save as Handout</button>
                        {asset.dataUrl && asset.fileType.startsWith('image/') && <button type="button" onClick={() => sendToSecondScreen(asset)} style={primaryButtonStyle(ui)}><Monitor size={14} /> Second Screen</button>}
                        <button type="button" onClick={() => removeAsset(asset.id)} style={dangerButtonStyle}><Trash2 size={14} /> Remove</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const pageStyle = { padding: 'clamp(10px, 2vw, 20px)', display: 'grid', gap: 14 };
const headerStyle = { display: 'flex', alignItems: 'center', gap: 12 };
const headingStyle = (ui) => ({ fontFamily: "'Outfit', sans-serif", color: ui.text, margin: 0, fontWeight: 950, fontSize: 22 });
const subtleTextStyle = (ui) => ({ color: ui.muted, fontSize: 12, margin: '4px 0 0', lineHeight: 1.4 });
const noticeStyle = (ui) => ({ display: 'flex', gap: 8, alignItems: 'flex-start', background: rq.accentSoft, border: `1px solid ${ui.border}`, color: ui.textSecondary, padding: 10, fontSize: 12, lineHeight: 1.45 });
const textIntakeStyle = (ui) => ({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16, alignItems: 'start', padding: 14, background: ui.panel, border: `1px solid ${ui.border}`, borderRadius: rq.radius });
const eyebrowStyle = (ui) => ({ margin: '0 0 6px', color: ui.accent, fontSize: 11, fontWeight: 950, letterSpacing: 1, textTransform: 'uppercase' });
const sectionTitleStyle = (ui) => ({ margin: '0 0 8px', color: ui.text, fontSize: 18, fontWeight: 950 });
const helperTextStyle = (ui) => ({ margin: 0, color: ui.muted, lineHeight: 1.55, fontSize: 13 });
const textFormStyle = { display: 'grid', gap: 10 };
const fieldStyle = (ui) => ({ width: '100%', boxSizing: 'border-box', padding: '12px 13px', background: ui.elevated, border: `1px solid ${ui.border}`, borderRadius: rq.radiusSm, color: ui.text, outline: 'none', fontSize: 14, colorScheme: 'dark' });
const saveTextButtonStyle = (ui, disabled) => ({ width: '100%', minHeight: 44, border: `1px solid ${disabled ? ui.border : ui.accent}`, borderRadius: rq.radiusSm, background: disabled ? ui.elevated : ui.accent, color: disabled ? ui.muted : '#ffffff', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 });
const typeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 };
const uploadCardStyle = (ui) => ({ padding: 12, background: ui.panel, borderRadius: rq.radius, border: `1px solid ${ui.border}`, display: 'grid', gap: 12 });
const uploadCardTopStyle = { display: 'flex', alignItems: 'flex-start', gap: 10 };
const iconBoxStyle = (type) => ({ width: 42, height: 42, borderRadius: rq.radiusSm, background: rq.accentSoft, border: `1px solid ${rq.border}`, color: type.color, display: 'grid', placeItems: 'center', flexShrink: 0 });
const uploadTitleStyle = (ui) => ({ color: ui.text, margin: 0, fontSize: 15, fontWeight: 950 });
const uploadHelpStyle = (ui) => ({ color: ui.muted, fontSize: 12, margin: '3px 0 0', lineHeight: 1.35 });
const countStyle = (ui) => ({ marginLeft: 'auto', color: ui.text, background: rq.accentSoft, border: `1px solid ${ui.border}`, padding: '3px 7px', fontSize: 11, fontWeight: 950 });
const uploadButtonStyle = (ui) => ({ width: '100%', minHeight: 38, background: rq.accentSoft, border: `1px dashed ${ui.border}`, borderRadius: rq.radiusSm, color: ui.text, cursor: 'pointer', fontSize: 13, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 });
const errorsStyle = (ui) => ({ display: 'grid', gap: 8, background: ui.panel, border: `1px solid ${ui.border}`, padding: 10 });
const errorTitleStyle = { color: rq.danger, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 950 };
const errorRowStyle = (ui) => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, background: rq.accentSoft, border: `1px solid ${ui.border}`, color: rq.danger, fontSize: 12 });
const iconButtonStyle = { background: 'none', border: 'none', cursor: 'pointer', color: rq.danger, padding: 4 };
const libraryPanelStyle = (ui) => ({ display: 'grid', gap: 12, background: ui.panel, border: `1px solid ${ui.border}`, padding: 12 });
const libraryHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' };
const filterWrapStyle = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' };
const searchStyle = (ui) => ({ minHeight: 38, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', background: ui.elevated, border: `1px solid ${ui.border}` });
const searchInputStyle = (ui) => ({ background: 'transparent', border: 0, outline: 0, color: ui.text, minWidth: 170 });
const selectStyle = (ui) => ({ minHeight: 38, background: ui.elevated, color: ui.text, border: `1px solid ${ui.border}`, padding: '0 9px' });
const emptyStyle = (ui) => ({ minHeight: 180, display: 'grid', placeItems: 'center', textAlign: 'center', color: ui.muted, background: ui.elevated, border: `1px solid ${ui.border}`, padding: 22, gap: 7 });
const assetGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 };
const assetCardStyle = (ui) => ({ background: ui.elevated, border: `1px solid ${ui.border}`, display: 'grid', minWidth: 0 });
const assetToggleStyle = (ui) => ({ minHeight: 72, width: '100%', padding: 10, display: 'flex', alignItems: 'center', gap: 9, border: 0, background: 'transparent', color: ui.text, cursor: 'pointer', textAlign: 'left' });
const thumbStyle = { width: 46, height: 46, objectFit: 'cover', border: `1px solid ${rq.border}`, flexShrink: 0 };
const assetIconStyle = (meta) => ({ width: 46, height: 46, display: 'grid', placeItems: 'center', background: rq.accentSoft, border: `1px solid ${rq.border}`, color: meta.color, flexShrink: 0 });
const assetNameStyle = (ui) => ({ display: 'block', color: ui.text, fontSize: 13, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
const assetMetaStyle = (ui) => ({ display: 'block', color: ui.muted, fontSize: 11, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
const assetDetailsStyle = (ui) => ({ display: 'grid', gap: 9, padding: '0 10px 10px', borderTop: `1px solid ${ui.border}` });
const previewStyle = { width: '100%', maxHeight: 220, objectFit: 'contain', background: '#111', border: `1px solid ${rq.border}` };
const assetActionsStyle = { display: 'flex', gap: 7, flexWrap: 'wrap' };
const primaryButtonStyle = (ui) => ({ minHeight: 34, border: 0, background: ui.accent, color: '#fff', padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' });
const secondaryButtonStyle = (ui) => ({ minHeight: 34, border: `1px solid ${ui.border}`, background: ui.panel, color: ui.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' });
const dangerButtonStyle = { minHeight: 34, border: `1px solid ${rq.danger}`, background: 'transparent', color: '#FCA5A5', padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 900, cursor: 'pointer' };
