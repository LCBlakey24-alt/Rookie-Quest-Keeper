import React from 'react';
import ClassSubclassPicker from './ClassSubclassPicker';

export default function BuilderChoicePanel({
  options = {},
  value = '',
  detailValue = '',
  edition = '2014',
  level = 1,
  onValueChange,
  onDetailChange,
  cardStyle = {},
  selectedCardStyle = {},
  labelStyle = {},
  inputStyle = {},
  theme = {},
} = {}) {
  return (
    <div data-testid="builder-choice-panel">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(options || {}).map(([name, item]) => {
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onValueChange?.(name)}
              style={isSelected ? { ...cardStyle, ...selectedCardStyle } : cardStyle}
              data-testid={`builder-choice-${name}`}
            >
              <div style={{ fontWeight: 700 }}>{item?.name || name}</div>
              {item?.description && <div style={{ fontSize: 12, opacity: 0.75 }}>{item.description}</div>}
            </button>
          );
        })}
      </div>

      {value && (
        <ClassSubclassPicker
          className={value}
          edition={edition}
          level={level}
          classes={options}
          selectedSubclass={detailValue}
          onSubclassChange={onDetailChange}
          label="Subclass"
          labelStyle={labelStyle}
          inputStyle={inputStyle}
          theme={theme}
        />
      )}
    </div>
  );
}
