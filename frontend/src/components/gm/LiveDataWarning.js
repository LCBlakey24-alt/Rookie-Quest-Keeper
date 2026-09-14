import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { describeLiveLoadErrors } from '@/data/livePlayLoaders';

export default function LiveDataWarning({ errors = [], onRetry, compact = false }) {
  if (!errors.length) return null;
  const failed = describeLiveLoadErrors(errors);

  return (
    <div role="alert" data-testid="live-data-warning" style={{
      display: 'flex',
      alignItems: compact ? 'center' : 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      padding: compact ? '8px 10px' : '10px 12px',
      border: '1px solid rgba(255,45,170,0.45)',
      background: 'rgba(255,45,170,0.08)',
      color: 'var(--rq-text-primary, #fff)',
      fontSize: 12,
      lineHeight: 1.4,
    }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 }}>
        <AlertTriangle size={16} color="#FF2DAA" style={{ marginTop: 1, flex: '0 0 auto' }} />
        <span>
          <strong>Some Live Play data could not load.</strong>{' '}
          Could not refresh {failed}. Existing data has been kept where available; empty-looking sections may be incomplete.
        </span>
      </span>
      {onRetry && (
        <button type="button" onClick={onRetry} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, flex: '0 0 auto',
          border: '1px solid rgba(124,203,255,0.45)', background: '#0A2A43', color: '#fff',
          padding: '6px 9px', fontWeight: 800, cursor: 'pointer',
        }}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </div>
  );
}
