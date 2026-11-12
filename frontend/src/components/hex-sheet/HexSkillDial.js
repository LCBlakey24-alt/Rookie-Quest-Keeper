import React, { useEffect, useMemo, useRef, useState } from 'react';

import { SKILLS } from '@/components/clean-sheet/cleanSheetUtils';
import { skillModifier } from '@/data/skillModifiers';
import GlowPolygon, { GlowFilter, useSvgId } from './GlowPolygon';
import { OUTER_RADIUS, hexVertices, pointsAttribute, wheelViewBox } from './hexGeometry';
import { DRAG_THRESHOLD_DEGREES, angleStep, pointerAngle } from './hpDial';
import { playDialTick } from './dialSound';
import { rotationForSector, sectorAtTop, settleRotation } from './spinWheel';

const COUNT = SKILLS.length; // 18
const STEP = 360 / COUNT; // 20 degrees per skill
const RING_OUTER = 84; // stays inside the hexagon's flat sides (86.6)
const RING_INNER = 58;
const LABEL_RADIUS = 72;
const CENTRE_RADIUS = 50;

export const SKILL_SHORT = {
  Acrobatics: 'ACR', 'Animal Handling': 'ANI', Arcana: 'ARC', Athletics: 'ATH', Deception: 'DEC',
  History: 'HIS', Insight: 'INS', Intimidation: 'ITM', Investigation: 'INV', Medicine: 'MED',
  Nature: 'NAT', Perception: 'PRC', Performance: 'PRF', Persuasion: 'PRS', Religion: 'REL',
  'Sleight of Hand': 'SLE', Stealth: 'STE', Survival: 'SUR',
};
const ABILITY_SHORT = { strength: 'STR', dexterity: 'DEX', constitution: 'CON', intelligence: 'INT', wisdom: 'WIS', charisma: 'CHA' };
const signed = (value) => (value >= 0 ? `+${value}` : `${value}`);

const polar = (degrees, radius) => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [radius * Math.cos(radians), radius * Math.sin(radians)];
};

/** The ring segment for skill `index`, as an SVG path (for taps). */
function segmentPath(index) {
  const start = index * STEP - STEP / 2;
  const end = start + STEP;
  const [ax, ay] = polar(start, RING_OUTER);
  const [bx, by] = polar(end, RING_OUTER);
  const [cx, cy] = polar(end, RING_INNER);
  const [dx, dy] = polar(start, RING_INNER);
  return `M ${ax} ${ay} A ${RING_OUTER} ${RING_OUTER} 0 0 1 ${bx} ${by} L ${cx} ${cy} A ${RING_INNER} ${RING_INNER} 0 0 0 ${dx} ${dy} Z`;
}

function buzz() {
  try { navigator.vibrate?.(4); } catch { /* not supported */ }
}

/**
 * Skills: all 18 on a ring inside the hexagon. Spin the ring and the skill
 * that stops under the pointer at the top fills the centre with its
 * modifier; tap the centre to roll it. Labels are printed on the ring and
 * turn with it. The full list below the dial lets a player pick or roll
 * any skill directly, and keeps the dial in step.
 *
 * Proficient skills glow; Expertise glows brighter. Modifiers come from
 * the shared skill rules (proficiency, Expertise, Jack of All Trades).
 */
export default function HexSkillDial({ character, proficiencyBonus, onRoll }) {
  const rows = useMemo(() => SKILLS.map(([skill, ability]) => ({
    skill, ability, ...skillModifier(character, skill, ability, proficiencyBonus),
  })), [character, proficiencyBonus]);

  const [selected, setSelected] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rotationRef = useRef(0);
  const svgRef = useRef(null);
  const drag = useRef(null);
  const filterId = useSvgId('hex-skill-glow');

  const turnTo = (next) => {
    rotationRef.current = next;
    setRotation(next);
  };

  const pick = (index, { quiet = false } = {}) => {
    turnTo(rotationForSector(index, rotationRef.current, COUNT));
    if (index !== selected) {
      setSelected(index);
      if (!quiet) { buzz(); playDialTick(); }
    }
  };

  useEffect(() => () => { drag.current = null; }, []);

  const centreOf = () => {
    const box = svgRef.current.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };

  const onPointerDown = (event) => {
    if (event.button > 0 || event.target.closest('[data-skill-centre]')) return;
    const [cx, cy] = centreOf();
    drag.current = {
      pointerId: event.pointerId,
      last: pointerAngle(event.clientX, event.clientY, cx, cy),
      start: rotationRef.current,
      travelled: 0,
      lastIndex: selected,
      segment: event.target.closest('[data-skill-index]')?.getAttribute('data-skill-index'),
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
    const next = state.start + state.travelled;
    turnTo(next);
    // Click once for every skill that passes the pointer.
    const atTop = sectorAtTop(next, COUNT);
    if (atTop !== state.lastIndex) {
      state.lastIndex = atTop;
      setSelected(atTop);
      buzz();
      playDialTick();
    }
  };

  const onPointerUp = (event) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (dragging) {
      svgRef.current.releasePointerCapture?.(event.pointerId);
      setDragging(false);
      const settled = settleRotation(rotationRef.current, COUNT);
      turnTo(settled);
      setSelected(sectorAtTop(settled, COUNT));
      return;
    }
    if (state.segment !== undefined && state.segment !== null) pick(Number(state.segment));
  };

  const onKeyDown = (event) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (keys[event.key]) {
      event.preventDefault();
      pick((selected + keys[event.key] + COUNT) % COUNT);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const row = rows[selected];
      onRoll(row.skill, row.modifier);
    }
  };

  const current = rows[selected];
  const tag = current.expertise ? 'Expertise' : current.proficient ? 'Proficient' : current.halfProficiency ? 'Half proficiency' : null;

  return (
    <div className="hex-skills" data-testid="hex-skills">
      <svg
        ref={svgRef}
        className={`hex-wheel hex-skills__dial${dragging ? ' is-spinning' : ''}`}
        viewBox={wheelViewBox()}
        // A radio group, not a listbox: an app-wide theme rule paints a panel
        // background behind every listbox.
        role="radiogroup"
        tabIndex={0}
        aria-label="Skills: spin a skill to the top, Enter to roll it"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        data-testid="hex-skill-dial"
        data-rotation={Math.round(rotation)}
      >
        <GlowFilter id={filterId} />
        <GlowPolygon className="hex-wheel__wedge hex-skills__case" points={pointsAttribute(hexVertices(OUTER_RADIUS))} filterId={filterId} />
        <circle className="hex-skills__ring" cx={0} cy={0} r={RING_OUTER} />
        <circle className="hex-skills__ring hex-skills__ring--inner" cx={0} cy={0} r={RING_INNER} />
        <g className="hex-skills__rotor" style={{ transform: `rotate(${rotation}deg)` }}>
          {rows.map((row, index) => {
            const angle = index * STEP;
            const [lx, ly] = polar(angle, LABEL_RADIUS);
            const [t1x, t1y] = polar(angle + STEP / 2, RING_INNER);
            const [t2x, t2y] = polar(angle + STEP / 2, RING_OUTER);
            return (
              <g
                key={row.skill}
                id={`hex-skill-option-${index}`}
                role="radio"
                aria-checked={index === selected}
                aria-label={`${row.skill} ${signed(row.modifier)}`}
                data-skill-index={index}
                className={`hex-skills__skill${row.proficient ? ' is-proficient' : ''}${row.expertise ? ' is-expert' : ''}${index === selected ? ' is-selected' : ''}`}
              >
                <path className="hex-skills__segment" d={segmentPath(index)} />
                <line className="hex-skills__divider" x1={t1x} y1={t1y} x2={t2x} y2={t2y} />
                {/* Printed on the ring: turns with it. */}
                <text className="hex-skills__abbr" x={lx} y={ly} transform={`rotate(${angle} ${lx} ${ly})`} textAnchor="middle" dominantBaseline="central">
                  {SKILL_SHORT[row.skill]}
                </text>
              </g>
            );
          })}
        </g>
        <polygon className="hex-spin__pointer" points={`0,${-RING_OUTER + 6} -5,${-RING_OUTER - 5} 5,${-RING_OUTER - 5}`} aria-hidden="true" />
        <g
          className="hex-wheel__centre hex-skills__centre"
          data-skill-centre
          role="button"
          tabIndex={0}
          aria-label={`Roll ${current.skill} ${signed(current.modifier)}`}
          onClick={() => onRoll(current.skill, current.modifier)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRoll(current.skill, current.modifier); } }}
          data-testid="hex-skill-roll"
        >
          <GlowPolygon className="hex-wheel__centre-shape" points={pointsAttribute(hexVertices(CENTRE_RADIUS))} filterId={filterId} />
          <text className="hex-skills__centre-meta" x={0} y={-24} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
            {ABILITY_SHORT[current.ability]}{tag ? ` · ${tag.toUpperCase()}` : ''}
          </text>
          <text className="hex-skills__centre-name" x={0} y={-10} fontSize={current.skill.length > 12 ? 8 : 10} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{current.skill}</text>
          <text className="hex-skills__centre-mod" x={0} y={10} textAnchor="middle" dominantBaseline="central" aria-hidden="true" data-testid="hex-skill-modifier">{signed(current.modifier)}</text>
          <text className="hex-skills__centre-hint" x={0} y={28} textAnchor="middle" dominantBaseline="central" aria-hidden="true">tap to roll</text>
        </g>
      </svg>

      <ul className="hex-skills__list" aria-label="All skills">
        {rows.map((row, index) => (
          <li key={row.skill} className={index === selected ? 'is-selected' : ''}>
            <button type="button" className="hex-skills__pick" onClick={() => pick(index, { quiet: true })} aria-pressed={index === selected}>
              <span className={`hex-skills__dot${row.expertise ? ' is-expert' : row.proficient ? ' is-proficient' : row.halfProficiency ? ' is-half' : ''}`} aria-hidden="true" />
              <strong>{row.skill}</strong>
              <small>{ABILITY_SHORT[row.ability]}</small>
            </button>
            <button type="button" className="hex-skills__roll" onClick={() => onRoll(row.skill, row.modifier)} aria-label={`Roll ${row.skill} ${signed(row.modifier)}`} data-testid={`hex-skill-roll-${row.skill}`}>
              {signed(row.modifier)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
