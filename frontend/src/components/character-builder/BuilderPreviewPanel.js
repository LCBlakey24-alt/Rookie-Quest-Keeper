import React from 'react';
import { builderTheme as theme } from './builderTheme';

const ABILITY_KEYS = ['strength','dexterity','constitution','intelligence','wisdom','charisma'];
const ABILITY_LABELS = ['STR','DEX','CON','INT','WIS','CHA'];

export default function BuilderPreviewPanel({
  name,
  race,
  subrace,
  className,
  subclass,
  edition,
  background,
  stats,
  floatingAsi,
  selectedSkills,
  selectedCantrips,
  selectedSpells,
  originFeat
}) {
  return (
    <div data-testid="builder-live-preview" style={{
      position: 'sticky', top: 16,
      background: theme.bg.surface,
      border: '1px solid rgba(239, 68, 68, 0.35)',
      borderRadius: 12,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#EF4444', letterSpacing: 1 }}>
        LIVE PREVIEW
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: theme.text.primary }}>
        {name || <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>Unnamed Hero</span>}
      </div>
      <div style={{ fontSize: 12, color: theme.text.secondary }}>
        {(race || 'No race')} {subrace ? `(${subrace})` : ''} · {(className || 'No class')}{subclass ? ` (${subclass})` : ''}
      </div>
      <div style={{ fontSize: 11, color: theme.text.muted }}>
        {edition === '2024' ? '2024 Rules' : '2014 Rules'} · {background || 'No background'}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
        padding: 8, borderRadius: 6,
        background: 'rgba(239, 68, 68, 0.06)',
        border: '1px solid rgba(239, 68, 68, 0.20)',
      }}>
        {ABILITY_LABELS.map((ab, i) => {
          const key = ABILITY_KEYS[i];
          const score = (stats?.[key] || 10) + (floatingAsi?.[key] || 0);
          const mod = Math.floor((score - 10) / 2);
          return (
            <div key={ab} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: theme.text.muted, fontWeight: 700 }}>{ab}</div>
              <div style={{ fontSize: 14, color: theme.text.primary, fontWeight: 800 }}>{score}</div>
              <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>{mod >= 0 ? `+${mod}` : mod}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: theme.text.secondary }}>
        <strong style={{ color: '#EF4444' }}>{(selectedSkills || []).length}</strong> skill{(selectedSkills || []).length === 1 ? '' : 's'} chosen
        {(selectedCantrips || []).length > 0 && (
          <> · <strong style={{ color: '#EF4444' }}>{selectedCantrips.length}</strong> cantrip{selectedCantrips.length === 1 ? '' : 's'}</>
        )}
        {(selectedSpells || []).length > 0 && (
          <> · <strong style={{ color: '#EF4444' }}>{selectedSpells.length}</strong> spell{selectedSpells.length === 1 ? '' : 's'}</>
        )}
      </div>
      {originFeat && (
        <div style={{ fontSize: 11, color: theme.text.secondary }}>
          <span style={{ color: theme.text.muted }}>Origin Feat:</span> <strong style={{ color: '#EF4444' }}>{originFeat}</strong>
        </div>
      )}
    </div>
  );
}
