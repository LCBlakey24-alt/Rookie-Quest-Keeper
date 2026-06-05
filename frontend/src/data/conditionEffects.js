/**
 * D&D 5e Condition Effects System
 * Maps each condition to its mechanical effects on rolls.
 * Used by UnifiedReferenceCenter, CharacterLeftPanel, and CharacterSkillsPanel.
 */

// Roll contexts that conditions can affect
// 'attack' = attack rolls, 'ability_check' = skill checks, 'saving_throw' = saving throws
// Ability-specific: 'str_save', 'dex_save', 'str_check', 'dex_check', etc.

import { theme } from '../lib/theme';

export const CONDITION_EFFECTS = {
  blinded: {
    label: 'Blinded',
    icon: 'eye-off',
    color: theme.text.muted,
    effects: {
      attack: 'disadvantage',       // Disadvantage on attack rolls
    },
    notes: 'Auto-fail sight-based Perception checks',
  },
  charmed: {
    label: 'Charmed',
    icon: 'heart',
    color: theme.accent?.primary || theme.accent,
    effects: {},
    notes: "Can't attack the charmer. Charmer has advantage on social checks against you.",
  },
  deafened: {
    label: 'Deafened',
    icon: 'ear-off',
    color: theme.text.muted,
    effects: {},
    notes: 'Auto-fail hearing-based Perception checks',
  },
  frightened: {
    label: 'Frightened',
    icon: 'alert-triangle',
    color: theme.warning,
    effects: {
      attack: 'disadvantage',       // Disadvantage on attack rolls
      ability_check: 'disadvantage', // Disadvantage on ability checks
    },
    notes: "Can't willingly move closer to the source of fear",
  },
  grappled: {
    label: 'Grappled',
    icon: 'grip-horizontal',
    color: theme.warning,
    effects: {},
    notes: 'Speed becomes 0',
  },
  incapacitated: {
    label: 'Incapacitated',
    icon: 'ban',
    color: theme.danger,
    effects: {},
    notes: "Can't take actions or reactions",
  },
  invisible: {
    label: 'Invisible',
    icon: 'ghost',
    color: theme.accent?.primary || theme.accent,
    effects: {
      attack: 'advantage',          // Advantage on attack rolls
    },
    notes: 'Heavily obscured for sight. Attacks against you have disadvantage.',
  },
  paralyzed: {
    label: 'Paralyzed',
    icon: 'lock',
    color: theme.danger,
    effects: {
      str_save: 'auto_fail',        // Auto-fail STR saves
      dex_save: 'auto_fail',        // Auto-fail DEX saves
    },
    notes: 'Incapacitated. Attacks against you have advantage. Melee hits are critical.',
  },
  petrified: {
    label: 'Petrified',
    icon: 'mountain',
    color: theme.text.muted,
    effects: {
      str_save: 'auto_fail',
      dex_save: 'auto_fail',
    },
    notes: 'Turned to stone. Resistance to all damage. Immune to poison/disease.',
  },
  poisoned: {
    label: 'Poisoned',
    icon: 'flask-round',
    color: theme.success,
    effects: {
      attack: 'disadvantage',        // Disadvantage on attack rolls
      ability_check: 'disadvantage', // Disadvantage on all ability checks
    },
    notes: 'Disadvantage on attack rolls and ability checks',
  },
  prone: {
    label: 'Prone',
    icon: 'arrow-down',
    color: theme.warning,
    effects: {
      attack: 'disadvantage',        // Disadvantage on attack rolls
    },
    notes: 'Melee attacks against you have advantage. Ranged have disadvantage. Costs half speed to stand.',
  },
  restrained: {
    label: 'Restrained',
    icon: 'link',
    color: theme.accent?.secondary || theme.accent?.primary || theme.accent,
    effects: {
      attack: 'disadvantage',        // Disadvantage on attack rolls
      dex_save: 'disadvantage',      // Disadvantage on DEX saves
    },
    notes: 'Speed 0. Attacks against you have advantage.',
  },
  stunned: {
    label: 'Stunned',
    icon: 'zap-off',
    color: theme.warning,
    effects: {
      str_save: 'auto_fail',
      dex_save: 'auto_fail',
    },
    notes: 'Incapacitated. Attacks against you have advantage.',
  },
  unconscious: {
    label: 'Unconscious',
    icon: 'moon',
    color: theme.bg.surface,
    effects: {
      str_save: 'auto_fail',
      dex_save: 'auto_fail',
    },
    notes: 'Prone, incapacitated. Attacks have advantage, melee hits are critical.',
  },
  exhaustion: {
    label: 'Exhaustion',
    icon: 'battery-low',
    color: theme.warning,
    effects: {
      // Level 1+: disadvantage on ability checks
      ability_check: 'disadvantage',
      // Higher levels have additional effects handled separately
    },
    notes: 'Level 1: Disadvantage on checks. Level 3: Disadvantage on attacks/saves. Level 6: Death.',
  },
  concentrating: {
    label: 'Concentrating',
    icon: 'focus',
    color: theme.accent?.primary || theme.accent,
    effects: {},
    notes: 'Maintaining a spell. CON save on damage (DC = max of 10 or half damage).',
  },
};

/**
 * Returns mechanical effects of a given exhaustion level (0–6).
 * D&D 5e 2014 cumulative scale.
 */
export function getExhaustionEffects(level = 0) {
  const lvl = Math.max(0, Math.min(6, Number(level) || 0));
  return {
    level: lvl,
    abilityCheckDisadvantage: lvl >= 1,
    speedHalved: lvl >= 2,
    attackAndSaveDisadvantage: lvl >= 3,
    hpMaxHalved: lvl >= 4,
    speedZero: lvl >= 5,
    death: lvl >= 6,
    description: [
      'No effect',
      'Disadvantage on ability checks',
      'Speed halved',
      'Disadvantage on attack rolls and saving throws',
      'Hit point maximum halved',
      'Speed reduced to 0',
      'Death'
    ][lvl] || 'No effect'
  };
}

/**
 * Determine the effective roll mode given active conditions and roll context.
 * @param {string[]} conditions - Array of active condition keys
 * @param {string} context - 'attack', 'ability_check', 'str_save', 'dex_save', etc.
 * @param {string} userOverride - 'normal', 'advantage', 'disadvantage' from user toggle
 * @param {number} exhaustionLevel - Optional 0-6 exhaustion level
 * @returns {{ mode: string, reason: string|null, autoFail: boolean }}
 */
export function getConditionRollEffect(conditions = [], context, userOverride = 'normal', exhaustionLevel = 0) {
  let hasAdvantage = false;
  let hasDisadvantage = false;
  let autoFail = false;
  let reasons = [];

  for (const condKey of conditions) {
    const cond = CONDITION_EFFECTS[condKey];
    if (!cond) continue;

    // Check specific context first (e.g., 'str_save', 'dex_save')
    const specificEffect = cond.effects[context];
    // Then check general context (e.g., 'attack', 'ability_check')
    const generalContext = context.includes('_save') ? null : context.includes('_check') ? 'ability_check' : null;
    const generalEffect = generalContext ? cond.effects[generalContext] : null;

    const effect = specificEffect || generalEffect;
    if (!effect) continue;

    if (effect === 'auto_fail') {
      autoFail = true;
      reasons.push(`${cond.label}: auto-fail`);
    } else if (effect === 'advantage') {
      hasAdvantage = true;
      reasons.push(`${cond.label}: advantage`);
    } else if (effect === 'disadvantage') {
      hasDisadvantage = true;
      reasons.push(`${cond.label}: disadvantage`);
    }
  }

  // Apply graduated exhaustion effects
  if (exhaustionLevel > 0) {
    const isCheck = context.includes('_check') || context === 'ability_check';
    const isAttack = context === 'attack';
    const isSave = context.includes('_save') || context === 'saving_throw';
    if (exhaustionLevel >= 1 && isCheck) {
      hasDisadvantage = true;
      reasons.push(`Exhaustion ${exhaustionLevel}: disadvantage on checks`);
    }
    if (exhaustionLevel >= 3 && (isAttack || isSave)) {
      hasDisadvantage = true;
      reasons.push(`Exhaustion ${exhaustionLevel}: disadvantage on ${isAttack ? 'attacks' : 'saves'}`);
    }
  }

  // User override
  if (userOverride === 'advantage') hasAdvantage = true;
  if (userOverride === 'disadvantage') hasDisadvantage = true;

  // D&D 5e: If you have both advantage and disadvantage, they cancel out → normal
  let mode = 'normal';
  if (hasAdvantage && hasDisadvantage) {
    mode = 'normal';
    reasons.push('Advantage + Disadvantage cancel out');
  } else if (hasAdvantage) {
    mode = 'advantage';
  } else if (hasDisadvantage) {
    mode = 'disadvantage';
  }

  return {
    mode,
    autoFail,
    reason: reasons.length > 0 ? reasons.join(', ') : null,
  };
}

/**
 * Get a visual indicator for a skill/save roll based on conditions.
 * Returns { color, symbol, tooltip } or null.
 */
export function getConditionIndicator(conditions = [], context, exhaustionLevel = 0) {
  const { mode, autoFail, reason } = getConditionRollEffect(conditions, context, 'normal', exhaustionLevel);
  if (autoFail) return { color: theme.danger, symbol: '✕', tooltip: reason };
  if (mode === 'advantage') return { color: theme.success, symbol: '▲', tooltip: reason };
  if (mode === 'disadvantage') return { color: theme.danger, symbol: '▼', tooltip: reason };
  return null;
}
