import { getAsiLevels, getChoicesForStartingLevel } from './classLevelRules';

export const ABILITY_OPTIONS = [
  ['strength', 'STR'],
  ['dexterity', 'DEX'],
  ['constitution', 'CON'],
  ['intelligence', 'INT'],
  ['wisdom', 'WIS'],
  ['charisma', 'CHA'],
];

const arr = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const displayName = (value) => typeof value === 'string' ? value : value?.name || value?.title || String(value || '');
const clampScore = (value) => Math.max(3, Math.min(20, Number(value || 10)));

export function getFeatName(feat) {
  return displayName(feat);
}

export function getFeatOptions({ edition = '2014', level = 1, registryFeats = [], uploadedFeats = [] } = {}) {
  const category = String(edition) === '2024' && Number(level) >= 19 ? 'epic' : 'general';
  const all = [...arr(registryFeats), ...arr(uploadedFeats)];
  const seen = new Set();
  return all
    .filter((feat) => {
      const name = getFeatName(feat);
      if (!name || seen.has(name.toLowerCase())) return false;
      const rulesets = arr(feat.rulesets || feat.editions);
      const matchesEdition = !rulesets.length || rulesets.includes(String(edition));
      const matchesCategory = !feat.category || feat.category === category || (category === 'general' && feat.category === 'origin');
      if (!matchesEdition || !matchesCategory) return false;
      seen.add(name.toLowerCase());
      return true;
    })
    .sort((a, b) => getFeatName(a).localeCompare(getFeatName(b)));
}

export function buildStartingLevelChoicePlan({ className, startingLevel = 1, edition = '2014' } = {}) {
  const level = Math.max(1, Math.min(20, Number(startingLevel || 1)));
  const baseChoices = getChoicesForStartingLevel({ className, startingLevel: level, edition });
  const asiLevels = getAsiLevels(className).filter((asiLevel) => asiLevel <= level);
  const manualHooks = [];

  if (['Warlock'].includes(className) && level >= 2) {
    manualHooks.push({ type: 'class_choice', level: 2, label: 'Choose Eldritch Invocations as your Warlock level increases.' });
  }
  if (['Sorcerer'].includes(className) && level >= 3) {
    manualHooks.push({ type: 'class_choice', level: 3, label: 'Choose Metamagic options.' });
  }
  if (['Bard', 'Rogue'].includes(className) && level >= 3) {
    manualHooks.push({ type: 'class_choice', level: 3, label: 'Choose Expertise or class options as needed.' });
  }
  if (['Fighter', 'Paladin', 'Ranger'].includes(className) && level >= 1) {
    manualHooks.push({ type: 'class_choice', level: 1, label: 'Review fighting style or martial choices.' });
  }

  return {
    level,
    baseChoices,
    asiChoices: asiLevels.map((asiLevel) => ({ id: `asi-${asiLevel}`, level: asiLevel, type: 'asi_or_feat', label: `Level ${asiLevel} ASI / feat` })),
    spellChoices: baseChoices.filter((choice) => choice.type === 'spellcasting_start'),
    subclassChoices: baseChoices.filter((choice) => choice.type === 'subclass'),
    manualHooks,
    hasChoices: baseChoices.length > 0 || manualHooks.length > 0,
  };
}

export function defaultAsiSelection(existing) {
  return {
    mode: existing?.mode || 'asi',
    abilityOne: existing?.abilityOne || 'strength',
    abilityTwo: existing?.abilityTwo || 'strength',
    featName: existing?.featName || '',
  };
}

export function applyStartingLevelChoicesToPayload(payload, selections = {}, featOptions = []) {
  if (!payload || typeof payload !== 'object') return payload;
  const next = { ...payload };
  const feats = [...arr(payload.feats)];

  Object.entries(selections || {}).forEach(([choiceId, rawSelection]) => {
    if (!choiceId.startsWith('asi-')) return;
    const selection = defaultAsiSelection(rawSelection);
    if (selection.mode === 'feat') {
      const featName = selection.featName;
      if (!featName || feats.some((feat) => getFeatName(feat) === featName)) return;
      const feat = featOptions.find((item) => getFeatName(item) === featName) || { name: featName };
      feats.push({
        name: featName,
        description: feat.description || '',
        source: feat.source || feat.source_label || 'level-up',
        level_choice: Number(choiceId.replace('asi-', '')) || undefined,
      });
      return;
    }

    [selection.abilityOne, selection.abilityTwo].filter(Boolean).forEach((ability) => {
      if (next[ability] === undefined) return;
      next[ability] = clampScore(Number(next[ability] || 10) + 1);
    });
  });

  next.feats = feats;
  return next;
}
