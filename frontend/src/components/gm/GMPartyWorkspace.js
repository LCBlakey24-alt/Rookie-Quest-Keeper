import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, Shield, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import PlayersTab from '@/components/tabs/PlayersTab';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#fff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const STATUSES = ['pending', 'active', 'dead', 'retired', 'removed'];

function nice(value = '') {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

export default function GMPartyWorkspace({ campaignId }) {
  const [members, setMembers] = useState([]);
  const [party, setParty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [showLegacy, setShowLegacy] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const [memberRes, partyRes] = await Promise.all([
        apiClient.get(`/campaign-invites/${campaignId}/members`).catch(() => ({ data: [] })),
        apiClient.get(`/campaigns/${campaignId}/live-party`).catch(() => ({ data: [] })),
      ]);
      setMembers(Array.isArray(memberRes.data) ? memberRes.data : []);
      setParty(Array.isArray(partyRes.data) ? partyRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load party');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const partyByCharacter = useMemo(() => Object.fromEntries(party.filter(row => row.character_id).map(row => [row.character_id, row])), [party]);
  const legacy = useMemo(() => party.filter(row => row.source === 'legacy'), [party]);
  const visibleMembers = useMemo(() => [...members].sort((a, b) => {
    const rank = { pending: 0, active: 1, dead: 2, retired: 3, removed: 4 };
    return (rank[a.status || 'active'] ?? 9) - (rank[b.status || 'active'] ?? 9);
  }), [members]);

  const updateStatus = async (member, status) => {
    setSavingId(member.id);
    try {
      await apiClient.put(`/campaign-invites/${campaignId}/members/${member.id}/status`, { status });
      setMembers(prev => prev.map(item => item.id === member.id ? { ...item, status } : item));
      await load();
      toast.success(`${member.character_name || member.username || 'Character'} marked ${nice(status)}`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update player status');
    } finally {
      setSavingId('');
    }
  };

  if (loading) return <div style={emptyStyle}>Loading party…</div>;

  return (
    <div data-testid="gm-party-workspace" style={shellStyle}>
      <div style={toolbarStyle}>
        <div style={toolbarTitleStyle}><Users size={16} /><strong>Joined Characters</strong><span style={countStyle}>{members.length}</span></div>
        <button type="button" onClick={load} style={smallButtonStyle}><RefreshCw size={13} /> Refresh</button>
      </div>

      {visibleMembers.length === 0 && (
        <section style={emptyStyle}>No joined characters yet. Share the join code above and they will appear here.</section>
      )}

      <section style={gridStyle}>
        {visibleMembers.map(member => {
          const live = partyByCharacter[member.character_id] || {};
          const status = member.status || 'active';
          const pending = status === 'pending';
          return (
            <article key={member.id} style={cardStyle(pending)}>
              <div style={cardTopStyle}>
                <span style={avatarStyle}>{pending ? <AlertCircle size={16} /> : <UserCheck size={16} />}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <strong style={nameStyle}>{member.character_name || live.name || member.username || 'Unnamed Character'}</strong>
                  <span style={metaStyle}>{member.character_class || live.character_class || 'Character'}{member.character_level || live.level ? ` · Level ${member.character_level || live.level}` : ''}</span>
                </span>
                <span style={statusPillStyle(pending)}>{nice(status)}</span>
              </div>

              {status === 'active' && (
                <div style={statsStyle}>
                  <Stat label="HP" value={`${live.hp ?? '?'} / ${live.max_hp ?? '?'}`} />
                  <Stat label="AC" value={live.ac ?? '?'} />
                  <Stat label="Init" value={live.initiativeMod === undefined ? '?' : `${live.initiativeMod >= 0 ? '+' : ''}${live.initiativeMod}`} />
                </div>
              )}

              <div style={actionsStyle}>
                {pending && <button type="button" disabled={savingId === member.id} onClick={() => updateStatus(member, 'active')} style={approveButtonStyle}><CheckCircle2 size={13} /> Approve</button>}
                <select value={status} disabled={savingId === member.id} onChange={event => updateStatus(member, event.target.value)} style={statusSelectStyle}>
                  {STATUSES.map(option => <option key={option} value={option}>{nice(option)}</option>)}
                </select>
              </div>
            </article>
          );
        })}
      </section>

      {legacy.length > 0 && (
        <section style={legacyNoticeStyle}>
          <Shield size={14} />
          <span><strong>{legacy.length} legacy GM roster record{legacy.length === 1 ? '' : 's'}</strong> are still available as combat fallbacks.</span>
        </section>
      )}

      <button type="button" onClick={() => setShowLegacy(prev => !prev)} style={legacyToggleStyle}>
        <Shield size={14} /> {showLegacy ? 'Hide Legacy Manual Roster' : 'Legacy Manual Roster'}
      </button>
      {showLegacy && (
        <section style={legacyBodyStyle}>
          <p style={legacyTextStyle}>Compatibility tool for older campaigns. New players should normally join with their own character instead.</p>
          <PlayersTab campaignId={campaignId} />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return <span style={statStyle}><small>{label}</small><strong>{value}</strong></span>;
}

const shellStyle = { display: 'grid', gap: 8, minWidth: 0, color: rq.text, fontFamily: fontStack };
const toolbarStyle = { minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: rq.panel, border: `1px solid ${rq.line}`, padding: '0 8px' };
const toolbarTitleStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 };
const countStyle = { color: rq.muted, fontSize: 10 };
const smallButtonStyle = { minHeight: 30, border: `1px solid ${rq.line}`, background: rq.card, color: rq.soft, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 850 };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 };
const cardStyle = pending => ({ display: 'grid', gap: 7, background: rq.card, border: `1px solid ${pending ? rq.red : rq.line}`, borderLeft: `4px solid ${pending ? rq.red : rq.line}`, padding: 8, minWidth: 0 });
const cardTopStyle = { display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 };
const avatarStyle = { width: 30, height: 30, display: 'grid', placeItems: 'center', background: rq.bg, flex: '0 0 30px' };
const nameStyle = { display: 'block', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const metaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const statusPillStyle = pending => ({ padding: '3px 5px', background: pending ? rq.red : rq.bg, color: '#fff', fontSize: 8, fontWeight: 950, textTransform: 'uppercase', whiteSpace: 'nowrap' });
const statsStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 };
const statStyle = { minHeight: 38, background: rq.bg, border: `1px solid ${rq.line}`, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 1, fontSize: 11 };
const actionsStyle = { display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' };
const approveButtonStyle = { minHeight: 30, border: 0, background: rq.red, color: '#fff', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 900, cursor: 'pointer' };
const statusSelectStyle = { minHeight: 30, flex: 1, minWidth: 100, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, padding: '0 6px', fontSize: 10 };
const legacyNoticeStyle = { display: 'flex', alignItems: 'center', gap: 6, background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, padding: 7, fontSize: 10 };
const legacyToggleStyle = { minHeight: 38, border: `1px solid ${rq.line}`, background: rq.panel, color: rq.soft, padding: '0 9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6, cursor: 'pointer', fontWeight: 850, fontSize: 10 };
const legacyBodyStyle = { border: `1px solid ${rq.line}`, background: rq.bg, padding: 8, minWidth: 0 };
const legacyTextStyle = { margin: '0 0 8px', color: rq.muted, fontSize: 10 };
const emptyStyle = { minHeight: 90, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px solid ${rq.line}`, color: rq.muted, textAlign: 'center', padding: 14, fontSize: 11 };
