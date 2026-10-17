import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { CHAOS_COSTS, EMPTY_CHAOS_FATE, FATE_EFFECTS, normaliseChaosFate, undoChaosFate, updateChaosFate } from '@/data/chaosFateTokens';

// DM-facing only. Both campaign prep and Live Play read/write the same
// campaign-scoped state. No automatic grants or player-facing spoilers.
export default function ChaosFateTracker({ campaignId, compact = false }) {
  const [state, setState] = useState(EMPTY_CHAOS_FATE);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enemy, setEnemy] = useState('');
  const [amount, setAmount] = useState(1);
  const load = useCallback(async () => {
    if (!campaignId) return;
    try {
      const result = await apiClient.get(`/campaigns/${campaignId}/chaos-fate`);
      setState(normaliseChaosFate(result.data));
    } catch {
      toast.error('Could not load the Chaos/Fate ledger. No changes were made.');
    } finally { setLoading(false); }
  }, [campaignId]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  const act = async (action) => {
    if (busy || loading) return;
    setBusy(true);
    try {
      if (action === 'commit' && !window.confirm(`Before initiative, spend ${amount} DM Fate Token(s) and roll ${amount}d8? Apply upgrades to ${enemy || 'the enemies you choose'}.`)) return;
      if (action === 'undo' && !window.confirm('Undo the last Chaos/Fate operation?')) return;
      const next = action === 'undo' ? undoChaosFate(state) : updateChaosFate(state, action, amount, enemy);
      const response = await apiClient.put(`/campaigns/${campaignId}/chaos-fate`, next);
      setState(normaliseChaosFate(response.data));
      toast.success(action === 'award' ? 'Chaos awarded' : action === 'spend' ? 'Chaos spent; Fate granted to GM' : action === 'commit' ? 'Fate committed — assign rolled upgrades' : 'Last token operation undone');
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || 'Unable to save tokens');
      load();
    } finally { setBusy(false); }
  };
  const latest = state.history[state.history.length - 1];
  const buttonStyle = { border: '1px solid var(--rq-border-default)', background: 'var(--rq-card)', color: 'var(--rq-text-primary)', borderRadius: 7, padding: '8px 12px', cursor: 'pointer' };
  return (
    <section data-testid="chaos-fate-tracker" style={{ padding: 14, background: 'var(--rq-bg-panel)', border: '1px solid var(--rq-border-default)', borderRadius: 10, color: 'var(--rq-text-primary)', display: 'grid', gap: 12 }}>
      <header>
        <h3 style={{ margin: 0 }}>Chaos &amp; Fate · Shared Party Tokens</h3>
        <small>DM only · Each Chaos Token spent immediately grants 1 Fate Token. Fate upgrades stack.</small>
      </header>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 120, padding: 10, background: '#20374b', borderRadius: 8 }}>
          <small>Player pool</small>
          <div style={{ fontSize: 32, fontWeight: 800 }} data-testid="chaos-count">{state.chaos}</div>
          <strong>Chaos</strong>
        </div>
        <div style={{ flex: 1, minWidth: 120, padding: 10, background: '#463522', borderRadius: 8 }}>
          <small>GM bank</small>
          <div style={{ fontSize: 32, fontWeight: 800 }} data-testid="fate-count">{state.fate}</div>
          <strong>Fate</strong>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label>Amount <input aria-label="Token amount" type="number" min="1" max="100" value={amount} onChange={e => setAmount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))} style={{ ...buttonStyle, width: 65 }} /></label>
        <button type="button" style={buttonStyle} disabled={busy || loading} onClick={() => act('award')}>+ Award Chaos</button>
        <button type="button" style={buttonStyle} disabled={busy || loading || state.chaos < amount} onClick={() => act('spend')}>Spend Chaos → + Fate</button>
        <button type="button" style={buttonStyle} disabled={busy || loading || state.fate < amount} onClick={() => act('commit')}>Commit Fate · roll d8</button>
        <button type="button" style={buttonStyle} disabled={busy || loading || !state.history.length} onClick={() => act('undo')}>Undo last</button>
        <button type="button" style={buttonStyle} disabled={busy || loading} onClick={load}>Refresh tokens</button>
      </div>
      <label>Enemy assigned Fate upgrades (optional) <input value={enemy} onChange={e => setEnemy(e.target.value)} placeholder="e.g. Old Gate captain" maxLength={120} style={{ ...buttonStyle, width: '100%', marginTop: 5 }} /></label>
      {latest?.action === 'commit' && <div role="status" style={{ padding: 10, border: '1px solid #8f6d30', borderRadius: 6 }}>
        <strong>Last Fate roll{latest.rolls.length > 1 ? 's' : ''}{latest.enemy ? ` — ${latest.enemy}` : ''}</strong>
        {latest.rolls.map((roll, index) => <div key={index}>d8 {roll}: {FATE_EFFECTS[roll - 1]}</div>)}
        <small>Apply these bonuses manually to the selected enemy card before initiative. They are not yet automatically applied to combatants.</small>
      </div>}
      {!compact && <>
        <details><summary>Chaos costs and effects</summary>
          {CHAOS_COSTS.map(item => <div key={item.cost} style={{ marginTop: 8 }}><strong>{item.cost} token{item.cost > 1 ? 's' : ''}</strong>: {item.effects.join('; ')}</div>)}
        </details>
        <details><summary>Fate d8 effects</summary>
          {FATE_EFFECTS.map((effect, index) => <div key={index}>{index + 1}. {effect}</div>)}
        </details>
        <details><summary>Recent operations ({state.history.length})</summary>
          {state.history.slice(-12).reverse().map((item, index) => <div key={item.timestamp + index} style={{ padding: 5, fontSize: 12 }}>{item.action}: {item.amount} · {new Date(item.timestamp).toLocaleString()}{item.enemy ? ` · ${item.enemy}` : ''}</div>)}
        </details>
      </>}
    </section>
  );
}
