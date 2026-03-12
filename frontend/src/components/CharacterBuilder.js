import React, { useMemo, useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma"
];

const MIN_ABILITY_SCORE = 3;
const MAX_ABILITY_SCORE = 20;
const POINT_BUY_TOTAL = 27;

const RACE_OPTIONS = [
  "Human",
  "Elf",
  "Dwarf",
  "Halfling",
  "Gnome",
  "Half-Orc",
  "Half-Elf",
  "Tiefling"
];

const CLASS_OPTIONS = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard"
];

const BACKGROUND_OPTIONS = [
  "Acolyte",
  "Criminal",
  "Entertainer",
  "Folk Hero",
  "Guild Artisan",
  "Hermit",
  "Noble",
  "Outlander",
  "Sage",
  "Sailor",
  "Soldier",
  "Urchin"
];

const emptyStats = () =>
  ABILITIES.reduce((acc, ability) => ({
    ...acc,
    [ability]: ""
  }), {});

const clampScore = (value) => {
  if (value === "") return "";
  const asNumber = Number(value);
  if (Number.isNaN(asNumber)) return "";
  return Math.max(MIN_ABILITY_SCORE, Math.min(MAX_ABILITY_SCORE, asNumber));
};

const calculatePointBuyCost = (score) => {
  const numeric = Number(score);
  if (!numeric || numeric < 8) return 0;
  if (numeric <= 13) return numeric - 8;
  if (numeric === 14) return 7;
  if (numeric >= 15) return 9;
  return 0;
};

const formatAbility = (ability) => ability.slice(0, 3).toUpperCase();

export default function CharacterBuilder({ onCreateCharacter }) {
  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [className, setClassName] = useState("");
  const [background, setBackground] = useState("");
  const [portrait, setPortrait] = useState("");
  const [method, setMethod] = useState("standard");
  const [errors, setErrors] = useState({});

  const [stats, setStats] = useState(() => emptyStats());

  const pointBuySpent = useMemo(
    () => ABILITIES.reduce((sum, ability) => sum + calculatePointBuyCost(stats[ability]), 0),
    [stats]
  );

  const pointBuyRemaining = POINT_BUY_TOTAL - pointBuySpent;

  const standardArrayValidation = useMemo(() => {
    if (method !== "standard") return { valid: true, message: "" };

    const entered = ABILITIES.map((ability) => Number(stats[ability])).filter(Boolean);
    if (entered.length !== ABILITIES.length) {
      return { valid: false, message: "Fill all ability scores." };
    }

    const expected = [...STANDARD_ARRAY].sort((a, b) => a - b);
    const actual = [...entered].sort((a, b) => a - b);
    const valid = expected.every((value, index) => value === actual[index]);

    return {
      valid,
      message: valid ? "" : "Standard Array mode must use 15,14,13,12,10,8 exactly once each."
    };
  }, [method, stats]);

  const setMethodAndStats = (nextMethod) => {
    setMethod(nextMethod);
    setErrors({});

    if (nextMethod === "standard") {
      const assigned = {};
      ABILITIES.forEach((ability, index) => {
        assigned[ability] = STANDARD_ARRAY[index];
      });
      setStats(assigned);
      return;
    }

    if (nextMethod === "point-buy") {
      const baseline = {};
      ABILITIES.forEach((ability) => {
        baseline[ability] = 8;
      });
      setStats(baseline);
      return;
    }

    setStats(emptyStats());
  };

  const rollStats = () => {
    const roll = () =>
      Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * 6) + 1)
        .sort((a, b) => a - b)
        .slice(1)
        .reduce((sum, die) => sum + die, 0);

    const rolled = {};
    ABILITIES.forEach((ability) => {
      rolled[ability] = roll();
    });

    setMethod("rolled");
    setErrors({});
    setStats(rolled);
  };

  const updateStat = (ability, value) => {
    const clampedValue = clampScore(value);

    setStats((prev) => {
      const next = {
        ...prev,
        [ability]: clampedValue
      };

      if (method === "point-buy") {
        const spent = ABILITIES.reduce((sum, key) => sum + calculatePointBuyCost(next[key]), 0);
        if (spent > POINT_BUY_TOTAL) {
          return prev;
        }
      }

      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!name.trim()) nextErrors.name = "Character name is required.";
    if (!race) nextErrors.race = "Pick a race/species from the list.";
    if (!RACE_OPTIONS.includes(race)) nextErrors.race = "Select a valid race/species option.";

    if (!className) nextErrors.className = "Pick a class from the list.";
    if (!CLASS_OPTIONS.includes(className)) nextErrors.className = "Select a valid class option.";

    if (!background) nextErrors.background = "Pick a background from the list.";
    if (!BACKGROUND_OPTIONS.includes(background)) {
      nextErrors.background = "Select a valid background option.";
    }

    ABILITIES.forEach((ability) => {
      const value = Number(stats[ability]);
      if (!stats[ability] && stats[ability] !== 0) {
        nextErrors[ability] = "Required";
        return;
      }
      if (Number.isNaN(value) || value < MIN_ABILITY_SCORE || value > MAX_ABILITY_SCORE) {
        nextErrors[ability] = `Must be ${MIN_ABILITY_SCORE}-${MAX_ABILITY_SCORE}`;
      }
    });

    if (method === "point-buy" && pointBuyRemaining !== 0) {
      nextErrors.stats = "Point allocation must use exactly 27 points.";
    }

    if (!standardArrayValidation.valid) {
      nextErrors.stats = standardArrayValidation.message;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const normalizedStats = ABILITIES.reduce((acc, ability) => ({
      ...acc,
      [ability]: Number(stats[ability])
    }), {});

    const character = {
      name: name.trim(),
      race,
      class: className,
      background,
      portrait,
      ability_method: method,
      abilities: normalizedStats,
      level: 1
    };

    onCreateCharacter?.(character);
  };

  return (
    <div className="rq-panel" style={{ display: "grid", gap: "20px" }}>
      <h2 className="rq-title">Create Character</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <div>
          <input
            placeholder="Character Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", width: "100%" }}
          />
          {errors.name && <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.name}</div>}
        </div>

        <div>
          <select
            value={race}
            onChange={(e) => setRace(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", width: "100%" }}
          >
            <option value="">Select Race / Species</option>
            {RACE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.race && <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.race}</div>}
        </div>

        <div>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", width: "100%" }}
          >
            <option value="">Select Class</option>
            {CLASS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.className && <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.className}</div>}
        </div>

        <div>
          <select
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            style={{ padding: "10px", borderRadius: "8px", width: "100%" }}
          >
            <option value="">Select Background</option>
            {BACKGROUND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.background && <div style={{ color: "#ef4444", marginTop: 6 }}>{errors.background}</div>}
        </div>

        <input
          placeholder="Portrait URL"
          value={portrait}
          onChange={(e) => setPortrait(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px" }}
        />

        {portrait && (
          <img
            src={portrait}
            alt="portrait preview"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "cover",
              borderRadius: "10px",
              border: "2px solid var(--rq-gold)"
            }}
          />
        )}

        <div className="rq-card">
          <h3>Ability Scores</h3>

          <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <button type="button" className="rq-button-secondary" onClick={() => setMethodAndStats("standard")}>
              Standard Array
            </button>

            <button type="button" className="rq-button-secondary" onClick={() => setMethodAndStats("point-buy")}>
              Point Allocation
            </button>

            <button type="button" className="rq-button-secondary" onClick={rollStats}>
              Roll Stats
            </button>
          </div>

          <div className="rq-muted" style={{ marginBottom: 10 }}>
            {method === "standard" && "Using fixed values: 15, 14, 13, 12, 10, 8."}
            {method === "point-buy" && `Point Allocation: ${pointBuyRemaining} points remaining.`}
            {method === "rolled" && "Rolled values may be edited (3-20 bounds)."}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "12px"
            }}
          >
            {ABILITIES.map((ability) => (
              <div key={ability}>
                <div className="rq-muted">{formatAbility(ability)}</div>
                <input
                  type="number"
                  min={MIN_ABILITY_SCORE}
                  max={MAX_ABILITY_SCORE}
                  value={stats[ability]}
                  onChange={(e) => updateStat(ability, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: errors[ability] ? "1px solid #ef4444" : "1px solid #4b5563"
                  }}
                />
                {errors[ability] && (
                  <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{errors[ability]}</div>
                )}
              </div>
            ))}
          </div>

          {errors.stats && (
            <div style={{ color: "#ef4444", marginTop: 12, fontWeight: 600 }}>{errors.stats}</div>
          )}
        </div>

        <button className="rq-button-primary" type="submit">
          Create Character
        </button>
      </form>
    </div>
  );
}
