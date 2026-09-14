import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Monitor, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const FRESH_ACK_MS = 20000;

function parsedTime(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

export function derivePlayerDisplayDeliveryStatus(state, nowMs = Date.now()) {
  const syncId = String(state?.sync_id || '').trim();
  const acknowledgement = state?.delivery_ack && typeof state.delivery_ack === 'object' ? state.delivery_ack : {};
  const ackSyncId = String(acknowledgement.sync_id || '').trim();
  const updatedAt = parsedTime(state?.updated_at);
  const acknowledgedAt = parsedTime(acknowledgement.acknowledged_at);
  const acknowledgementAge = acknowledgedAt ? Math.max(0, nowMs - acknowledgedAt) : Infinity;
  const fresh = acknowledgementAge <= FRESH_ACK_MS;
  const exactState = Boolean(syncId && ackSyncId && syncId === ackSyncId);
  const afterLatestUpdate = Boolean(acknowledgedAt && (!updatedAt || acknowledgedAt >= updatedAt));

  if (!syncId) {
    return {
      state: 'waiting',
      label: 'Waiting for the first player-display sync.',
      detail: 'Open the player display and send a reveal when you are ready.',
    };
  }

  if (exactState && afterLatestUpdate && fresh) {
    return {
      state: 'received',
      label: 'Player display connected · latest update received.',
      detail: acknowledgement.display_target ? `Confirmed on ${acknowledgement.display_target}.` : 'The active screen confirmed this reveal.',
    };
  }

  if (fresh) {
    return {
      state: 'pending',
      label: 'Player display connected · waiting for the latest update.',
      detail: exactState
        ? 'The screen is online, but has not yet confirmed the newest change.'
        : 'The screen is online, but its last acknowledgement belongs to the previous reveal.',
    };
  }

  if (acknowledgedAt) {
    const seconds = Math.max(1, Math.round(acknowledgementAge / 1000));
    return {
      state: 'stale',
      label: 'Player display acknowledgement is stale.',
      detail: `Last confirmed ${seconds}s ago. Check the TV/table or its connection.`,
    };
  }

  return {
    state: 'unacknowledged',
    label: 'No active player display acknowledgement.',
    detail: 'Open the TV/table display to confirm that reveals are actually being received.',
  };
}

export default function PlayerDisplayDeliveryStatus({ campaignId, pollMs = 4000 }) {
  const [displayState, setDisplayState] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  const refresh = useCallback(async ({ manual = false } = {}) => {
    if (!campaignId) return;
    if (manual) setRefreshing(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/display-state`);
      setDisplayState(response?.data || null);
      setLoadError(false);
      setClock(Date.now());
    } catch {
      setLoadError(true);
      setClock(Date.now());
    } finally {
      if (manual) setRefreshing(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return undefined;
    let active = true;
    const run = async () => {
      if (!active) return;
      await refresh();
    };
    run();
    const timer = window.setInterval(run, Math.max(2500, Number(pollMs) || 4000));
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [campaignId, pollMs, refresh]);

  const delivery = useMemo(
    () => derivePlayerDisplayDeliveryStatus(displayState, clock),
    [displayState, clock],
  );

  const view = loadError
    ? {
        state: 'error',
        label: 'Could not check player display delivery.',
        detail: 'The last known campaign state has been left untouched. Retry when the connection is available.',
      }
    : delivery;
  const Icon = view.state === 'received' ? CheckCircle2 : view.state === 'pending' || view.state === 'waiting' ? Monitor : AlertTriangle;

  return (
    <section
      role="status"
      data-testid="player-display-delivery-status"
      data-delivery-state={view.state}
      style={shellStyle(view.state)}
    >
      <Icon size={16} />
      <span style={copyStyle}>
        <strong>Player Display</strong>
        <span>{view.label}</span>
        <small>{view.detail}</small>
      </span>
      <button
        type="button"
        onClick={() => refresh({ manual: true })}
        disabled={refreshing}
        style={buttonStyle}
      >
        <RefreshCw size={13} /> {refreshing ? 'Checking…' : 'Check now'}
      </button>
    </section>
  );
}

const shellStyle = (state) => ({
  display: 'grid',
  gridTemplateColumns: 'auto minmax(0,1fr) auto',
  gap: 9,
  alignItems: 'center',
  minHeight: 44,
  padding: '7px 10px',
  background: 'var(--rq-bg-panel)',
  border: `1px solid ${state === 'received' ? 'rgba(124,203,255,0.46)' : state === 'pending' || state === 'waiting' ? 'rgba(255,45,170,0.36)' : 'rgba(245,158,11,0.42)'}`,
  color: 'var(--rq-text-primary)',
  fontSize: 11,
});
const copyStyle = { minWidth: 0, display: 'grid', gap: 1 };
const buttonStyle = {
  minHeight: 30,
  border: '1px solid var(--rq-border-default)',
  background: 'var(--rq-card)',
  color: 'var(--rq-text-primary)',
  padding: '0 8px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 10,
  fontWeight: 900,
  cursor: 'pointer',
};
