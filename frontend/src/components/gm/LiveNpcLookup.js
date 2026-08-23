import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronRight, FileText, MapPin, RefreshCw, Search, Swords, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import {
  describeLiveNpcLookupFailures,
  fetchLiveNpcLookupSections,
} from '@/components/gm/liveNpcLookupData';

const rq = {
  bg: '#0a1728', panel: '#102238', card: '#14283e', red: '#d00000',
  text: '#f7f9fc', soft: 'rgba(229,237,247,0.74)', muted: 'rgba(202,216,233,0.58)', line: 'rgba(181,203,226,0.16)',
};

const safeArray = value => Array.isArray(value) ? value : [];
const normalize = value => String(value || '').trim().toLowerCase();

export function queueNpcForEncounterStorage(storage, campaignId, npcId) {
  if (!storage || !campaignId || !npcId) return false;
  try {
    const key = `gm.liveEncounterNpcQueue.${campaignId}`;
    let current = [];
    try {
      const parsed = JSON.parse(storage.getItem(key) || '[]');
      current = Array.isArray(parsed) ? parsed : [];
    } catch {
      current = [];
    }
    storage.setItem(key, JSON.stringify([...new Set([...current, npcId])]));
    return true;
  } catch {
    return false;
  }
}

export default function LiveNpcLookup({ campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [companionIds, setCompanionIds] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [loadWarning, setLoadWarning] = useState('');
  const activeCampaignRef = useRef('');

  const load = useCallback(async ({ notifyFailure = true } = {}) => {
    if (!campaignId) return { ok: false, failures: ['campaign'] };
    const requestedCampaign = campaignId;
    const result = await fetchLiveNpcLookupSections(apiClient, requestedCampaign);
    if (activeCampaignRef.current !== requestedCampaign) return { ...result, stale: true };

    if (result.npcs !== null) setNpcs(result.npcs);
    if (result.locations !== null) setLocations(result.locations);
    if (result.companionIds !== null) setCompanionIds(result.companionIds);

    if (result.ok) {
      setLoadWarning('');
    } else {
      const description = describeLiveNpcLookupFailures(result.failures);
      setLoadWarning(description);
      if (notifyFailure) toast.warning('Some NPC lookup data could not be refreshed', { description });
    }

    return result;
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return undefined;
    let alive = true;
    activeCampaignRef.current = campaignId;

    // Campaign switches intentionally clear campaign-bound state. Same-campaign
    // retries preserve the last successful data instead.
    setNpcs([]);
    setLocations([]);
    setCompanionIds([]);
    setExpandedId('');
    setLoadWarning('');
    setLoading(true);

    try {
      const requested = localStorage.getItem(`gm.liveNpcSearch.${campaignId}`) || '';
      if (requested) {
        setSearch(requested);
        localStorage.removeItem(`gm.liveNpcSearch.${campaignId}`);
      } else {
        setSearch('');
      }
    } catch {
      setSearch('');
    }

    load({ notifyFailure: true }).finally(() => {
      if (alive && activeCampaignRef.current === campaignId) setLoading(false);
    });

    return () => { alive = false; };
  }, [campaignId, load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const result = await load({ notifyFailure: true });
      if (result?.ok && !result?.stale) toast.success('NPC lookup refreshed');
    } finally {
      if (activeCampaignRef.current === campaignId) setRefreshing(false);
    }
  };

  const locationFor = npc => {
    if (npc.location_id) {
      const byId = locations.find(item => item.id === npc.location_id);
      if (byId) return byId;
    }
    if (npc.location) return locations.find(item => normalize(item.name) === normalize(npc.location)) || { name: npc.location };
    return null;
  };

  const filtered = useMemo(() => {
    const term = normalize(search);
    const sorted = [...npcs].sort((a, b) => {
      const aCompanion = companionIds.includes(a.id) ? 0 : 1;
      const bCompanion = companionIds.includes(b.id) ? 0 : 1;
      if (aCompanion !== bCompanion) return aCompanion - bCompanion;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    if (!term) return sorted;
    return sorted.filter(npc => [npc.name, npc.role, npc.occupation, npc.location, locationFor(npc)?.name, npc.description, npc.notes].some(value => normalize(value).includes(term)));
  }, [companionIds, locations, npcs, search]);

  const saveCompanionState = async npc => {
    const travelling = companionIds.includes(npc.id);
    const next = travelling ? companionIds.filter(id => id !== npc.id) : [...new Set([...companionIds, npc.id])];
    setSavingId(npc.id);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/live-state`, { companion_npc_ids: next });
      const returned = safeArray(response.data?.companion_npc_ids);
      setCompanionIds(returned.length || next.length === 0 ? returned : next);
      toast.success(travelling ? `${npc.name} left the travelling party` : `${npc.name} is travelling with the party`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update travelling party');
    } finally {
      setSavingId('');
    }
  };

  const queueForEncounter = npc => {
    if (!queueNpcForEncounterStorage(localStorage, campaignId, npc.id)) {
      toast.error('Could not add this NPC to the encounter handoff');
      return;
    }
    const combatButton = document.querySelector('[data-testid="live-tool-combat"]');
    if (!combatButton?.click) {
      toast.error('Encounter Review is unavailable right now');
      return;
    }
    combatButton.click();
  };

  const openLocation = npc => {
    const location = locationFor(npc);
    if (!location?.name && !location?.id) return;
    try { localStorage.setItem(`gm.liveLocationFocus.${campaignId}`, JSON.stringify({ id: location.id || '', name: location.name || npc.location || '' })); } catch { /* ignore */ }
    document.querySelector('[data-testid="live-tool-maps"]')?.click?.();
  };

  const quickNote = npc => {
    try { localStorage.setItem(`gm.liveNotePrefill.${campaignId}`, `${npc.name}: `); } catch { /* ignore */ }
    document.querySelector('[data-testid="live-tool-notes"]')?.click?.();
  };

  if (loading) return <div style={emptyStyle}>Loading NPCs…</div>;

  return (
    <div data-testid="live-npc-lookup" style={shellStyle}>
      <label style={searchStyle}><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find NPC by name, role or location" style={searchInputStyle} /></label>
      <div style={summaryStyle}>
        <span style={summaryCopyStyle}><Users size={14} /><strong>{companionIds.length}</strong> travelling · <strong>{filtered.length}</strong> shown</span>
        <button type="button" onClick={refresh} disabled={refreshing} style={refreshStyle} aria-label="Refresh NPC lookup">
          <RefreshCw size={12} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loadWarning && (
        <div data-testid="live-npc-load-warning" role="status" style={warningStyle}>
          <AlertTriangle size={14} style={{ flex: '0 0 auto' }} />
          <span>{loadWarning}</span>
        </div>
      )}

      <div style={listStyle}>
        {filtered.length === 0 && <div style={emptyStyle}>{loadWarning ? 'No matching NPCs in the last known data.' : 'No matching NPCs.'}</div>}
        {filtered.map(npc => {
          const open = expandedId === npc.id;
          const travelling = companionIds.includes(npc.id);
          const location = locationFor(npc);
          return (
            <article key={npc.id} style={cardStyle(travelling)}>
              <button type="button" onClick={() => setExpandedId(open ? '' : npc.id)} style={headerStyle}>
                <span style={chevronStyle}>{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <strong style={nameStyle}>{npc.name || 'Unnamed NPC'}</strong>
                  <span style={metaStyle}>{npc.role || npc.occupation || 'NPC'}{location?.name ? ` · ${location.name}` : ''}</span>
                </span>
                {travelling && <span style={travellingPillStyle}><Check size={11} /> With Party</span>}
              </button>

              {open && (
                <div style={bodyStyle}>
                  {(npc.description || npc.notes || npc.personality) && <div style={detailStyle}>{npc.description || npc.notes || npc.personality}</div>}
                  <div style={actionsStyle}>
                    <button type="button" disabled={savingId === npc.id} onClick={() => saveCompanionState(npc)} style={actionStyle(travelling)}>{travelling ? <X size={13} /> : <UserPlus size={13} />}{travelling ? 'Remove from Party' : 'With Party'}</button>
                    <button type="button" onClick={() => queueForEncounter(npc)} style={actionStyle(false)}><Swords size={13} /> Add to Encounter</button>
                    {(location?.name || location?.id) && <button type="button" onClick={() => openLocation(npc)} style={actionStyle(false)}><MapPin size={13} /> Location</button>}
                    <button type="button" onClick={() => quickNote(npc)} style={actionStyle(false)}><FileText size={13} /> Quick Note</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

const shellStyle = { display: 'grid', gap: 6, color: rq.text };
const searchStyle = { minHeight: 40, display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.muted, padding: '0 9px' };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 38, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 12 };
const summaryStyle = { minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, color: rq.muted, fontSize: 10, padding: '0 3px' };
const summaryCopyStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 };
const refreshStyle = { minHeight: 28, border: `1px solid ${rq.line}`, background: rq.panel, color: rq.soft, padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 9, fontWeight: 850 };
const warningStyle = { minHeight: 38, display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 9px', border: '1px solid rgba(245,158,11,0.42)', borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.08)', color: '#f6c25b', fontSize: 10, lineHeight: 1.4 };
const listStyle = { display: 'grid', gap: 4 };
const cardStyle = travelling => ({ background: rq.panel, border: `1px solid ${travelling ? rq.red : rq.line}`, borderLeft: travelling ? `4px solid ${rq.red}` : `1px solid ${rq.line}` });
const headerStyle = { width: '100%', minHeight: 48, border: 0, background: rq.card, color: rq.text, padding: '6px 8px', display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) auto', alignItems: 'center', gap: 5, cursor: 'pointer' };
const chevronStyle = { display: 'grid', placeItems: 'center', color: rq.muted };
const nameStyle = { display: 'block', fontSize: 12, fontWeight: 950, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
const metaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' };
const travellingPillStyle = { minHeight: 23, padding: '0 6px', background: 'rgba(208,0,0,0.15)', border: `1px solid ${rq.red}`, color: rq.text, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 8, fontWeight: 950, whiteSpace: 'nowrap' };
const bodyStyle = { display: 'grid', gap: 6, padding: 7, borderTop: `1px solid ${rq.line}` };
const detailStyle = { background: rq.bg, color: rq.soft, padding: 7, fontSize: 10, lineHeight: 1.4, maxHeight: 110, overflowY: 'auto' };
const actionsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 4 };
const actionStyle = active => ({ minHeight: 34, border: `1px solid ${active ? rq.red : rq.line}`, background: active ? 'rgba(208,0,0,0.15)' : rq.bg, color: rq.text, padding: '0 7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 9, fontWeight: 900 });
const emptyStyle = { minHeight: 70, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px dashed ${rq.line}`, color: rq.muted, fontSize: 10, textAlign: 'center', padding: 10 };
