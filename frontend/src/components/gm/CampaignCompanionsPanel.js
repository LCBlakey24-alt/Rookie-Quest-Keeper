import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Plus, RefreshCw, Search, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

export default function CampaignCompanionsPanel({ campaignId, compact = false }) {
  const [npcs, setNpcs] = useState([]);
  const [companionIds, setCompanionIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [npcRes, stateRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/npcs`),
        apiClient.get(`/campaigns/${campaignId}/live-state`).catch(() => ({ data: { companion_npc_ids: [] } })),
      ]);
      setNpcs(Array.isArray(npcRes.data) ? npcRes.data : []);
      setCompanionIds(Array.isArray(stateRes.data?.companion_npc_ids) ? stateRes.data.companion_npc_ids : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load party companions');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const companionNpcs = useMemo(() => companionIds.map(id => npcs.find(npc => npc.id === id)).filter(Boolean), [companionIds, npcs]);
  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return npcs.filter(npc => !companionIds.includes(npc.id) && (!term || [npc.name, npc.location, npc.role, npc.occupation].some(value => String(value || '').toLowerCase().includes(term))));
  }, [companionIds, npcs, search]);

  const saveCompanions = async (nextIds, changedNpc = null, adding = false) => {
    setSavingId(changedNpc?.id || 'saving');
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/live-state`, { companion_npc_ids: nextIds });
      const savedIds = Array.isArray(response.data?.companion_npc_ids) ? response.data.companion_npc_ids : nextIds;
      setCompanionIds(savedIds);
      if (changedNpc) toast.success(adding ? `${changedNpc.name} is travelling with the party` : `${changedNpc.name} left the travelling party`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update travelling party');
    } finally {
      setSavingId('');
    }
  };

  const addCompanion = (npc) => saveCompanions([...new Set([...companionIds, npc.id])], npc, true);
  const removeCompanion = (npc) => saveCompanions(companionIds.filter(id => id !== npc.id), npc, false);

  return (
    <section data-testid="campaign-companions-panel" style={{ ...shellStyle, padding: compact ? 9 : 12 }}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Current Party State</p>
          <h3 style={titleStyle}><Users size={18} /> Travelling NPCs</h3>
          {!compact && <p style={helperStyle}>Temporary companions. This does not rewrite the NPC or any prepared encounter.</p>}
        </div>
        <button type="button" onClick={load} title="Refresh" style={iconButtonStyle}><RefreshCw size={14} /></button>
      </header>

      {loading ? <div style={emptyStyle}>Loading…</div> : (
        <>
          <div style={companionListStyle}>
            {companionNpcs.map(npc => (
              <div key={npc.id} style={companionRowStyle}>
                <span style={statusDotStyle}><Check size={11} /></span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={nameStyle}>{npc.name}</strong>
                  {(npc.location || npc.role || npc.occupation) && <span style={metaStyle}>{npc.role || npc.occupation || 'NPC'}{npc.location ? ` · ${npc.location}` : ''}</span>}
                </span>
                <button type="button" disabled={savingId === npc.id} onClick={() => removeCompanion(npc)} style={removeButtonStyle}><UserMinus size={13} /> Remove</button>
              </div>
            ))}
            {companionNpcs.length === 0 && <div style={emptyStyle}>No NPCs are travelling with the party.</div>}
          </div>

          <div style={searchWrapStyle}><Search size={14} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Add an NPC to the travelling party…" style={searchInputStyle} /></div>
          {search.trim() && (
            <div style={resultsStyle}>
              {available.slice(0, compact ? 5 : 8).map(npc => (
                <button key={npc.id} type="button" disabled={savingId === npc.id} onClick={() => addCompanion(npc)} style={resultButtonStyle}>
                  <Plus size={13} />
                  <span style={{ minWidth: 0, textAlign: 'left' }}><strong style={nameStyle}>{npc.name}</strong>{npc.location && <span style={metaStyle}>{npc.location}</span>}</span>
                </button>
              ))}
              {available.length === 0 && <span style={smallMutedStyle}>No matching NPCs.</span>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

const shellStyle = { background: rq.panel, border: `1px solid ${rq.line}`, borderLeft: `5px solid ${rq.red}`, display: 'grid', gap: 9, color: rq.text, fontFamily: fontStack };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' };
const eyebrowStyle = { margin: 0, color: rq.muted, fontSize: 9, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 7, color: rq.text, fontSize: 17, fontWeight: 950 };
const helperStyle = { margin: '4px 0 0', color: rq.soft, fontSize: 11, lineHeight: 1.35 };
const iconButtonStyle = { width: 30, height: 30, display: 'grid', placeItems: 'center', background: rq.bg, color: rq.soft, border: `1px solid ${rq.line}`, cursor: 'pointer' };
const companionListStyle = { display: 'grid', gap: 4 };
const companionRowStyle = { minHeight: 42, display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, padding: '5px 7px' };
const statusDotStyle = { width: 22, height: 22, display: 'grid', placeItems: 'center', background: rq.red, color: '#fff', flex: '0 0 22px' };
const nameStyle = { display: 'block', color: rq.text, fontSize: 12, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metaStyle = { display: 'block', color: rq.muted, fontSize: 10, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const removeButtonStyle = { minHeight: 28, border: `1px solid ${rq.line}`, background: rq.card, color: rq.soft, padding: '0 7px', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 10, fontWeight: 850 };
const searchWrapStyle = { minHeight: 36, display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.muted, padding: '0 8px' };
const searchInputStyle = { minWidth: 0, flex: 1, minHeight: 34, background: 'transparent', border: 0, outline: 0, color: rq.text, fontFamily: fontStack, fontSize: 11 };
const resultsStyle = { display: 'grid', gap: 3 };
const resultButtonStyle = { minHeight: 36, border: `1px solid ${rq.line}`, background: rq.card, color: rq.text, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' };
const emptyStyle = { minHeight: 34, display: 'grid', placeItems: 'center', color: rq.muted, fontSize: 11, background: rq.bg, padding: 6, textAlign: 'center' };
const smallMutedStyle = { color: rq.muted, fontSize: 10, padding: 4 };
