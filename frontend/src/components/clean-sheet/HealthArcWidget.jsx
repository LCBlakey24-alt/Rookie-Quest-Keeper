import React, { useEffect, useMemo, useState } from 'react';
import { HeartPulse, ShieldPlus } from 'lucide-react';

import './HealthArcWidgetSafe.css';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

function useRollingNumber(value, duration = 420) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const start = Number(display) || 0;
    if (start === target) return undefined;

    const diff = target - start;
    const steps = Math.min(24, Math.max(6, Math.abs(diff)));
    const stepTime = Math.max(18, Math.floor(duration / steps));
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep += 1;
      const progress = currentStep / steps;
      const next = Math.round(start + diff * progress);
      setDisplay(next);
      if (currentStep >= steps) {
        setDisplay(target);
        clearInterval(interval);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [target]);

  return display;
}

export default function HealthArcWidget({
  currentHp = 0,
  maxHp = 1,
  tempHp = 0,
  label = 'Health',
}) {
  const safeMax = Math.max(1, Number(maxHp) || 1);
  const safeCurrent = clamp(currentHp, 0, safeMax);
  const safeTemp = Math.max(0, Number(tempHp) || 0);
  const hpPercent = safeCurrent / safeMax;
  const tempPercent = Math.min(0.22, safeTemp / safeMax);
  const animatedHp = useRollingNumber(safeCurrent);
  const animatedTempHp = useRollingNumber(safeTemp, 300);

  const hpState = useMemo(() => {
    if (safeCurrent <= 0) return 'down';
    if (hpPercent < 0.35) return 'critical';
    if (hpPercent < 0.7) return 'wounded';
    return 'healthy';
  }, [hpPercent, safeCurrent]);

  const arcStyle = {
    '--hp-progress-length': `${Math.round(hpPercent * 100)}`,
    '--temp-progress-length': `${Math.round(tempPercent * 100)}`,
    '--temp-offset-length': `${Math.round(hpPercent * -100)}`,
  };

  return (
    <div className={`rq-health-arc rq-health-arc--${hpState}`} style={arcStyle}>
      <div className="rq-health-arc__label"><HeartPulse size={17} /> {label}</div>
      <div className="rq-health-arc__stage" aria-label={`Hit points ${safeCurrent} of ${safeMax}${safeTemp ? ` plus ${safeTemp} temporary hit points` : ''}`}>
        <svg className="rq-health-arc__svg" viewBox="0 0 220 132" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="rq-health-arc-gradient" x1="24" y1="108" x2="196" y2="108" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="34%" stopColor="#f97316" />
              <stop offset="62%" stopColor="#f5c84b" />
              <stop offset="100%" stopColor="#1ed760" />
            </linearGradient>
          </defs>
          <path className="rq-health-arc__track" pathLength="100" d="M 24 108 A 86 86 0 0 1 196 108" />
          <path className="rq-health-arc__fill" pathLength="100" d="M 24 108 A 86 86 0 0 1 196 108" />
          {safeTemp > 0 && <path className="rq-health-arc__temp" pathLength="100" d="M 24 108 A 86 86 0 0 1 196 108" />}
        </svg>
        <div className="rq-health-arc__numbers">
          <strong>{animatedHp}</strong>
          <span>/ {safeMax} HP</span>
          {safeTemp > 0 && (
            <em><ShieldPlus size={15} /> +{animatedTempHp} Temp</em>
          )}
        </div>
      </div>
      <p className="rq-health-arc__hint">Temporary HP is used before normal HP.</p>
    </div>
  );
}
