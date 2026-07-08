const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const clamp = (value, max = Infinity) => arr(value).slice(0, max);
const lower = (value = '') => String(value || '').toLowerCase();

export const SKILL_OPTIONS = [
  'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History',
  'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception',
  'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival',
];

export const FIGHTING_STYLE_OPTIONS = [
  'Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting',
  'Blind Fighting', 'Interception', 'Thrown Weapon Fighting', 'Unarmed Fighting',
];

export const METAMAGIC_OPTIONS = [
  'Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell', 'Heightened Spell',
  'Quickened Spell', 'Subtle Spell', 'Twinned Spell', 'Seeking Spell', 'Transmuted Spell',
];

export const MANEUVER_OPTIONS = [
  'Ambush', 'Bait and Switch', 'Brace', 'Commanding Presence', 'Commander’s Strike',
  'Disarming Attack', 'Distracting Strike', 'Evasive Footwork', 'Feinting Attack',
  'Goading Attack', 'Grappling Strike', 'Lunging Attack', 'Maneuvering Attack',
  'Menacing Attack', 'Parry', 'Precision Attack', 'Pushing Attack', 'Quick Toss',
  'Rally', 'Riposte', 'Sweeping Attack', 'Tactical Assessment', 'Trip Attack',
];

function fightingStyleTarget(className, level) {
  if (className === 'Fighter' && level >= 1) return 1;
  if (className === 'Paladin' && level >= 2) return 1;
  if (className === 'Ranger' && level >= 2) return 1;
  return 0;
}

function expertiseTarget(className, level) {
  if (className === 'Rogue') return level >= 6 ? 4 : level >= 1 ? 2 : 0;
  if (className === 'Bard') return level >= 10 ? 4 : level >= 3 ? 2 : 0;
  return 0;
}

function metamagicTarget(className, level) {
  if (className !== 'Sorcerer' || level < 3) return 0;
  if (level >= 17) return 4;
  if (level >= 10) return 3;
  return 2;
}

function maneuverTarget(className, level, subclassName = '') {
  if (className !== 'Fighter' || !lower(subclassName).includes('battle master') || level < 3) return 0;
  if (level >= 15) return 9;
  if (level >= 10) return 7;
  if (level >= 7) return 5;
  return 3;
}

export function buildClassSpecificChoicePlan({ className = '', level = 1, subclassName = '' } = {}) {
  const numericLevel = Math.max(1, Math.min(20, Number(level || 1)));
  const fightingStyles = fightingStyleTarget(className, numericLevel);
  const expertise = expertiseTarget(className, numericLevel);
  const metamagic = metamagicTarget(className, numericLevel);
  const maneuvers = maneuverTarget(className, numericLevel, subclassName);

  return {
    className,
    level: numericLevel,
    subclassName,
    fightingStyleTarget: fightingStyles,
    expertiseTarget: expertise,
    metamagicTarget: metamagic,
    maneuverTarget: maneuvers,
    hasChoices: Boolean(fightingStyles || expertise || metamagic || maneuvers),
    options: {
      fightingStyles: FIGHTING_STYLE_OPTIONS,
      expertiseSkills: SKILL_OPTIONS,
      metamagic: METAMAGIC_OPTIONS,
      maneuvers: MANEUVER_OPTIONS,
    },
  };
}

export function normaliseClassSpecificSelection(selection = {}, plan = {}) {
  return {
    fightingStyles: clamp(selection.fightingStyles || selection.fighting_styles, plan.fightingStyleTarget || 0),
    expertise: clamp(selection.expertise || selection.expertise_choices, plan.expertiseTarget || 0),
    metamagic: clamp(selection.metamagic || selection.metamagic_options, plan.metamagicTarget || 0),
    maneuvers: clamp(selection.maneuvers || selection.combat_maneuvers, plan.maneuverTarget || 0),
  };
}

function addFeature(features, name, description) {
  const existing = arr(features);
  if (existing.some((feature) => (feature?.name || feature) === name)) return existing;
  return [...existing, { name, description, source: 'starting-level choice' }];
}

export function applyClassSpecificChoicesToPayload(payload, selection = {}, plan = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  const current = normaliseClassSpecificSelection(selection, plan);

  if (current.fightingStyles.length) {
    next.fighting_styles = current.fightingStyles;
    next.fighting_style = current.fightingStyles[0];
    current.fightingStyles.forEach((style) => {
      next.class_features = addFeature(next.class_features, `Fighting Style: ${style}`, 'Class fighting style selected during starting-level creation.');
    });
  }

  if (current.expertise.length) {
    next.expertise_choices = current.expertise;
    next.expertise = current.expertise;
  }

  if (current.metamagic.length) {
    next.metamagic_options = current.metamagic;
    next.metamagic = current.metamagic;
    next.sorcery_points = Math.max(Number(next.sorcery_points || 0), Number(plan.level || next.level || 0));
    next.sorcery_points_remaining = next.sorcery_points;
  }

  if (current.maneuvers.length) {
    next.combat_maneuvers = current.maneuvers;
    next.maneuvers = current.maneuvers;
    next.superiority_dice = {
      die: Number(plan.level || next.level || 0) >= 10 ? 'd10' : 'd8',
      total: Number(plan.level || next.level || 0) >= 15 ? 6 : 4,
      remaining: Number(plan.level || next.level || 0) >= 15 ? 6 : 4,
    };
    next.class_features = addFeature(next.class_features, 'Combat Superiority', 'Battle Master maneuvers selected during starting-level creation.');
  }

  return next;
}
