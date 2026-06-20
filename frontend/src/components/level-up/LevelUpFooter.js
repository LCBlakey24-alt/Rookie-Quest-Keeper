import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { levelUpTheme as theme } from './levelUpTheme';

export default function LevelUpFooter({ step, confirmStepPos, loading, canProceed, onClose, onBack, onNext, onConfirm }) {
  return (
    <div style={{
      padding: '16px 24px',
      borderTop: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px'
    }}>
      {step > 1 ? (
        <Button
          onClick={onBack}
          style={{
            flex: 1,
            padding: '14px',
            background: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '10px',
            color: theme.text.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <ChevronLeft size={18} /> Back
        </Button>
      ) : (
        <Button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '14px',
            background: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: '10px',
            color: theme.text.secondary
          }}
        >
          Cancel
        </Button>
      )}

      {step === confirmStepPos ? (
        <Button
          onClick={onConfirm}
          disabled={loading}
          style={{
            flex: 2,
            padding: '14px',
            background: theme.gradient,
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {loading ? 'Leveling Up...' : (
            <>
              <Sparkles size={18} /> Confirm Level Up
            </>
          )}
        </Button>
      ) : (
        <Button
          onClick={onNext}
          disabled={!canProceed}
          style={{
            flex: 2,
            padding: '14px',
            background: canProceed ? theme.gradient : theme.bg.surface,
            border: 'none',
            borderRadius: '10px',
            color: canProceed ? '#fff' : theme.text.muted,
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            opacity: canProceed ? 1 : 0.5
          }}
        >
          Next <ChevronRight size={18} />
        </Button>
      )}
    </div>
  );
}
