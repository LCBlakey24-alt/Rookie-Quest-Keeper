import React, { useMemo, useState } from 'react';
import { Check, Dices, Shield, Swords, Target, X } from 'lucide-react';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.76)', muted: 'rgba(255,255,255,0.56)', line: 'rgba(255,255,255,0.16)',
  green: '#22c55e', danger: '#ef4444', amber: '#f59e0b',
};

function numberOr(value, fallback = 0) {
  const parsed = Number(String(value ?? '').replace(/[^0-9+\-.]/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDice(expression = '') {
  const match = String(expression).match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) return null;
  return {
    count: Math.max(1, Number(match[1]) || 1),
    sides: Math.max(2, Number(match[2]) || 6),
    modifier: Number(match[3] || 0),
    expression: match[0],
  };
}

function diceFromAttack(attack = {}) {
  const candidates = [
    attack.damage,
    attack.damage_dice,
    attack.damageDice,
    attack.description,
    attack.notes,
  ];
  for (const candidate of candidates) {
    const parsed = parseDice(candidate);
    if (parsed) return parsed;
  }
  return null;
}

function attackBonus(attack = {}) {
  const direct = attack.toHitBonus ?? attack.to_hit ?? attack.attack_bonus ?? attack.attackBonus ?? attack.bonus;
  if (direct !== undefined && direct !== null && String(direct).trim() !== '') return numberOr(direct, 0);
  const text = [attack.description, attack.notes, attack.damage].filter(Boolean).join(' ');
  const match = text.match(/([+-]?\d+)\s*(?:to hit|attack)/i);
  return match ? Number(match[1]) : 0;
}

function normaliseStructuredAttack(attack, index) {
  if (!attack) return null;
  if (typeof attack === 'string') return normaliseTextAttack(attack, index);
  const dice = diceFromAttack(attack);
  return {
    id: String(attack.id || `attack-${index}`),
    name: attack.name || attack.title || `Attack ${index + 1}`,
    toHitBonus: attackBonus(attack),
    dice,
    description: attack.description || attack.notes || attack.damage || '',
  };
}

function normaliseTextAttack(text, index = 0) {
  const clean = String(text || '').trim();
  if (!clean) return null;
  const nameMatch = clean.match(/^([^:.;\n]{2,40})[:.]/);
  const hitMatch = clean.match(/([+-]?\d+)\s*to hit/i);
  return {
    id: `text-attack-${index}`,
    name: nameMatch?.[1]?.trim() || `Attack ${index + 1}`,
    toHitBonus: hitMatch ? Number(hitMatch[1]) : 0,
    dice: parseDice(clean),
    description: clean,
  };
}

function attacksFor(attacker = {}) {
  const structured = [attacker.attacks, attacker.actions]
    .flatMap(value => Array.isArray(value) ? value : [])
    .map(normaliseStructuredAttack)
    .filter(Boolean);
  if (structured.length) return structured;

  const text = [
    typeof attacker.abilities === 'string' ? attacker.abilities : '',
    typeof attacker.actions === 'string' ? attacker.actions : '',
    typeof attacker.attacks === 'string' ? attacker.attacks : '',
    attacker.description || '',
  ].filter(Boolean).join('\n');

  const lines = text.split(/\n|(?<=[.!?])\s+/).map(value => value.trim()).filter(value => /\d+d\d+|to hit/i.test(value));
  return lines.map(normaliseTextAttack).filter(Boolean);
}

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDamage(dice, critical = false) {
  if (!dice) return { total: 0, rolls: [], expression: '' };
  const count = critical ? dice.count * 2 : dice.count;
  const rolls = Array.from({ length: count }, () => rollDie(dice.sides));
  return {
    total: Math.max(0, rolls.reduce((sum, value) => sum + value, 0) + dice.modifier),
    rolls,
    expression: `${count}d${dice.sides}${dice.modifier ? `${dice.modifier > 0 ? '+' : ''}${dice.modifier}` : ''}`,
  };
}

export default function TargetedAttackPanel({ attacker, targets = [], onClose, onApplyDamage, onAnnounce }) {
  const attacks = useMemo(() => attacksFor(attacker), [attacker]);
  const [attackId, setAttackId] = useState(attacks[0]?.id || '');
  const [targetId, setTargetId] = useState(targets[0]?.id || '');
  const [mode, setMode] = useState('digital');
  const [physicalRoll, setPhysicalRoll] = useState('');
  const [physicalDamage, setPhysicalDamage] = useState('');
  const [result, setResult] = useState(null);

  const attack = attacks.find(item => item.id === attackId) || attacks[0] || null;
  const target = targets.find(item => item.id === targetId) || targets[0] || null;

  const announce = (hit, total, damage, critical = false, rawRoll = null) => {
    if (!target || !attack) return;
    const outcome = hit ? (critical ? 'CRITICAL HIT' : 'HIT') : 'MISS';
    const subtitle = `${attack.name} · ${rawRoll !== null ? `d20 ${rawRoll} + ${attack.toHitBonus} = ` : ''}${total} vs AC ${target.ac}${hit && damage !== null ? ` · ${damage} damage` : ''}`;
    onAnnounce?.({
      text: `${attacker.name} → ${target.name}: ${outcome}`,
      subtitle,
      tone: hit ? 'success' : 'danger',
    });
  };

  const digitalAttack = () => {
    if (!attack || !target) return;
    const roll = rollDie(20);
    const total = roll + attack.toHitBonus;
    const critical = roll === 20;
    const fumble = roll === 1;
    const hit = critical || (!fumble && total >= Number(target.ac || 10));
    const damage = hit ? rollDamage(attack.dice, critical) : { total: 0, rolls: [], expression: attack.dice?.expression || '' };
    if (hit && damage.total > 0) onApplyDamage?.(target.id, damage.total);
    const next = { mode: 'digital', roll, total, hit, critical, damage };
    setResult(next);
    announce(hit, total, hit ? damage.total : null, critical, roll);
  };

  const physicalAttack = () => {
    if (!attack || !target || String(physicalRoll).trim() === '') return;
    const roll = Math.max(1, Math.min(20, Math.floor(numberOr(physicalRoll, 1))));
    const total = roll + attack.toHitBonus;
    const critical = roll === 20;
    const fumble = roll === 1;
    const hit = critical || (!fumble && total >= Number(target.ac || 10));
    const damage = hit && String(physicalDamage).trim() !== '' ? Math.max(0, Math.floor(numberOr(physicalDamage, 0))) : null;
    if (hit && damage > 0) onApplyDamage?.(target.id, damage);
    const next = { mode: 'physical', roll, total, hit, critical, damage };
    setResult(next);
    announce(hit, total, damage, critical, roll);
  };

  if (!attacks.length) {
    return (
      <div style={shellStyle}>
        <div style={headerStyle}><strong><Swords size={14} /> {attacker.name}</strong><button type="button" onClick={onClose} style={iconStyle}><X size={14} /></button></div>
        <div style={emptyStyle}>No parseable attack found. Add an attack such as “Bite: +5 to hit, 2d6+3 piercing” to the creature first.</div>
      </div>
    );
  }

  return (
    <div style={shellStyle} data-testid="targeted-attack-panel">
      <div style={headerStyle}>
        <strong><Target size={14} /> Targeted Attack</strong>
        <button type="button" onClick={onClose} style={iconStyle}><X size={14} /></button>
      </div>

      <div style={selectGridStyle}>
        <label style={labelStyle}>Attack
          <select value={attack?.id || ''} onChange={event => { setAttackId(event.target.value); setResult(null); }} style={selectStyle}>
            {attacks.map(item => <option key={item.id} value={item.id}>{item.name} ({item.toHitBonus >= 0 ? '+' : ''}{item.toHitBonus}{item.dice ? ` · ${item.dice.expression}` : ''})</option>)}
          </select>
        </label>
        <label style={labelStyle}>Target
          <select value={target?.id || ''} onChange={event => { setTargetId(event.target.value); setResult(null); }} style={selectStyle}>
            {targets.map(item => <option key={item.id} value={item.id}>{item.name} · AC {item.ac} · HP {item.hp}/{item.maxHp}</option>)}
          </select>
        </label>
      </div>

      <div style={modeStyle}>
        <button type="button" onClick={() => { setMode('digital'); setResult(null); }} data-active={mode === 'digital'} style={modeButtonStyle(mode === 'digital')}><Dices size={13} /> Rook Rolls</button>
        <button type="button" onClick={() => { setMode('physical'); setResult(null); }} data-active={mode === 'physical'} style={modeButtonStyle(mode === 'physical')}><Shield size={13} /> Physical Dice</button>
      </div>

      {mode === 'digital' ? (
        <button type="button" disabled={!target} onClick={digitalAttack} style={primaryStyle}><Dices size={14} /> Roll Attack & Damage</button>
      ) : (
        <div style={physicalGridStyle}>
          <label style={labelStyle}>d20 result
            <input type="number" min="1" max="20" value={physicalRoll} onChange={event => setPhysicalRoll(event.target.value)} placeholder="e.g. 14" style={inputStyle} />
          </label>
          <label style={labelStyle}>Damage if it hits
            <input type="number" min="0" value={physicalDamage} onChange={event => setPhysicalDamage(event.target.value)} placeholder="e.g. 8" style={inputStyle} />
          </label>
          <button type="button" disabled={!target || String(physicalRoll).trim() === ''} onClick={physicalAttack} style={primaryStyle}><Check size={14} /> Check & Apply</button>
        </div>
      )}

      {result && (
        <div style={resultStyle(result.hit)}>
          <strong>{result.hit ? (result.critical ? 'Critical hit' : 'Hit') : 'Miss'} · {result.total} vs AC {target?.ac}</strong>
          <span>d20 {result.roll} {attack?.toHitBonus ? `${attack.toHitBonus >= 0 ? '+' : ''}${attack.toHitBonus}` : ''}</span>
          {result.hit && result.mode === 'digital' && <span>{result.damage.total} damage{result.damage.expression ? ` · ${result.damage.expression}` : ''}</span>}
          {result.hit && result.mode === 'physical' && result.damage !== null && <span>{result.damage} damage applied</span>}
          {result.hit && result.mode === 'physical' && result.damage === null && <span>Hit confirmed. Enter damage and press Check & Apply again when ready.</span>}
        </div>
      )}
    </div>
  );
}

const shellStyle = { display: 'grid', gap: 7, background: rq.panel, border: `1px solid ${rq.line}`, padding: 8 };
const headerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, color: rq.text, fontSize: 11 };
const iconStyle = { width: 28, height: 28, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.muted, display: 'grid', placeItems: 'center', cursor: 'pointer' };
const selectGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 5 };
const labelStyle = { display: 'grid', gap: 3, color: rq.muted, fontSize: 8, fontWeight: 900, textTransform: 'uppercase' };
const selectStyle = { minWidth: 0, width: '100%', minHeight: 35, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px', fontSize: 10 };
const modeStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 };
const modeButtonStyle = active => ({ minHeight: 34, border: `1px solid ${active ? rq.red : rq.line}`, background: active ? 'rgba(208,0,0,.14)' : rq.bg, color: active ? rq.text : rq.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 10, fontWeight: 900 });
const primaryStyle = { minHeight: 37, border: 0, background: rq.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontSize: 10, fontWeight: 950 };
const physicalGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 5, alignItems: 'end' };
const inputStyle = { width: '100%', minWidth: 0, minHeight: 35, boxSizing: 'border-box', background: rq.bg, border: `1px solid ${rq.line}`, color: rq.text, padding: '0 7px' };
const resultStyle = hit => ({ display: 'grid', gap: 2, border: `1px solid ${hit ? rq.green : rq.danger}`, background: hit ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', padding: 7, color: rq.text, fontSize: 10 });
const emptyStyle = { color: rq.muted, fontSize: 10, padding: 7, background: rq.bg, textAlign: 'center' };
