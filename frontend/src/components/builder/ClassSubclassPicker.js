import React from 'react';
import { getClassSelectionState } from './classSelectionState';

export default function ClassSubclassPicker({
  className = '',
  edition = '2014',
  level = 1,
  classes = undefined,
  selectedSubclass = '',
  onSubclassChange,
  label = 'Subclass',
  required = false,
  requiredText = '(required)',
  optionalText = '(optional now)',
  labelStyle = {},
  inputStyle = {},
  theme = {},
  testId = 'subclass-select',
} = {}) {
  const state = getClassSelectionState({
    className,
    edition,
    level,
    classes,
    selectedSubclass,
  });

  const options = state.availableSubclassOptions || [];
  if (!options.length) return null;

  const statusText = required ? requiredText : optionalText;
  const statusColor = required ? '#EF4444' : theme?.text?.muted;

  return (
    <div style={{ marginTop: '20px' }} data-testid="class-subclass-picker">
      <label style={labelStyle}>
        {label}
        <span style={{ color: statusColor, textTransform: 'none', marginLeft: 6 }}>
          {statusText}
        </span>
      </label>
      <select
        value={selectedSubclass}
        onChange={event => onSubclassChange?.(event.target.value)}
        style={{
          ...inputStyle,
          borderColor: required && !selectedSubclass ? '#EF4444' : inputStyle?.borderColor,
        }}
        data-testid={testId}
      >
        <option value="">{required ? `-- Choose a ${label} --` : 'Select later'}</option>
        {options.map(option => (
          <option key={option.key || option.value} value={option.value}>
            {option.label || option.value}
          </option>
        ))}
      </select>
      {state.shouldClearSelectedSubclass && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#EF4444' }} data-testid="stale-subclass-warning">
          The selected subclass is not available for this class and edition.
        </div>
      )}
    </div>
  );
}
