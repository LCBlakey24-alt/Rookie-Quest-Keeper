import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dice6 } from 'lucide-react';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import { getAnimationTarget, rollDiceNotation } from '@/data/diceRoller';

const rollTheme = {
  accent: 'var(--rq-accent-primary, #D6A84F)',
  accentHover: 'var(--rq-accent-hover, #F0CF75)',
  magic: 'var(--rq-accent-magic, #59C8FF)',
  surface: 'rgba(17, 21, 42, 0.82)',
  surfaceHover: 'rgba(25, 29, 58, 0.94)',
  text: 'var(--rq-text-primary, #F6EAD2)',
  muted: 'var(--rq-text-secondary, #D9C8A5)',
  border: 'var(--rq-accent-border, rgba(214, 168, 79, 0.34))',
};

const safeTestId = (prefix, label = 'roll') => `${prefix}-${String(label || 'roll').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'roll'}`;
const formatSigned = (value) => {
  const numeric = Number(value) || 0;
  return numeric >= 0 ? `+${numeric}` : `${numeric}`;
};
const formatFormulaModifier = (value) => {
  const numeric = Number(value) || 0;
  if (numeric === 0) return '';
  return numeric > 0 ? `+${numeric}` : `${numeric}`;
};
const normalizeDiceType = (diceType = 'd20') => String(diceType || 'd20').trim().replace(/\s+/g, '') || 'd20';
const buildNotation = (diceType, modifier = 0) => `${normalizeDiceType(diceType)}${formatFormulaModifier(modifier)}`;

function describeRoll(result, rollType = 'normal') {
  const rollText = (result.rolls || []).map((roll) => {
    const state = roll.dropped ? ' dropped' : roll.exploded ? ' exploding' : '';
    return `d${roll.sides}: ${roll.result}${state}`;
  }).join(' • ');
  const modeText = rollType === 'advantage' ? 'Advantage' : rollType === 'disadvantage' ? 'Disadvantage' : 'Roll';
  const modifierText = result.modifier ? ` ${result.modifier > 0 ? '+' : '-'} ${Math.abs(result.modifier)}` : '';
  return `${modeText} • ${rollText}${modifierText} = ${result.total}`;
}

function getButtonSize(size) {
  const sizes = {
    small: { fontSize: 13, padding: '4px 8px', iconSize: 12, gap: 5, minWidth: 42, minHeight: 34, borderRadius: 12 },
    default: { fontSize: 14, padding: '6px 10px', iconSize: 14, gap: 6, minWidth: 48, minHeight: 38, borderRadius: 13 },
    large: { fontSize: 18, padding: '8px 14px', iconSize: 18, gap: 8, minWidth: 62, minHeight: 46, borderRadius: 16 },
  };
  return sizes[size] || sizes.default;
}

function buildRollButtonStyle({ rolling, isHovered, color, size }) {
  const s = getButtonSize(size);
  return {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    minWidth: s.minWidth,
    minHeight: s.minHeight,
    padding: s.padding,
    overflow: 'hidden',
    background: rolling || isHovered
      ? `linear-gradient(145deg, rgba(214, 168, 79, 0.20), rgba(89, 200, 255, 0.12)), ${rollTheme.surfaceHover}`
      : `linear-gradient(145deg, rgba(246, 234, 210, 0.08), rgba(89, 200, 255, 0.06)), ${rollTheme.surface}`,
    border: `1px solid ${isHovered || rolling ? color : rollTheme.border}`,
    borderRadius: s.borderRadius,
    color: rollTheme.text,
    fontSize: s.fontSize,
    fontWeight: 950,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    cursor: 'pointer',
    transition: 'transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease, color 160ms ease',
    transform: rolling ? 'translateY(-1px) scale(1.04)' : isHovered ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: isHovered || rolling
      ? `0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.22), 0 0 20px color-mix(in srgb, ${color} 30%, transparent)`
      : 'inset 0 1px 0 rgba(255,255,255,0.08)',
  };
}

function buttonGlow(color) {
  return {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
    background: `radial-gradient(circle at 20% 0%, color-mix(in srgb, ${color} 22%, transparent), transparent 38%)`,
    opacity: 0.9,
    pointerEvents: 'none',
  };
}

export function DiceRollButton({
  modifier,
  label,
  diceType = 'd20',
  advantage = false,
  disadvantage = false,
  showDice = true,
  size = 'default',
  color = rollTheme.accentHover,
  allowExploding = false,
}) {
  const [rolling, setRolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const numericModifier = Number(modifier) || 0;
  const displayModifier = formatSigned(numericModifier);
  const rollType = advantage ? 'advantage' : disadvantage ? 'disadvantage' : 'normal';
  const notation = buildNotation(diceType, numericModifier);
  const s = getButtonSize(size);

  const handleRoll = (event) => {
    event.stopPropagation();
    setRolling(true);

    const result = rollDiceNotation(notation, { rollType, exploding: allowExploding });
    if (!result.rolls.length) {
      toast.error('Could not roll dice', { description: `${notation} is not a valid dice formula.` });
      setRolling(false);
      return;
    }

    const displayLabel = label ? `${label}: ${notation}` : notation;
    setRollResult({
      ...result,
      label: displayLabel,
      animationValue: getAnimationTarget(result),
    });

    toast(`${label || 'Roll'}: ${result.total}`, {
      description: describeRoll(result, rollType),
      icon: <Dice6 size={18} color={color} />,
      duration: 1400,
    });

    window.setTimeout(() => setRolling(false), 260);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleRoll}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={safeTestId('dice-roll', label)}
        aria-label={`Roll ${notation}${label ? ` for ${label}` : ''}`}
        style={buildRollButtonStyle({ rolling, isHovered, color, size })}
        title={`Roll ${notation}${label ? ` for ${label}` : ''}`}
      >
        <span style={buttonGlow(color)} />
        {showDice && <Dice6 size={s.iconSize} color={isHovered || rolling ? color : rollTheme.muted} style={{ flexShrink: 0 }} />}
        <span>{displayModifier}</span>
      </button>
      {rollResult && (
        <DiceRollFlicker
          isOpen={Boolean(rollResult)}
          onClose={() => setRollResult(null)}
          label={rollResult.label}
          rolls={rollResult.rolls}
          modifier={rollResult.modifier}
          total={rollResult.total}
          animationValue={rollResult.animationValue}
          isCrit={rollResult.isCrit}
          isFumble={rollResult.isFumble}
          theme="player"
        />
      )}
    </>
  );
}

export function ClickableModifier({
  modifier,
  label,
  color = rollTheme.accentHover,
}) {
  return (
    <DiceRollButton
      modifier={modifier}
      label={label}
      showDice={false}
      size="small"
      color={color}
    />
  );
}

export function DamageRollButton({
  diceFormula,
  label = 'Damage',
  damageType = 'damage',
  color = rollTheme.accentHover,
}) {
  const [rolling, setRolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const formula = normalizeDiceType(diceFormula || '1d6');

  const handleRoll = (event) => {
    event.stopPropagation();
    setRolling(true);

    const result = rollDiceNotation(formula);
    if (!result.rolls.length) {
      toast.error('Could not roll damage', { description: `${formula} is not a valid dice formula.` });
      setRolling(false);
      return;
    }

    const displayLabel = `${label}: ${formula}`;
    setRollResult({
      ...result,
      label: displayLabel,
      animationValue: getAnimationTarget(result),
    });

    toast(`${label}: ${result.total}`, {
      description: `${describeRoll(result)} ${damageType}`,
      icon: <Dice6 size={18} color={color} />,
      duration: 1400,
    });

    window.setTimeout(() => setRolling(false), 260);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleRoll}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={safeTestId('damage-roll', label)}
        aria-label={`Roll ${formula} ${damageType}`}
        style={buildRollButtonStyle({ rolling, isHovered, color, size: 'default' })}
        title={`Roll ${formula} ${damageType}`}
      >
        <span style={buttonGlow(color)} />
        <Dice6 size={14} color={isHovered || rolling ? color : rollTheme.muted} style={{ flexShrink: 0 }} />
        <span>{formula}</span>
      </button>
      {rollResult && (
        <DiceRollFlicker
          isOpen={Boolean(rollResult)}
          onClose={() => setRollResult(null)}
          label={rollResult.label}
          rolls={rollResult.rolls}
          modifier={rollResult.modifier}
          total={rollResult.total}
          animationValue={rollResult.animationValue}
          isCrit={rollResult.isCrit}
          isFumble={rollResult.isFumble}
          theme="player"
        />
      )}
    </>
  );
}

export default DiceRollButton;
