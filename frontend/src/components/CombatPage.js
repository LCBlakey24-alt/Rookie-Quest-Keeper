import React, { useMemo, useState } from "react";
import "../App.css";
import "../styles/designSystem.css";

const DEFAULT_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious"
];

const startingCombatants = [
  {
    id: "c1",
    name: "Javen Krow",
    type: "Player",
    initiative: 18,
    hp: 12,
    maxHp: 12,
    ac: 14,
    conditions: []
  },
  {
    id: "c2",
    name: "Thalia Emberheart",
    type: "Player",
    initiative: 15,
    hp: 22,
    maxHp: 22,
    ac: 15,
    conditions: []
  },
  {
    id: "c3",
    name: "Goblin Scout",
    type: "Enemy",
    initiative: 14,
    hp: 7,
    maxHp: 7,
    ac: 13,
    conditions: []
  },
  {
    id: "c4",
    name: "Goblin Boss",
    type: "Enemy",
    initiative: 11,
    hp: 21,
    maxHp: 21,
    ac: 15,
    conditions: []
  }
];

function CombatPage() {
  const [combatants, setCombatants] = useState(startingCombatants);
  const [round, setRound] = useState(1);
  const [turnIndex, setTurnIndex] = useState(0);
  const [combatStarted, setCombatStarted] = useState(true);

  const sortedCombatants = useMemo(() => {
    return [...combatants].sort((a, b) => b.initiative - a.initiative);
  }, [combatants]);

  const currentCombatant = sortedCombatants[turnIndex] || null;
  const nextCombatant =
    sortedCombatants.length > 0
      ? sortedCombatants[(turnIndex + 1) % sortedCombatants.length]
      : null;

  const updateCombatant = (id, updater) => {
    setCombatants((prev) =>
      prev.map((combatant) =>
        combatant.id === id ? { ...combatant, ...updater(combatant) } : combatant
      )
    );
  };

  const adjustHp = (id, amount) => {
    updateCombatant(id, (combatant) => {
      const nextHp = Math.max(
        0,
        Math.min(combatant.maxHp, combatant.hp + amount)
      );
      return { hp: nextHp };
    });
  };

  const toggleCondition = (id, condition) => {
    updateCombatant(id, (combatant) => {
      const hasCondition = combatant.conditions.includes(condition);
      return {
        conditions: hasCondition
          ? combatant.conditions.filter((c) => c !== condition)
          : [...combatant.conditions, condition]
      };
    });
  };

  const nextTurn = () => {
    if (sortedCombatants.length === 0) return;

    if (turnIndex >= sortedCombatants.length - 1) {
      setTurnIndex(0);
      setRound((prev) => prev + 1);
    } else {
      setTurnIndex((prev) => prev + 1);
    }
  };

  const previousTurn = () => {
    if (sortedCombatants.length === 0) return;

    if (turnIndex === 0
