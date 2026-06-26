import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { levelUpTheme as theme } from './levelUpTheme';

export default function LevelUpFooter({ step, confirmStepPos, loading, canProceed, onClose, onBack, onNext, onConfirm }) {
  const secondaryButtonStyle = {
    flex: 1,
    padding: '14px',
    background: 'transparent',
    border: 0,
    borderRadius: 0,
    color: theme.text.secondary,
    boxShadow: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  };

  const primaryButtonStyle = {
    flex: 2,
    padding: '14px',
    background: canProceed ? 'var(--rq-primary, #d8ad4f)' : 'transparent',
    backgroundImage: 'none',
    border: 0,
    borderRadius: 0,
    color: canProceed ? 'var(--rq-bg, #070814)' : theme.text.muted,
    boxShadow: 'none',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    opacity: canProceed ? 1 : 0.5
  };

  return (
    <div style={{
      padding: '16px 0 0',
      borderTop: '1px solid var(--rq-line, rgba(246, 234, 210, 0.18))',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '12px'
    }}>
      {step > 1 ? (
        <Button onClick={onBack} style={secondaryButtonStyle}>
          <ChevronLeft size={18} /> Back
        </Button>
      ) : (
        <Button onClick={onClose} style={secondaryButtonStyle}>
          Cancel
        </Button>
      )}

      {step === confirmStepPos ? (
        <Button
          onClick={onConfirm}
          disabled={loading}
          style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1 }}
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
          style={primaryButtonStyle}
        >
          Next <ChevronRight size={18} />
        </Button>
      )}
    </div>
  );
}
