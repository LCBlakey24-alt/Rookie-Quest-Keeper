export const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma"
];

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const MIN_ABILITY_SCORE = 3;
export const MAX_ABILITY_SCORE = 20;
export const POINT_BUY_TOTAL = 27;

export const clampScore = (value) => {
  if (value === "") return "";
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return "";
  return Math.max(MIN_ABILITY_SCORE, Math.min(MAX_ABILITY_SCORE, asNumber));
};

export const calculatePointBuyCost = (score) => {
  const numeric = Number(score);
  if (!numeric || numeric < 8) return 0;
  if (numeric <= 13) return numeric - 8;
  if (numeric === 14) return 7;
  if (numeric >= 15) return 9;
  return 0;
};

export const validateAbilityScores = (scores) =>
  ABILITIES.every((ability) => {
    const value = Number(scores?.[ability]);
    return !Number.isNaN(value) && value >= MIN_ABILITY_SCORE && value <= MAX_ABILITY_SCORE;
  });

