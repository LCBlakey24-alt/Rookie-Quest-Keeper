import React from 'react';
import { builderTheme as theme } from './builderTheme';

export default function BuilderProgress({ currentStep, totalSteps }) {
  const percent = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div data-testid="builder-progress" style={{
      marginTop: 6, display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 11, color: theme.text.muted, fontWeight: 600, letterSpacing: 0.5,
    }}>
      <span>STEP {currentStep + 1} OF {totalSteps}</span>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: 'rgba(239, 68, 68, 0.10)',
        border: '1px solid rgba(239, 68, 68, 0.20)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          background: '#EF4444',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ color: '#EF4444', minWidth: 36, textAlign: 'right' }}>
        {percent}%
      </span>
    </div>
  );
}
