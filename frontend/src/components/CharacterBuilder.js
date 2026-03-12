import React, { useEffect, useMemo, useState } from "react";
import "../App.css";
import "../styles/designSystem.css";
import {
  BACKGROUND_OPTIONS,
  CLASS_OPTIONS,
  RACE_OPTIONS
} from "../data/characterOptions";
import {
  ABILITIES,
  STANDARD_ARRAY,
  MIN_ABILITY_SCORE,
  MAX_ABILITY_SCORE,
  POINT_BUY_TOTAL,
  clampScore,
  calculatePointBuyCost,
  validateAbilityScores
} from "../lib/characterRules";
import { API_BASE } from "../lib/api";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
const DRAFT_KEY = "rq_character_builder_draft_v1";

const emptyStats = () =>
  ABILITIES.reduce((acc, ability) => ({
    ...acc,
    [ability]: ""
  }), {});

const API = API_BASE;

const formatAbility = (ability) => ability.slice(0, 3).toUpperCase();
const getModifier = (score) => (Number(score) ? Math.floor((Number(score) - 10) / 2) : 0);
const formatModifier = (modifier) => (modifier >= 0 ? `+${modifier}` : `${modifier}`);

const getClassPrimaryAbility = (className) => {
  const map = {
    Barbarian: "strength",
    Bard: "charisma",
    Cleric: "wisdom",
    Druid: "wisdom",
    Fighter: "strength",
    Monk: "dexterity",
    Paladin: "charisma",
    Ranger: "wisdom",
    Rogue: "dexterity",
    Sorcerer: "charisma",
    Warlock: "charisma",
    Wizard: "intelligence"
  };

  return map[className] || "intelligence";
};

const getInitialState = () => ({
  name: "",
  race: "",
  className: "",
  background: "",
  portrait: "",
  method: "standard",
  stats: {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8
  }
});

const loadDraft = () => {
  const fallback = getInitialState();

  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;

    const sanitizedStats = ABILITIES.reduce((acc, ability) => {
      acc[ability] = clampScore(parsed?.stats?.[ability]);
      return acc;
    }, {});

    return {
      name: parsed.name || "",
      race: parsed.race || "",
      className: parsed.className || "",
      background: parsed.background || "",
      portrait: parsed.portrait || "",
      method: parsed.method || "standard",
      stats: sanitizedStats
    };
  } catch {
    return fallback;
  }
};

export default function CharacterBuilder({ onCreateCharacter }) {
  const navigate = useNavigate();
  const initialState = useMemo(loadDraft, []);

  const [name, setName] = useState(initialState.name);
  const [race, setRace] = useState(initialState.race);
  const [className, setClassName] = useState(initialState.className);
  const [background, setBackground] = useState(initialState.background);
  const [portrait, setPortrait] = useState(initialState.portrait);
  const [method, setMethod] = useState(initialState.method);
  const [errors, setErrors] = useState({});
  const [stats, setStats] = useState(initialState.stats);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const draft = {
      name,
      race,
      className,
      background,
      portrait,
      method,
      stats
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, race, className, background, portrait, method, stats]);

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

  const derivedStats = useMemo(() => {
    const constitutionMod = getModifier(stats.constitution);
    const dexterityMod = getModifier(stats.dexterity);
    const proficiencyBonus = 2;
    const hpAtLevel1 = Math.max(1, 8 + constitutionMod);
    const armorClassEstimate = 10 + dexterityMod;
    const primaryAbility = getClassPrimaryAbility(className);
    const primaryMod = getModifier(stats[primaryAbility]);
    const spellSaveDC = 8 + proficiencyBonus + primaryMod;
    const spellAttackBonus = proficiencyBonus + primaryMod;

    return {
      proficiencyBonus,
      hpAtLevel1,
      armorClassEstimate,
      primaryAbility,
      spellSaveDC,
      spellAttackBonus
    };
  }, [stats, className]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    const reset = getInitialState();

    setName(reset.name);
    setRace(reset.race);
    setClassName(reset.className);
    setBackground(reset.background);
    setPortrait(reset.portrait);
    setMethod(reset.method);
    setStats(reset.stats);
    setErrors({});
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!validateAbilityScores(stats)) {
      setErrors((prev) => ({ ...prev, stats: `Abilities must be ${MIN_ABILITY_SCORE}-${MAX_ABILITY_SCORE}.` }));
      return;
    }

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

    try {
      setIsSubmitting(true);
      const payload = {
        name: character.name,
        race: character.race,
        character_class: character.class,
        background: character.background,
        level: 1,
        strength: character.abilities.strength,
        dexterity: character.abilities.dexterity,
        constitution: character.abilities.constitution,
        intelligence: character.abilities.intelligence,
        wisdom: character.abilities.wisdom,
        charisma: character.abilities.charisma,
        notes: `Ability generation method: ${character.ability_method}`,
        portrait_url: character.portrait || ""
      };

      const response = await axios.post(`${API}/characters`, payload);
      onCreateCharacter?.(response.data?.character || character);
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Character created successfully.");
      if (response.data?.character_id) {
        navigate(`/characters/${response.data.character_id}`);
      } else {
        navigate('/home');
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create character.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rq-panel" style={{ display: "grid", gap: "20px" }}>
      <h2 className="rq-title">Create Character</h2>

      <div className="rq-card" style={{ fontSize: 13 }}>
        Draft autosave is enabled on this form. Your progress is stored in this browser until you create a character or clear draft.
      </div>

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
                <div className="rq-muted">
                  {formatAbility(ability)} ({formatModifier(getModifier(stats[ability]))})
                </div>
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

        <div className="rq-card" style={{ display: "grid", gap: 8 }}>
          <h3 style={{ marginBottom: 4 }}>Derived Preview (Level 1)</h3>
          <div className="rq-muted">Proficiency Bonus: +{derivedStats.proficiencyBonus}</div>
          <div className="rq-muted">Estimated HP: {derivedStats.hpAtLevel1}</div>
          <div className="rq-muted">Estimated Armor Class: {derivedStats.armorClassEstimate}</div>
          <div className="rq-muted">
            Primary Ability: {formatAbility(derivedStats.primaryAbility)} ({formatModifier(getModifier(stats[derivedStats.primaryAbility]))})
          </div>
          <div className="rq-muted">Spell Save DC (if applicable): {derivedStats.spellSaveDC}</div>
          <div className="rq-muted">Spell Attack Bonus (if applicable): {formatModifier(derivedStats.spellAttackBonus)}</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="rq-button-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Character"}
          </button>
          <button type="button" className="rq-button-secondary" onClick={clearDraft}>
            Clear Draft
          </button>
        </div>
      </form>
    </div>
  );
}
