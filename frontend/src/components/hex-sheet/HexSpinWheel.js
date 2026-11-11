import React, { useEffect, useRef, useState } from 'react';

import GlowPolygon, { GlowFilter, useSvgId } from './GlowPolygon';
import { INNER_RADIUS, OUTER_RADIUS, hexVertices, pointsAttribute, wheelViewBox } from './hexGeometry';
import { DRAG_THRESHOLD_DEGREES, angleStep, pointerAngle } from './hpDial';
import { playDialTick } from './dialSound';
import { SPIN_STEP, rotationForSector, sectorAtTop, sectorLabelPoint, sectorPolygon, settleRotation } from './spinWheel';

const CENTRE_RADIUS = INNER_RADIUS - 4;

function buzz() {
  try { navigator.vibrate?.(6); } catch { /* not supported */ }
}

/**
 * A hexagon of three wedges that turns. Spin it (or tap a wedge, or use the
 * arrow keys) and whichever wedge comes to rest at the top is chosen; a
 * small pointer marks the top. Labels stay upright as the wheel turns.
 *
 * Controlled: `value` is the chosen sector's id and `onChange` is called
 * with the new id when the wheel settles on a different one.
 */
export default function HexSpinWheel({ sectors, value, onChange, centre, label = 'Wheel' }) {
  const index = Math.max(0, sectors.findIndex((sector) => sector.id === value));
  const [rotation, setRotation] = useState(() => rotationForSector(index));
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const rotationRef = useRef(rotation);
  const filterId = useSvgId('hex-spin-glow');

  const turnTo = (next) => {
    rotationRef.current = next;
    setRotation(next);
  };

  // Follow a choice made elsewhere (the list's own controls, Back, ...).
  useEffect(() => {
    if (sectorAtTop(rotationRef.current) !== index) turnTo(rotationForSector(index, rotationRef.current));
  }, [index]);

  const settleOn = (nextIndex, nextRotation) => {
    turnTo(nextRotation);
    if (nextIndex !== index) {
      buzz();
      playDialTick();
      onChange?.(sectors[nextIndex].id);
    }
  };

  const choose = (nextIndex) => settleOn(nextIndex, rotationForSector(nextIndex, rotationRef.current));

  const centreOf = () => {
    const box = svgRef.current.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };

  const onPointerDown = (event) => {
    if (event.button > 0 || event.target.closest('[data-spin-centre]')) return;
    const [cx, cy] = centreOf();
    drag.current = {
      pointerId: event.pointerId,
      last: pointerAngle(event.clientX, event.clientY, cx, cy),
      start: rotationRef.current,
      travelled: 0,
      sector: event.target.closest('[data-sector]')?.getAttribute('data-sector'),
    };
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const [cx, cy] = centreOf();
    const angle = pointerAngle(event.clientX, event.clientY, cx, cy);
    state.travelled += angleStep(state.last, angle);
    state.last = angle;
    if (!dragging && Math.abs(state.travelled) < DRAG_THRESHOLD_DEGREES) return;
    if (!dragging) {
      svgRef.current.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    turnTo(state.start + state.travelled);
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (dragging) {
      svgRef.current.releasePointerCapture?.(event.pointerId);
      setDragging(false);
      const settled = settleRotation(rotationRef.current);
      settleOn(sectorAtTop(settled), settled);
      return;
    }
    // A tap on a wedge spins that wedge to the top.
    if (state.sector !== undefined && state.sector !== null) choose(Number(state.sector));
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      choose((index + 1) % sectors.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      choose((index + sectors.length - 1) % sectors.length);
    }
  };

  return (
    <svg
      ref={svgRef}
      className={`hex-wheel hex-spin${dragging ? ' is-spinning' : ''}`}
      viewBox={wheelViewBox()}
      role="radiogroup"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-testid="hex-spin-wheel"
      data-rotation={Math.round(rotation)}
    >
      <GlowFilter id={filterId} />
      <polygon className="hex-wheel__frame" points={pointsAttribute(hexVertices(OUTER_RADIUS + 2))} aria-hidden="true" />
      <g className="hex-spin__rotor" style={{ transform: `rotate(${rotation}deg)` }}>
        {sectors.map((sector, sectorIndex) => {
          const [lx, ly] = sectorLabelPoint(sectorIndex, 62);
          const chosen = sectorIndex === index && !dragging;
          return (
            <g
              key={sector.id}
              className={`hex-spin__sector${chosen ? ' is-active' : ''}`}
              data-sector={sectorIndex}
              role="radio"
              aria-checked={sectorIndex === index}
              aria-label={sector.label}
              data-testid={`hex-spin-${sector.id}`}
            >
              <GlowPolygon className="hex-wheel__wedge" points={pointsAttribute(sectorPolygon(sectorIndex))} filterId={filterId} />
              {/* Counter-rotated about its own point, so it always reads upright. */}
              <g transform={`rotate(${-rotation} ${lx} ${ly})`} aria-hidden="true">
                <text className="hex-spin__label" x={lx} y={ly - (sector.sub ? 4 : 0)} textAnchor="middle" dominantBaseline="central">{sector.short || sector.label}</text>
                {sector.sub && <text className="hex-spin__sub" x={lx} y={ly + 9} textAnchor="middle" dominantBaseline="central">{sector.sub}</text>}
              </g>
            </g>
          );
        })}
      </g>
      <polygon className="hex-spin__pointer" points={`0,${-OUTER_RADIUS + 9} -6,${-OUTER_RADIUS - 3} 6,${-OUTER_RADIUS - 3}`} aria-hidden="true" />
      {centre && (
        <g
          className="hex-wheel__centre"
          data-spin-centre
          role="button"
          tabIndex={0}
          aria-label={centre.ariaLabel || centre.label}
          onClick={() => centre.onSelect?.()}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); centre.onSelect?.(); } }}
          data-testid="hex-centre"
        >
          <GlowPolygon className="hex-wheel__centre-shape" points={pointsAttribute(hexVertices(CENTRE_RADIUS))} filterId={filterId} />
          <text className="hex-wheel__centre-label" x={0} y={0} fontSize={15} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{centre.label}</text>
        </g>
      )}
    </svg>
  );
}

export { SPIN_STEP };
