import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HeartPulse, ShieldPlus } from 'lucide-react';

import './HealthArcWidgetSafe.css';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

function useAnimatedHpDisplay(targetCurrent, targetTemp) {
  const animationRef = useRef(null);
  const displayRef = useRef({ current: targetCurrent, temp: targetTemp });
  const [display, setDisplay] = useState(displayRef.current);

  useEffect(() => {
    const from = displayRef.current;
    const to = { current: targetCurrent, temp: targetTemp };

    if (from.current === to.current && from.temp === to.temp) return undefined;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const steps = [];
    const tempIsDropping = to.temp < from.temp;
    const mainHpIsDropping = to.current < from.current;

    if (tempIsDropping && mainHpIsDropping) {
      steps.push({
        from,
        to: { current: from.current, temp: 0 },
        duration: 850,
      });
      steps.push({
        from: { current: from.current, temp: 0 },
        to,
        duration: 950,
      });
    } else {
      steps.push({ from, to, duration: tempIsDropping || mainHpIsDropping ? 1150 : 850 });
    }

    let stepIndex = 0;
    let stepStart = null;

    const runStep = (timestamp) => {
      const step = steps[stepIndex];
      if (!step) {
        displayRef.current = to;
        setDisplay(to);
        return;
      }

      if (stepStart === null) stepStart = timestamp;
      const rawProgress = Math.min(1, (timestamp - stepStart) / step.duration);
      const progress = easeOutCubic(rawProgress);
      const next = {
        current: step.from.current + (step.to.current - step.from.current) * progress,
        temp: step.from.temp + (step.to.temp - step.from.temp) * progress,
      };

      displayRef.current = next;
      setDisplay(next);

      if (rawProgress >= 1) {
        stepIndex += 1;
        stepStart = null;
      }

      animationRef.current = requestAnimationFrame(runStep);
    };

    animationRef.current = requestAnimationFrame(runStep);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [targetCurrent, targetTemp]);

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
  const display = useAnimatedHpDisplay(safeCurrent, safeTemp);
  const displayCurrent = clamp(display.current, 0, safeMax);
  const displayTemp = Math.max(0, display.temp);
  const roundedCurrent = Math.round(displayCurrent);
  const roundedTemp = Math.round(displayTemp);
  const totalHp = safeCurrent + safeTemp;
  const displayedTotalHp = roundedCurrent + roundedTemp;
  const hpPercent = displayCurrent / safeMax;
  const hpProgressLength = Math.round(hpPercent * 100);
  const rawTempLength = displayTemp > 0.08 ? Math.max(8, Math.min(24, Math.round((displayTemp / safeMax) * 24))) : 0;
  const tempProgressLength = rawTempLength;
  const tempOffsetLength = displayTemp > 0.08 ? -(100 - tempProgressLength) : 0;

  const hpState = useMemo(() => {
    if (safeCurrent <= 0) return 'down';
    const targetPercent = safeCurrent / safeMax;
    if (targetPercent < 0.35) return 'critical';
    if (targetPercent < 0.7) return 'wounded';
    return 'healthy';
  }, [safeMax, safeCurrent]);

  const arcStyle = {
    '--hp-progress-length': `${hpProgressLength}`,
    '--temp-progress-length': `${tempProgressLength}`,
    '--temp-offset-length': `${tempOffsetLength}`,
  };

  const breakdownText = roundedTemp > 0
    ? `${roundedCurrent} HP + ${roundedTemp} Temp`
    : `${roundedCurrent} / ${safeMax} HP`;

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
          {displayTemp > 0.08 && <path className="rq-health-arc__temp-outline" pathLength="100" d="M 30 100 A 80 80 0 0 1 190 100" />}
          {displayTemp > 0.08 && <path className="rq-health-arc__temp" pathLength="100" d="M 30 100 A 80 80 0 0 1 190 100" />}
        </svg>
        <div className="rq-health-arc__numbers">
          <strong>{displayedTotalHp}</strong>
          <span>{breakdownText}</span>
          {roundedTemp > 0 && (
            <em><ShieldPlus size={15} /> +{roundedTemp} Temp HP</em>
          )}
        </div>
      </div>
      <p className="rq-health-arc__hint">Main number includes temp HP.</p>
    </div>
  );
}
