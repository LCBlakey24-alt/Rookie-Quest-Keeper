import React, { useEffect, useMemo, useRef, useState } from 'react';
import './NumberWheelPicker.css';

const DEFAULT_ITEM_HEIGHT = 38;
const COMPACT_ITEM_HEIGHT = 34;

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

export default function NumberWheelPicker({
  value,
  onChange,
  min = 0,
  max = 20,
  step = 1,
  label,
  disabled = false,
  className = '',
  compact = false,
}) {
  const wheelRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const itemHeight = compact ? COMPACT_ITEM_HEIGHT : DEFAULT_ITEM_HEIGHT;
  const [internalValue, setInternalValue] = useState(clamp(value, min, max));

  const values = useMemo(() => {
    const safeStep = Math.max(1, Number(step) || 1);
    const safeMin = Math.round(Number(min) || 0);
    const safeMax = Math.max(safeMin, Math.round(Number(max) || safeMin));
    const output = [];
    for (let current = safeMin; current <= safeMax; current += safeStep) output.push(current);
    return output;
  }, [min, max, step]);

  const selectedIndex = Math.max(0, values.indexOf(clamp(value ?? internalValue, min, max)));

  useEffect(() => {
    const nextValue = clamp(value, min, max);
    setInternalValue(nextValue);
    const index = values.indexOf(nextValue);
    if (wheelRef.current && index >= 0) {
      wheelRef.current.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
    }
  }, [value, min, max, values, itemHeight]);

  const commitValue = (nextValue) => {
    if (disabled) return;
    const safeValue = clamp(nextValue, min, max);
    setInternalValue(safeValue);
    onChange?.(safeValue);
  };

  const handleScroll = () => {
    if (disabled || !wheelRef.current) return;
    window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      const index = clamp(Math.round(wheelRef.current.scrollTop / itemHeight), 0, values.length - 1);
      const nextValue = values[index] ?? values[0] ?? min;
      commitValue(nextValue);
    }, 90);
  };

  return (
    <div className={`number-wheel-picker ${compact ? 'number-wheel-picker--compact' : ''} ${className}`}>
      {label && <span className="number-wheel-picker__label">{label}</span>}
      <div className="number-wheel-picker__frame" aria-disabled={disabled}>
        <div className="number-wheel-picker__selection" aria-hidden="true" />
        <div
          ref={wheelRef}
          className="number-wheel-picker__wheel"
          onScroll={handleScroll}
          role="listbox"
          aria-label={label || 'Number picker'}
          aria-activedescendant={`number-wheel-${internalValue}`}
          tabIndex={disabled ? -1 : 0}
        >
          <div className="number-wheel-picker__spacer" aria-hidden="true" />
          {values.map((number, index) => {
            const isSelected = index === selectedIndex || number === internalValue;
            return (
              <button
                id={`number-wheel-${number}`}
                key={number}
                type="button"
                className={isSelected ? 'is-selected' : ''}
                onClick={() => commitValue(number)}
                disabled={disabled}
                role="option"
                aria-selected={isSelected}
              >
                {number}
              </button>
            );
          })}
          <div className="number-wheel-picker__spacer" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
