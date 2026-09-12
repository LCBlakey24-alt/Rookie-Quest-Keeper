import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Dices, RefreshCw, Swords } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const ACTIVE_POLL_MS = 4000;
const IDLE_POLL_MS = 15000;

const theme = {
  bg: '#071522',
  panel: '#0C2234',
  card: '#102B40',
  cardHover: '#14344C',
  input: '#081B2A',
  text: '#FFFFFF',
  line: 'rgba(255,45,170,.18)',
  lineStrong: '#FF2DAA',
  blue: '#7CCBFF',
  blueSoft: 'rgba(124,203,255,.10)',
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
  }, [load]);

  useEffect(() => {
    if (!campaignId) return undefined;

    const pollMs = state?.combat_active ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    const refreshIfVisible = () => {
      if (document.visibilityState !== 'hidden') load();
    };
    const timer = window.setInterval(refreshIfVisible, pollMs);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [campaignId, load, state?.combat_active]);

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
        <span style={iconWrapStyle}><Swords size={16} color={theme.blue} /></span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <strong style={titleStyle}>Initiative</strong>
          <small style={subtitleStyle}>Combat is active · enter your total or roll here</small>
        </span>
        <button type="button" onClick={load} style={iconButtonStyle} title="Refresh initiative status"><RefreshCw size={13} color={theme.blue} /></button>
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
          <Check size={14} color={theme.blue} /> Submit
        </button>
        <button type="button" onClick={roll} disabled={submitting} style={rollStyle}>
          <Dices size={14} color={theme.blue} /> Roll {bonus ? `(${bonus >= 0 ? '+' : ''}${bonus})` : ''}
        </button>
      </div>
      <span style={statusStyle}>{statusText}</span>
    </section>
  );
}

const shellStyle = {
  background: theme.panel,
  backgroundImage: 'none',
  border: `1px solid ${theme.line}`,
  borderLeft: `1px solid ${theme.lineStrong}`,
  borderRadius: 7,
  color: theme.text,
  display: 'grid',
  gap: 8,
  boxShadow: 'none',
};
const headerStyle = { display: 'flex', gap: 8, alignItems: 'center' };
const iconWrapStyle = { width: 32, height: 32, background: theme.blueSoft, border: `1px solid ${theme.line}`, borderRadius: 5, display: 'grid', placeItems: 'center', flex: '0 0 32px' };
const titleStyle = { display: 'block', color: theme.text, fontSize: 13, fontWeight: 900 };
const subtitleStyle = { display: 'block', marginTop: 1, color: theme.text, fontSize: 11, lineHeight: 1.3 };
const iconButtonStyle = { width: 32, height: 32, border: `1px solid ${theme.line}`, borderRadius: 5, background: theme.card, color: theme.text, display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: 'none' };
const controlsStyle = { display: 'grid', gridTemplateColumns: 'minmax(72px, 1fr) auto auto', gap: 5, alignItems: 'end' };
const fieldStyle = { display: 'grid', gap: 3, color: theme.text, fontSize: 9, fontWeight: 900, letterSpacing: '.06em', textTransform: 'uppercase' };
const inputStyle = { width: '100%', minWidth: 0, height: 38, boxSizing: 'border-box', background: theme.input, border: `1px solid ${theme.line}`, borderRadius: 5, color: theme.text, padding: '0 8px', fontSize: 13, outline: 'none', boxShadow: 'none' };
const submitStyle = { height: 38, border: `1px solid ${theme.lineStrong}`, borderRadius: 5, background: theme.card, color: theme.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 900, boxShadow: 'none' };
const rollStyle = { height: 38, border: `1px solid ${theme.line}`, borderRadius: 5, background: theme.card, color: theme.text, padding: '0 9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 850, boxShadow: 'none' };
const statusStyle = { color: theme.text, fontSize: 11, lineHeight: 1.35 };
