import React from 'react';
import { EXTRA_LANGUAGE_OPTIONS } from '@/data/languageChoiceUtils';

export default function LanguageChoicePicker({
  budget = 0,
  selectedLanguages = [],
  knownLanguages = [],
  onChange,
  label = 'Choose extra languages',
  helperText = 'Pick languages granted by your origin choices.',
  testIdPrefix = 'language-choice',
  theme,
}) {
  const limit = Math.max(0, Number(budget) || 0);
  if (limit <= 0) return null;

  const selectedSet = new Set(selectedLanguages);
  const knownSet = new Set(knownLanguages);
  const options = EXTRA_LANGUAGE_OPTIONS.filter(language => !knownSet.has(language));

  const toggleLanguage = (language) => {
    if (!onChange) return;
    if (selectedSet.has(language)) {
      onChange(selectedLanguages.filter(item => item !== language));
      return;
    }
    if (selectedLanguages.length >= limit) return;
    onChange([...selectedLanguages, language]);
  };

  const accent = theme?.accent?.primary || theme?.sunset?.gold || '#EF4444';
  const success = theme?.success || '#10B981';
  const surface = theme?.bg?.surface || '#27272B';
  const soft = theme?.accent?.soft || 'rgba(239, 68, 68, 0.12)';
  const border = theme?.border || 'rgba(239, 68, 68, 0.35)';
  const text = theme?.text?.primary || '#FFFFFF';
  const muted = theme?.text?.muted || '#9CA3AF';
  const complete = selectedLanguages.length === limit;

  return (
    <div
      data-testid={`${testIdPrefix}-picker`}
      style={{
        marginTop: 20,
        padding: 14,
        borderRadius: 12,
        background: soft,
        border: `1px solid ${border}`,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: text, fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>
          {label}{' '}
          <span style={{ color: complete ? success : accent, textTransform: 'none' }}>
            ({selectedLanguages.length}/{limit})
          </span>
        </div>
        {helperText && <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{helperText}</div>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(language => {
          const selected = selectedSet.has(language);
          const disabled = !selected && selectedLanguages.length >= limit;
          return (
            <button
              key={language}
              type="button"
              disabled={disabled}
              data-testid={`${testIdPrefix}-${language.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => toggleLanguage(language)}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                background: selected ? soft : surface,
                border: `1px solid ${selected ? accent : border}`,
                color: text,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.45 : 1,
              }}
            >
              {selected ? '✓ ' : ''}{language}
            </button>
          );
        })}
      </div>
    </div>
  );
}
