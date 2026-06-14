import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dice6 } from 'lucide-react';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import { getAnimationTarget, rollDiceNotation } from '@/data/diceRoller';

// Mystic tabletop dice theme
const theme = {
  primary: '#7C3AED',
  cyan: '#A78BFA',
  hover: '#C084FC',
  subtle: 'rgba(124, 58, 237, 0.16)',
  border: 'rgba(124, 58, 237, 0.42)',
  crit: '#22C55E',
  fail: '#EF4444',
  text: '#FFFFFF'
};

/**
 * Clickable dice roll button for character sheets
 * Shows modifier and rolls d20 + modifier on click
 * Has a visible box/border to indicate clickability
 */
export function DiceRollButton({ 
  modifier, 
  label, 
  diceType = 'd20',
  advantage = false,
  disadvantage = false,
  showDice = true,
  size = 'default',  // 'small', 'default', 'large'
  color = theme.cyan,
  allowExploding = false
}) {
  const [rolling, setRolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rollResult, setRollResult] = useState(null);

  const handleRoll = (e) => {
    e.stopPropagation();
    setRolling(true);

    const numericModifier = Number(modifier) || 0;
    const notation = `${diceType}${numericModifier >= 0 ? `+${numericModifier}` : numericModifier}`;
    const result = rollDiceNotation(notation, {
      rollType: advantage ? 'advantage' : disadvantage ? 'disadvantage' : 'normal',
      exploding: allowExploding,
    });

    let message = `${label}: ${diceType}`;
    if (numericModifier >= 0) message += ` + ${numericModifier}`;
    else message += ` - ${Math.abs(numericModifier)}`;

    setRollResult({
      label: message,
      rolls: result.visibleRolls,
      modifier: result.modifier,
      total: result.total,
      animationValue: getAnimationTarget(result),
      isCrit: result.isCrit,
      isFumble: result.isFumble,
    });
    toast(message, { description: 'Rolling…', icon: <Dice6 size={18} color={color} />, duration: 1200 });

    setTimeout(() => setRolling(false), 300);
  };

  // Size variants
  const sizes = {
    small: { fontSize: '13px', padding: '3px 6px', iconSize: 11, gap: '4px' },
    default: { fontSize: '14px', padding: '4px 8px', iconSize: 12, gap: '5px' },
    large: { fontSize: '18px', padding: '6px 12px', iconSize: 16, gap: '6px' }
  };
  
  const s = sizes[size] || sizes.default;
  const displayModifier = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <>
      <button
        onClick={handleRoll}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-testid={`dice-roll-${label.toLowerCase().replace(/\s+/g, '-')}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: s.gap,
          padding: s.padding,
          background: rolling ? theme.subtle : isHovered ? theme.subtle : 'rgba(6, 182, 212, 0.08)',
          border: `1px solid ${isHovered || rolling ? theme.cyan : theme.border}`,
          borderRadius: '4px',
          color: isHovered ? theme.cyan : theme.text,
          fontSize: s.fontSize,
          fontWeight: '400',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          transform: rolling ? 'scale(1.05)' : 'scale(1)',
          minWidth: size === 'small' ? '36px' : '44px',
          boxShadow: isHovered ? `0 0 8px ${theme.border}` : 'none'
        }}
        title={`Click to roll ${diceType}${displayModifier} for ${label}`}
      >
        {showDice && <Dice6 size={s.iconSize} color={isHovered ? theme.cyan : color} style={{ flexShrink: 0 }} />}
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

/**
 * Inline clickable modifier (no dice icon, more compact)
 * Still has visible box for clickability
 */
export function ClickableModifier({ 
  modifier, 
  label, 
  color = theme.cyan 
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

/**
 * Dice roller for damage rolls (various dice types)
 */
export function DamageRollButton({ 
  diceFormula,  // e.g., "2d6+3"
  label = 'Damage',
  damageType = 'slashing',
  color = '#A78BFA',
  allowExploding = false
}) {
  const [rolling, setRolling] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [rollResult, setRollResult] = useState(null);

  const parseDiceFormula = (formula) => {
    // Parse formulas like "2d6+3", "1d8", "3d6-1"
    const match = formula.match(/(\d+)?d(\d+)([+-]\d+)?/i);
    if (!match) return { count: 1, sides: 6, modifier: 0 };
    return {
      count: parseInt(match[1]) || 1,
      sides: parseInt(match[2]) || 6,
      modifier: parseInt(match[3]) || 0
    };
  };

  const handleRoll = (e) => {
    e.stopPropagation();
    setRolling(true);
    
    const { modifier } = parseDiceFormula(diceFormula);
    const result = rollDiceNotation(diceFormula, { exploding: allowExploding });

    setRollResult({
      label: `${label}: ${diceFormula}`,
      rolls: result.visibleRolls,
      modifier,
      total: result.total,
      animationValue: getAnimationTarget(result),
    });
    toast(`${label}: ${diceFormula}`, { description: 'Rolling damage…', icon: <Dice6 size={18} color={color} />, duration: 1200 });
    
    setTimeout(() => setRolling(false), 300);
  };

  // Damage button uses red theme
  const damageTheme = {
    subtle: 'rgba(124, 58, 237, 0.10)',
    border: 'rgba(124, 58, 237, 0.38)',
    hover: 'rgba(124, 58, 237, 0.18)'
  };

  return (
    <>
      <button
      onClick={handleRoll}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`damage-roll-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 8px',
        background: rolling ? damageTheme.hover : isHovered ? damageTheme.hover : damageTheme.subtle,
        border: `1px solid ${isHovered || rolling ? color : damageTheme.border}`,
        borderRadius: '4px',
        color: isHovered ? color : theme.text,
        fontSize: '13px',
        fontWeight: '400',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: isHovered ? `0 0 8px ${damageTheme.border}` : 'none'
      }}
      title={`Click to roll ${diceFormula} ${damageType} damage`}
    >
      <Dice6 size={12} color={isHovered ? color : '#A78BFA'} style={{ flexShrink: 0 }} />
      <span>{diceFormula}</span>
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
          theme="player"
        />
      )}
    </>
  );
}

export default DiceRollButton;
