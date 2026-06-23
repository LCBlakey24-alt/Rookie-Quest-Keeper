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
  const totalHp = safeCurrent + safeTemp;
  const hpPercent = safeCurrent / safeMax;
  const hpProgressLength = Math.round(hpPercent * 100);
  const rawTempLength = safeTemp > 0 ? Math.max(8, Math.min(24, Math.round((safeTemp / safeMax) * 24))) : 0;
  const tempProgressLength = rawTempLength;
  const tempOffsetLength = safeTemp > 0 ? -(100 - tempProgressLength) : 0;
  const animatedTotalHp = useRollingNumber(totalHp);
  const animatedTempHp = useRollingNumber(safeTemp, 300);

  const hpState = useMemo(() => {
    if (safeCurrent <= 0) return 'down';
    if (hpPercent < 0.35) return 'critical';
    if (hpPercent < 0.7) return 'wounded';
    return 'healthy';
  }, [hpPercent, safeCurrent]);

  const arcStyle = {
    '--hp-progress-length': `${hpProgressLength}`,
    '--temp-progress-length': `${tempProgressLength}`,
    '--temp-offset-length': `${tempOffsetLength}`,
  };

  const breakdownText = safeTemp > 0
    ? `${safeCurrent} HP + ${safeTemp} Temp`
    : `${safeCurrent} / ${safeMax} HP`;

  return (
    <div className={`rq-health-arc rq-health-arc--${hpState}`} style={arcStyle}>
      <div className="rq-health-arc__label"><HeartPulse size={17} /> {label}</div>
      <div className="rq-health-arc__stage" aria-label={`Total HP ${totalHp}. ${breakdownText}.`}>
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
          {safeTemp > 0 && <path className="rq-health-arc__temp" pathLength="100" d="M 30 100 A 80 80 0 0 1 190 100" />}
        </svg>
        <div className="rq-health-arc__numbers">
          <strong>{animatedTotalHp}</strong>
          <span>{breakdownText}</span>
          {safeTemp > 0 && (
            <em><ShieldPlus size={15} /> +{animatedTempHp} Temp HP</em>
          )}
        </div>
      </div>
      <p className="rq-health-arc__hint">Main number includes temp HP.</p>
    </div>
  );
}
