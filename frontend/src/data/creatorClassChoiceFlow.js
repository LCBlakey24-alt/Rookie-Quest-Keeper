export const FIGHTER_FIGHTING_STYLES = ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'];

const choiceName = (choice) => (choice || '').trim();

export function isFighterFightingStyleRequired({ className, level = 1 } = {}) {
  return className === 'Fighter' && Number(level || 1) === 1;
}

export function getMissingClassChoiceMessages({ className, level = 1, choices = {} } = {}) {
  const missing = [];

  if (isFighterFightingStyleRequired({ className, level }) && !choiceName(choices.fighterFightingStyle)) {
    missing.push('Choose a Fighter fighting style.');
  }

  return missing;
}

export function isClassChoiceComplete({ className, level = 1, choices = {} } = {}) {
  return getMissingClassChoiceMessages({ className, level, choices }).length === 0;
}

export function buildFighterFightingStyleFeature(fighterFightingStyle) {
  const style = choiceName(fighterFightingStyle);
  if (!style) return null;

  return {
    name: `Fighting Style: ${style}`,
    description: `Fighter level 1 fighting style: ${style}.`,
  };
}

export function mergeClassChoiceFeatures({ className, baseFeatures = [], choices = {} } = {}) {
  const features = Array.isArray(baseFeatures) ? [...baseFeatures] : [];

  if (className !== 'Fighter') return features;

  const fightingStyleFeature = buildFighterFightingStyleFeature(choices.fighterFightingStyle);
  if (!fightingStyleFeature) return features;

  const withoutGenericFightingStyle = features.filter((feature) => {
    const name = typeof feature === 'string' ? feature : feature?.name;
    return name !== 'Fighting Style' && !String(name || '').startsWith('Fighting Style:');
  });

  return [fightingStyleFeature, ...withoutGenericFightingStyle];
}
