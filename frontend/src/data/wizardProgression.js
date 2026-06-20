export const WIZARD_SUBCLASS_FEATURE_LEVELS_2014 = [2, 6, 10, 14];
export const WIZARD_SUBCLASS_FEATURE_LEVELS_2024 = [3, 6, 10, 14];
export const WIZARD_ASI_LEVELS = [4, 8, 12, 16, 19];

export function normaliseWizardRulesEdition(edition = '2014') {
  return String(edition || '').includes('2024') ? '2024' : '2014';
}

export function getWizardSpellcastingLevel(level = 1) {
  const wizardLevel = Math.max(0, Number(level || 0));
  return Math.floor(wizardLevel);
}

export function getWizardSubclassChoiceLevel(edition = '2014') {
  return normaliseWizardRulesEdition(edition) === '2024' ? 3 : 2;
}

export function getWizardSubclassFeatureLevels(edition = '2014') {
  return normaliseWizardRulesEdition(edition) === '2024'
    ? WIZARD_SUBCLASS_FEATURE_LEVELS_2024
    : WIZARD_SUBCLASS_FEATURE_LEVELS_2014;
}

export function getWizardArcaneRecoveryLevel(level = 1) {
  const wizardLevel = Math.max(0, Number(level || 0));
  if (wizardLevel < 1) return 0;
  return Math.max(1, Math.ceil(wizardLevel / 2));
}

function asiFeature(level) {
  return {
    level,
    key: level === 19 ? 'epic_boon_or_asi' : `ability_score_improvement_${level}`,
    name: level === 19 ? 'Epic Boon / Ability Score Improvement' : 'Ability Score Improvement / Feat',
    type: 'choice',
    choiceType: level === 19 ? 'epic_boon_or_asi' : 'asi_or_feat',
  };
}

const WIZARD_FEATURES_2014 = [
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 1, key: 'arcane_recovery', name: 'Arcane Recovery', type: 'recovery' },
  { level: 2, key: 'arcane_tradition', name: 'Arcane Tradition', type: 'choice', choiceType: 'subclass' },
  { level: 6, key: 'arcane_tradition_feature_6', name: 'Arcane Tradition Feature', type: 'subclass' },
  { level: 10, key: 'arcane_tradition_feature_10', name: 'Arcane Tradition Feature', type: 'subclass' },
  { level: 14, key: 'arcane_tradition_feature_14', name: 'Arcane Tradition Feature', type: 'subclass' },
  { level: 18, key: 'spell_mastery', name: 'Spell Mastery', type: 'spellcasting' },
  { level: 20, key: 'signature_spells', name: 'Signature Spells', type: 'spellcasting' },
  ...WIZARD_ASI_LEVELS.map(asiFeature),
];

const WIZARD_FEATURES_2024 = [
  { level: 1, key: 'spellcasting', name: 'Spellcasting', type: 'spellcasting' },
  { level: 1, key: 'arcane_recovery', name: 'Arcane Recovery', type: 'recovery' },
  { level: 1, key: 'ritual_adept', name: 'Ritual Adept', type: 'utility' },
  { level: 2, key: 'scholar', name: 'Scholar', type: 'choice', choiceType: 'scholar_skill' },
  { level: 3, key: 'wizard_subclass', name: 'Wizard Subclass', type: 'choice', choiceType: 'subclass' },
  { level: 5, key: 'memorize_spell', name: 'Memorize Spell', type: 'spellcasting' },
  { level: 6, key: 'subclass_feature_6', name: 'Wizard Subclass Feature', type: 'subclass' },
  { level: 10, key: 'subclass_feature_10', name: 'Wizard Subclass Feature', type: 'subclass' },
  { level: 14, key: 'subclass_feature_14', name: 'Wizard Subclass Feature', type: 'subclass' },
  { level: 18, key: 'spell_mastery', name: 'Spell Mastery', type: 'spellcasting' },
  { level: 20, key: 'signature_spells', name: 'Signature Spells', type: 'spellcasting' },
  ...WIZARD_ASI_LEVELS.map(asiFeature),
];

export function getWizardProgression(edition = '2014') {
  return normaliseWizardRulesEdition(edition) === '2024' ? WIZARD_FEATURES_2024 : WIZARD_FEATURES_2014;
}

export function getWizardFeaturesForLevel(level = 1, edition = '2014') {
  const wizardLevel = Math.max(1, Number(level || 1));
  return getWizardProgression(edition).filter(feature => feature.level === wizardLevel);
}

export function getActiveWizardFeatures(level = 1, edition = '2014') {
  const wizardLevel = Math.max(1, Number(level || 1));
  return getWizardProgression(edition).filter(feature => feature.level <= wizardLevel);
}

export function getWizardChoicesForLevel(level = 1, edition = '2014') {
  return getWizardFeaturesForLevel(level, edition).filter(feature => feature.type === 'choice');
}

export function getNextWizardFeatures(level = 1, edition = '2014') {
  const wizardLevel = Math.max(1, Number(level || 1));
  const nextLevel = getWizardProgression(edition).find(feature => feature.level > wizardLevel)?.level;
  return nextLevel ? getWizardFeaturesForLevel(nextLevel, edition) : [];
}

export function getWizardProgressionSummary(level = 1, edition = '2014') {
  const wizardLevel = Math.max(1, Number(level || 1));
  const ruleset = normaliseWizardRulesEdition(edition);

  return {
    className: 'Wizard',
    edition: ruleset,
    level: wizardLevel,
    spellcastingLevel: getWizardSpellcastingLevel(wizardLevel),
    arcaneRecoveryLevel: getWizardArcaneRecoveryLevel(wizardLevel),
    subclassChoiceLevel: getWizardSubclassChoiceLevel(ruleset),
    subclassFeatureLevels: getWizardSubclassFeatureLevels(ruleset),
    currentLevelFeatures: getWizardFeaturesForLevel(wizardLevel, ruleset),
    activeFeatures: getActiveWizardFeatures(wizardLevel, ruleset),
    nextFeatures: getNextWizardFeatures(wizardLevel, ruleset),
    choices: getActiveWizardFeatures(wizardLevel, ruleset).filter(feature => feature.type === 'choice'),
  };
}
