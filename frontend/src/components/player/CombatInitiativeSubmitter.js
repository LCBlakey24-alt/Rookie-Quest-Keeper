import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Dices, RefreshCw, Swords } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const theme = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', muted: 'rgba(255,255,255,.72)', soft: 'rgba(255,255,255,.55)', line: 'rgba(255,255,255,.16)',
};

export default function CombatInitiativeSubmitter({ campaignId, compact = false }) {
  const [state, setState] = useState(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/combat-initiative/mine`);
      const next = response.data || null;
      setState(next);
      if (next?.submission?.initiative !== undefined && next?.submission?.initiative !== null) {
        setValue(String(next.submission.initiative));
      }
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  const character = state?.character || null;
  const active = Boolean(state?.combat_active && character);
  const bonus = Number(character?.initiative_bonus || 0);
  const submitted = state?.submission || null;

  const statusText = useMemo(() => {
    if (!active) return '';
    if (submitted) return `${character.name} submitted ${submitted.initiative}${submitted.method === 'rolled' ? ' (rolled)' : ''}`;
    return `${character.name} has not submitted initiative yet.`;
  }, [active, character, submitted]);

  if (loading || !active) return null;

  const submit = async (initiative, method = 'manual') => {
    const numeric = Number(initiative);
    if (!Number.isInteger(numeric)) {
      toast.error('Enter a whole-number initiative total');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/combat-initiative/submit`, {
        initiative: numeric,
        method,
      });
      setState(current => ({ ...(current || {}), combat_active: true, submission: response.data }));
      setValue(String(numeric));
      toast.success(`Initiative ${numeric} submitted`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not submit initiative');
    } finally {
      setSubmitting(false);
    }
  };

  const roll = () => {
    const natural = Math.floor(Math.random() * 20) + 1;
    const total = natural + bonus;
    toast.info(`${character.name} rolled ${natural}${bonus ? ` ${bonus >= 0 ? '+' : ''}${bonus}` : ''} = ${total}`);
    submit(total, 'rolled');
  };

  return (
    <section data-testid="player-combat-initiative" style={{ ...shellStyle, padding: compact ? 9 : 11 }}>
      <header style={headerStyle}>
        <span style={iconWrapStyle}><Swords size={16} /></span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <strong style={titleStyle}>Initiative</strong>
          <small style={subtitleStyle}>Combat is active · enter your total or roll here</small>
        </span>
        <button type="button" onClick={load} style={iconButtonStyle} title="Refresh initiative status"><RefreshCw size={13} /></button>
      </header>

      <div style={controlsStyle}>
        <label style={fieldStyle}>Final total
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={event => setValue(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') submit(value, 'manual'); }}
            placeholder="e.g. 17"
            style={inputStyle}
          />
        </label>
        <button type="button" onClick={() => submit(value, 'manual')} disabled={submitting || String(value).trim() === ''} style={submitStyle}>
          <Check size={14} /> Submit
        </button>
        <button type="button" onClick={roll} disabled={submitting} style={rollStyle}>
          <Dices size={14} /> Roll {bonus ? `(${bonus >= 0 ? '+' : ''}${bonus})` : ''}
        </button>
      </div>
      <span style={statusStyle}>{statusText}</span>
    </section>
  );
}

const shellStyle = { background: theme.panel, border: `1px solid ${theme.line}`, borderLeft: `5px solid ${theme.red}`, color: theme.text, display: 'grid', gap: 8 };
const headerStyle = { display: 'flex', gap: 8, alignItems: 'center' };
const iconWrapStyle = { width: 32, height: 32, background: 'rgba(208,0,0,.14)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 32px' };
const titleStyle = { display: 'block', color: theme.text, fontSize: 13, fontWeight: 950 };
const subtitleStyle = { display: 'block', marginTop: 1, color: theme.soft, fontSize: 9 };
const iconButtonStyle = { width: 30, height: 30, border: `1px solid ${theme.line}`, background: theme.bg, color: theme.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const controlsStyle = { display: 'grid', gridTemplateColumns: 'minmax(80px,1fr) auto auto', gap: 5, alignItems: 'end' };
const fieldStyle = { display: 'grid', gap: 2, color: theme.soft, fontSize: 8, fontWeight: 900, textTransform: 'uppercase' };
const inputStyle = { width: '100%', minWidth: 0, height: 36, boxSizing: 'border-box', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.text, padding: '0 8px', fontSize: 13 };
const submitStyle = { height: 36, border: 0, background: theme.red, color: '#fff', padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 950 };
const rollStyle = { height: 36, border: `1px solid ${theme.line}`, background: theme.card, color: theme.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 900 };
const statusStyle = { color: theme.soft, fontSize: 9, lineHeight: 1.35 };
