import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, FileText, Loader, MapPin, RefreshCw, Save, Sparkles, Swords, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const TYPES = [
  { id: 'npc', label: 'NPC', icon: UserRound, placeholder: 'A retired elven scout who now advises the city watch…' },
  { id: 'location', label: 'Location', icon: MapPin, placeholder: 'A ruined riverside district being reclaimed after the city fell…' },
  { id: 'creature', label: 'Creature', icon: Sparkles, placeholder: 'A CR 3 plant creature grown from corrupted river roots…' },
  { id: 'quest', label: 'Quest', icon: FileText, placeholder: 'The party needs to discover why children are disappearing near the river and bring the culprit to justice…' },
  { id: 'encounter', label: 'Encounter', icon: Swords, placeholder: 'A three-wave defence at a broken riverside wall, with the enemy trying to reach the evacuation route…' },
];

const FIELD_ORDER = {
  npc: ['name', 'race', 'class_name', 'level', 'role', 'alignment', 'description', 'appearance', 'personality', 'backstory', 'location', 'hp', 'max_hp', 'ac', 'speed', 'proficiency_bonus', 'stats', 'saving_throws', 'skills', 'attacks', 'abilities', 'notes'],
  location: ['name', 'location_type', 'description', 'notable_npcs', 'places_of_interest', 'notes'],
  creature: ['name', 'cr', 'type', 'size', 'hp', 'ac', 'speed', 'abilities', 'description'],
  quest: ['title', 'summary', 'hook', 'status', 'objectives', 'gm_notes', 'linked_npc_ids', 'linked_location_ids', 'linked_encounter_ids', 'linked_map_ids', 'linked_handout_ids', 'linked_reward_ids', 'is_pinned'],
  encounter: ['name', 'description', 'combatants'],
};

const LONG_FIELDS = new Set([
  'description', 'appearance', 'personality', 'backstory', 'notes', 'abilities', 'attacks',
  'places_of_interest', 'stats', 'saving_throws', 'skills', 'summary', 'hook', 'gm_notes',
  'objectives', 'combatants', 'linked_npc_ids', 'linked_location_ids', 'linked_encounter_ids',
  'linked_map_ids', 'linked_handout_ids', 'linked_reward_ids',
]);

function titleFor(key) {
  return String(key || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function valuesFromData(data = {}) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [
    key,
    value && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? ''),
  ]));
}

function decodeValues(values, source = {}) {
  const result = {};
  for (const [key, raw] of Object.entries(values)) {
    const original = source[key];
    if (Array.isArray(original) || (original && typeof original === 'object')) {
      result[key] = raw.trim() ? JSON.parse(raw) : (Array.isArray(original) ? [] : {});
    } else if (typeof original === 'number') {
      const numeric = Number(raw);
      result[key] = Number.isFinite(numeric) ? numeric : original;
    } else if (typeof original === 'boolean') {
      result[key] = String(raw).toLowerCase() === 'true';
    } else {
      result[key] = raw;
    }
  }
  return result;
}

export default function RookCreateStudio({ campaignId }) {
  const [entityType, setEntityType] = useState('npc');
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState(null);
  const [editorValues, setEditorValues] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const typeMeta = TYPES.find(item => item.id === entityType) || TYPES[0];
  const orderedFields = useMemo(() => {
    if (!draft) return [];
    const preferred = FIELD_ORDER[entityType] || [];
    return [...new Set([...preferred, ...Object.keys(draft)])].filter(key => Object.prototype.hasOwnProperty.call(draft, key));
  }, [draft, entityType]);

  const generate = async (retry = false) => {
    const clean = prompt.trim();
    if (!campaignId || !clean || loading) return;
    setLoading(true);
    try {
      const response = await apiClient.post('/rook/draft', {
        campaign_id: campaignId,
        entity_type: entityType,
        prompt: clean,
        previous_draft: retry ? draft : undefined,
      });
      const data = response.data?.data || {};
      setDraft(data);
      setEditorValues(valuesFromData(data));
      setWarnings(Array.isArray(response.data?.warnings) ? response.data.warnings : []);
      toast.success(retry ? 'Rook made a fresh draft' : 'Rook draft ready', { description: 'Nothing has been saved yet.' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Rook could not create that draft');
    } finally {
      setLoading(false);
    }
  };

  const cancelDraft = () => {
    setDraft(null);
    setEditorValues({});
    setWarnings([]);
  };

  const save = async () => {
    if (!draft || saving) return;
    let data;
    try {
      data = decodeValues(editorValues, draft);
    } catch {
      toast.error('One of the structured fields is not valid JSON yet', { description: 'Check arrays/objects such as objectives, combatants, stats, attacks, abilities, links, or places of interest.' });
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post('/rook/draft/save', {
        campaign_id: campaignId,
        entity_type: entityType,
        data,
      });
      const saved = response.data?.entity;
      toast.success(`${saved?.name || saved?.title || typeMeta.label} saved to campaign`);
      try {
        window.dispatchEvent(new CustomEvent('rook-content-saved', { detail: { entityType, entity: saved } }));
      } catch { /* optional live refresh event */ }
      cancelDraft();
      setPrompt('');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save this Rook draft');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={shellStyle} data-testid="rook-create-studio">
      <div style={typeGridStyle}>
        {TYPES.map(item => {
          const Icon = item.icon;
          const active = item.id === entityType;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setEntityType(item.id); cancelDraft(); }}
              style={typeButtonStyle(active)}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </div>

      {!draft ? (
        <div style={promptCardStyle}>
          <div style={eyebrowStyle}><Sparkles size={12} /> Draft first · GM approves</div>
          <textarea
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder={typeMeta.placeholder}
            rows={5}
            style={promptStyle}
          />
          <button type="button" onClick={() => generate(false)} disabled={!prompt.trim() || loading} style={primaryStyle}>
            {loading ? <Loader size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Rook is drafting…' : `Draft ${typeMeta.label}`}
          </button>
          <span style={safeNoteStyle}>Rook creates a reviewable draft. It is not campaign canon until you press Save.</span>
        </div>
      ) : (
        <div style={draftShellStyle}>
          <header style={draftHeaderStyle}>
            <span><strong>{editorValues.name || editorValues.title || `New ${typeMeta.label}`}</strong><small>Rook draft · editable</small></span>
            <button type="button" onClick={cancelDraft} style={iconButtonStyle} title="Cancel draft"><X size={14} /></button>
          </header>

          {warnings.length > 0 && (
            <details style={warningShellStyle}>
              <summary style={warningSummaryStyle}><AlertTriangle size={13} /> Rook review · {warnings.length} note{warnings.length === 1 ? '' : 's'}</summary>
              <div style={warningListStyle}>{warnings.map((warning, index) => <div key={`${warning}-${index}`}>{warning}</div>)}</div>
            </details>
          )}

          <div style={fieldsStyle}>
            {orderedFields.map(key => {
              const original = draft[key];
              const isLong = LONG_FIELDS.has(key) || Array.isArray(original) || (original && typeof original === 'object');
              return (
                <label key={key} style={fieldStyle}>
                  <span>{titleFor(key)}</span>
                  {isLong ? (
                    <textarea
                      value={editorValues[key] ?? ''}
                      onChange={event => setEditorValues(current => ({ ...current, [key]: event.target.value }))}
                      rows={Array.isArray(original) || (original && typeof original === 'object') ? 5 : 3}
                      style={textareaStyle}
                    />
                  ) : (
                    <input
                      type={typeof original === 'number' ? 'number' : 'text'}
                      value={editorValues[key] ?? ''}
                      onChange={event => setEditorValues(current => ({ ...current, [key]: event.target.value }))}
                      style={inputStyle}
                    />
                  )}
                </label>
              );
            })}
          </div>

          <div style={actionGridStyle}>
            <button type="button" onClick={() => generate(true)} disabled={loading} style={secondaryStyle}>
              {loading ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} Retry
            </button>
            <button type="button" onClick={cancelDraft} style={secondaryStyle}><X size={14} /> Cancel</button>
            <button type="button" onClick={save} disabled={saving} style={saveStyle}>
              {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />} {saving ? 'Saving…' : 'Save to Campaign'}
            </button>
          </div>
          <span style={safeNoteStyle}><Check size={11} /> Edit as much or as little as you want. Saving is always a deliberate GM action.</span>
        </div>
      )}
    </section>
  );
}

const shellStyle = { display: 'grid', gap: 8, minHeight: 0 };
const typeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(80px,1fr))', gap: 4 };
const typeButtonStyle = active => ({ minHeight: 34, border: `1px solid ${active ? '#d00000' : 'rgba(255,255,255,.16)'}`, background: active ? 'rgba(208,0,0,.14)' : '#2f2f2f', color: active ? '#fff' : 'rgba(255,255,255,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 900 });
const promptCardStyle = { display: 'grid', gap: 7, background: '#2f2f2f', border: '1px solid rgba(255,255,255,.16)', padding: 8 };
const eyebrowStyle = { color: 'rgba(255,255,255,.55)', fontSize: 8, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 4 };
const promptStyle = { width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 110, background: '#242424', border: '1px solid rgba(255,255,255,.16)', color: '#fff', padding: 8, fontSize: 11, lineHeight: 1.45 };
const primaryStyle = { minHeight: 38, border: 0, background: '#d00000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 10, fontWeight: 950 };
const safeNoteStyle = { color: 'rgba(255,255,255,.5)', fontSize: 8, lineHeight: 1.35, display: 'flex', alignItems: 'center', gap: 4 };
const draftShellStyle = { display: 'grid', gap: 7, minHeight: 0 };
const draftHeaderStyle = { display: 'flex', justifyContent: 'space-between', gap: 7, alignItems: 'center', background: '#2f2f2f', border: '1px solid rgba(255,255,255,.16)', borderLeft: '4px solid #d00000', padding: 7 };
const iconButtonStyle = { width: 28, height: 28, border: '1px solid rgba(255,255,255,.16)', background: '#242424', color: 'rgba(255,255,255,.6)', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const warningShellStyle = { background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.35)' };
const warningSummaryStyle = { minHeight: 32, padding: '0 7px', display: 'flex', alignItems: 'center', gap: 5, color: '#fbbf24', cursor: 'pointer', fontSize: 9, fontWeight: 900, listStyle: 'none' };
const warningListStyle = { borderTop: '1px solid rgba(245,158,11,.25)', padding: 7, display: 'grid', gap: 4, color: 'rgba(255,255,255,.7)', fontSize: 9, lineHeight: 1.4 };
const fieldsStyle = { minHeight: 0, overflowY: 'auto', display: 'grid', gap: 6, paddingRight: 2 };
const fieldStyle = { display: 'grid', gap: 3, color: 'rgba(255,255,255,.55)', fontSize: 8, fontWeight: 900, textTransform: 'uppercase' };
const inputStyle = { minHeight: 34, width: '100%', boxSizing: 'border-box', background: '#242424', border: '1px solid rgba(255,255,255,.16)', color: '#fff', padding: '0 7px', fontSize: 10 };
const textareaStyle = { width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#242424', border: '1px solid rgba(255,255,255,.16)', color: '#fff', padding: 7, fontSize: 10, lineHeight: 1.4 };
const actionGridStyle = { display: 'grid', gridTemplateColumns: 'auto auto minmax(120px,1fr)', gap: 4 };
const secondaryStyle = { minHeight: 34, border: '1px solid rgba(255,255,255,.16)', background: '#2f2f2f', color: 'rgba(255,255,255,.72)', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', fontSize: 9, fontWeight: 900 };
const saveStyle = { minHeight: 34, border: 0, background: '#d00000', color: '#fff', padding: '0 9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 9, fontWeight: 950 };
