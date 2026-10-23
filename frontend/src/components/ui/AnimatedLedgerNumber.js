import React, { useEffect, useState } from 'react';
import './AnimatedLedgerNumber.css';

const STEP_COUNT = 9;
const TICK_MS = 72;

function nonNegativeInteger(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) ? numeric : null;
  }
  return null;
}

/**
 * Short, deterministic "ledger counter" effect: three quick changing digits,
 * then an easing count-up to the real value. Never used to calculate game stats.
 */
export function ledgerNumberFrame(value, step, steps = STEP_COUNT) {
  const target = nonNegativeInteger(value);
  if (target == null) return String(value ?? '—');
  if (target === 0 || step >= steps) return String(target);
  if (step < 3) {
    return String(target).split('').map((digit, index) =>
      String((Number(digit) + (3 - step) * 3 + index * 2) % 10)).join('');
  }
  const progress = (step - 2) / (steps - 2);
  return String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
}

/**
 * Only the decorative visible glyphs cycle. Screen readers always get the
 * actual, source-backed count, even in the middle of its short animation.
 */
export default function AnimatedLedgerNumber({ value, className = '' }) {
  const numeric = nonNegativeInteger(value);
  const actualText = numeric === null ? String(value ?? '—') : String(numeric);
  const [shown, setShown] = useState(actualText);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const reduceMotion = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (numeric === null || numeric === 0 || reduceMotion) {
      setShown(actualText);
      setRolling(false);
      return undefined;
    }

    setRolling(true);
    setShown(ledgerNumberFrame(numeric, 0));
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setShown(ledgerNumberFrame(numeric, step));
      if (step >= STEP_COUNT) {
        window.clearInterval(timer);
        setRolling(false);
      }
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [numeric, actualText]);

  return (
    <span
      className={`rqk-ledger-number ${rolling ? 'rqk-ledger-number--rolling' : ''} ${className}`.trim()}
      data-testid="animated-ledger-number"
      data-count={actualText}
      data-rolling={rolling ? 'true' : 'false'}
    >
      <span aria-hidden="true" className="rqk-ledger-number__digits">{shown}</span>
      <span className="rqk-ledger-number__sr-only">{actualText}</span>
    </span>
  );
}
