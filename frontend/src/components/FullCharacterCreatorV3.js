import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Backpack,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Dices,
  Shield,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import {
  BACKGROUNDS,
  CLASSES,
  EDITIONS,
  RACES,
  getProficiencyBonus,
} from "@/data/characterRules5e";
import {
  CANTRIPS_KNOWN,
  SPELLCASTING_CLASSES,
  SPELLS_KNOWN,
  getSpellSlotsForCaster,
  getSpellsForClass,
} from "@/data/spellDatabase";
import {
  buildCreatorEquipmentPayload,
  calculateCreatedCharacterArmorClass,
  EMPTY_CURRENCY,
  EMPTY_EQUIPPED,
  equipmentNameKey,
} from "@/utils/creatorEquipmentPayload";
import "./FullCharacterCreatorV2.css";

const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];
const SHORT = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};
const STANDARD = {
  strength: 15,
  dexterity: 14,
  constitution: 13,
  intelligence: 12,
  wisdom: 10,
  charisma: 8,
};
const FOCUS = {
  strength: {
    strength: 15,
    constitution: 14,
    dexterity: 13,
    wisdom: 12,
    charisma: 10,
    intelligence: 8,
  },
  dexterity: {
    dexterity: 15,
    constitution: 14,
    wisdom: 13,
    intelligence: 12,
    charisma: 10,
    strength: 8,
  },
  constitution: {
    constitution: 15,
    strength: 14,
    dexterity: 13,
    wisdom: 12,
    charisma: 10,
    intelligence: 8,
  },
  intelligence: {
    intelligence: 15,
    constitution: 14,
    dexterity: 13,
    wisdom: 12,
    charisma: 10,
    strength: 8,
  },
  wisdom: {
    wisdom: 15,
    constitution: 14,
    dexterity: 13,
    strength: 12,
    intelligence: 10,
    charisma: 8,
  },
  charisma: {
    charisma: 15,
    constitution: 14,
    dexterity: 13,
    wisdom: 12,
    intelligence: 10,
    strength: 8,
  },
};
const LEVEL_ONE_SUBCLASS = new Set(["Cleric", "Sorcerer", "Warlock"]);
const SPELL_CLASSES = new Set([
  "Bard",
  "Cleric",
  "Druid",
  "Sorcerer",
  "Warlock",
  "Wizard",
]);
const FEATS = [
  "None",
  "Alert",
  "Crafter",
  "Healer",
  "Lucky",
  "Magic Initiate",
  "Savage Attacker",
  "Skilled",
  "Tavern Brawler",
  "Tough",
];
const EXTRA_LANGUAGES = [
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
  "Abyssal",
  "Celestial",
  "Draconic",
  "Deep Speech",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Undercommon",
];
const DRAFT_KEY = "rqk.full_character_creator_v3";
const MATCHMAKER_PRESET_KEY = "rook_matchmaker_preset";
const arr = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const mod = (score = 10) => Math.floor(((Number(score) || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);
const clamp = (value) =>
  Math.max(3, Math.min(20, Number.parseInt(value, 10) || 10));
const isChoiceLang = (value) => /choice|additional/i.test(String(value || ""));
const spellEntry = (spell, level = 0) => ({
  name: spell?.name || String(spell || ""),
  level: Number(spell?.level ?? level),
  school: spell?.school || "",
  description: spell?.description || "",
});

function defaultDraft() {
  return {
    step: 0,
    name: "",
    edition: "2014",
    race: "Human",
    subrace: "",
    characterClass: "Fighter",
    subclass: "",
    background: "Soldier",
    alignment: "Neutral",
    scores: STANDARD,
    floatingAsi: {},
    languages: [],
    skills: [],
    feat: "None",
    cantrips: [],
    spells: [],
    equipmentMode: "recommended",
    customEquipment: "",
    personalityTrait: "",
    ideal: "",
    bond: "",
    flaw: "",
    backstory: "",
  };
}

function loadDraft() {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return stored
      ? {
          ...defaultDraft(),
          ...stored,
          scores: { ...STANDARD, ...(stored.scores || {}) },
        }
      : defaultDraft();
  } catch {
    return defaultDraft();
  }
}

function spellRequirements(characterClass, scores) {
  if (!SPELL_CLASSES.has(characterClass))
    return { cantrips: 0, spells: 0, type: "none" };
  if (characterClass === "Wizard")
    return { cantrips: 3, spells: 6, type: "spellbook" };
  if (characterClass === "Cleric")
    return {
      cantrips: 3,
      spells: Math.max(1, mod(scores.wisdom) + 1),
      type: "prepared",
    };
  if (characterClass === "Druid")
    return {
      cantrips: 2,
      spells: Math.max(1, mod(scores.wisdom) + 1),
      type: "prepared",
    };
  return {
    cantrips: CANTRIPS_KNOWN[characterClass]?.[1] || 0,
    spells: SPELLS_KNOWN[characterClass]?.[1] || 0,
    type: "known",
  };
}

function classSkillOptions(classData) {
  if (!classData) return [];
  if (classData.skillChoices === "any")
    return [
      "Acrobatics",
      "Animal Handling",
      "Arcana",
      "Athletics",
      "Deception",
      "History",
      "Insight",
      "Intimidation",
      "Investigation",
      "Medicine",
      "Nature",
      "Perception",
      "Performance",
      "Persuasion",
      "Religion",
      "Sleight of Hand",
      "Stealth",
      "Survival",
    ];
  return arr(classData.skillChoices);
}

function normaliseCreatorPreset(rawPreset) {
  if (!rawPreset || typeof rawPreset !== "object") return null;
  const preset = {};
  if (typeof rawPreset.name === "string") preset.name = rawPreset.name;
  if (CLASSES[rawPreset.characterClass]) preset.characterClass = rawPreset.characterClass;
  if (RACES[rawPreset.race]) preset.race = rawPreset.race;
  if (BACKGROUNDS[rawPreset.background]) preset.background = rawPreset.background;
  if (ABILITIES.includes(rawPreset.abilityFocus)) preset.scores = FOCUS[rawPreset.abilityFocus];
  if (["recommended", "custom"].includes(rawPreset.equipmentMode)) preset.equipmentMode = rawPreset.equipmentMode;
  if (typeof rawPreset.notes === "string") preset.backstory = rawPreset.notes.slice(0, 500);
  return Object.keys(preset).length ? preset : null;
}

function consumeStoredPreset() {
  try {
    const stored = JSON.parse(localStorage.getItem(MATCHMAKER_PRESET_KEY) || "null");
    if (stored) localStorage.removeItem(MATCHMAKER_PRESET_KEY);
    return stored;
  } catch {
    return null;
  }
}

function normaliseSlots(rawSlots = {}) {
  if (rawSlots?.slots && rawSlots?.level)
    return { [String(rawSlots.level)]: Number(rawSlots.slots) || 0 };
  return Object.fromEntries(
    Object.entries(rawSlots || {}).map(([level, count]) => [
      String(level),
      Number(count) || 0,
    ]),
  );
}

export default function FullCharacterCreatorV3({ editMode = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { characterId } = useParams();
  const [draft, setDraft] = useState(loadDraft);
  const [loading, setLoading] = useState(Boolean(editMode && characterId));
  const [saving, setSaving] = useState(false);
  const [spellSearch, setSpellSearch] = useState("");
  const [existingCharacter, setExistingCharacter] = useState(null);
  const [equipmentTouched, setEquipmentTouched] = useState(false);

  useEffect(() => {
    if (editMode) return;
    const preset = normaliseCreatorPreset(location.state?.creatorPreset || consumeStoredPreset());
    if (!preset) return;
    setDraft((prev) => ({ ...prev, ...preset, step: 0, subclass: "", skills: [], cantrips: [], spells: [] }));
    setEquipmentTouched(Boolean(preset.equipmentMode));
  }, [editMode, location.state]);

  const raceData = RACES[draft.race] || {};
  const classData = CLASSES[draft.characterClass] || {};
  const backgroundData = BACKGROUNDS[draft.background] || {};
  const subraces = Object.keys(raceData.subraces || {});
  const subclassAllowed =
    draft.edition === "2014" && LEVEL_ONE_SUBCLASS.has(draft.characterClass);
  const backgroundSkills = arr(backgroundData.skillProficiencies);
  const classSkills = classSkillOptions(classData).filter(
    (skill) => !backgroundSkills.includes(skill),
  );
  const skillTarget = Number(classData.skillCount || 0);
  const languageBudget =
    arr(raceData.languages).filter(isChoiceLang).length +
    (Number(backgroundData.languages || 0) || 0);
  const baseLanguages = arr(raceData.languages).filter(
    (language) => !isChoiceLang(language),
  );
  const floatingBudget =
    draft.edition === "2014" ? Number(raceData.asi2014?.choice || 0) : 0;
  const floatingSpent = Object.values(draft.floatingAsi || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  const fixedBonus = useMemo(() => {
    const bonus = Object.fromEntries(ABILITIES.map((ability) => [ability, 0]));
    if (editMode) return bonus;
    if (draft.edition === "2024") {
      Object.entries(backgroundData.asi2024 || {}).forEach(
        ([ability, value]) => {
          if (bonus[ability] !== undefined)
            bonus[ability] += Number(value) || 0;
        },
      );
      return bonus;
    }
    const asi = raceData.asi2014 || {};
    if (asi.all)
      ABILITIES.forEach((ability) => {
        bonus[ability] += Number(asi.all) || 0;
      });
    Object.entries(asi).forEach(([ability, value]) => {
      if (ability !== "choice" && bonus[ability] !== undefined)
        bonus[ability] += Number(value) || 0;
    });
    Object.entries(raceData.subraces?.[draft.subrace]?.asi2014 || {}).forEach(
      ([ability, value]) => {
        if (bonus[ability] !== undefined) bonus[ability] += Number(value) || 0;
      },
    );
    Object.entries(draft.floatingAsi || {}).forEach(([ability, value]) => {
      if (bonus[ability] !== undefined) bonus[ability] += Number(value) || 0;
    });
    return bonus;
  }, [
    draft.edition,
    draft.subrace,
    draft.floatingAsi,
    backgroundData,
    raceData,
    editMode,
  ]);
  const finalScores = Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      clamp(draft.scores[ability]) + (fixedBonus[ability] || 0),
    ]),
  );
  const hp = Math.max(
    1,
    (classData.hitDie || 8) + mod(finalScores.constitution),
  );
  const allSkills = Array.from(new Set([...backgroundSkills, ...draft.skills]));
  const spellReq = spellRequirements(draft.characterClass, finalScores);
  const spellLists = getSpellsForClass(draft.characterClass) || {};
  const cantripPool = arr(spellLists.cantrips);
  const levelOnePool = arr(spellLists[1]);
  const visibleCantrips = cantripPool.filter(
    (spell) =>
      !spellSearch ||
      spell.name.toLowerCase().includes(spellSearch.toLowerCase()),
  );
  const visibleSpells = levelOnePool.filter(
    (spell) =>
      !spellSearch ||
      spell.name.toLowerCase().includes(spellSearch.toLowerCase()),
  );
  const hasSpells = spellReq.cantrips > 0 || spellReq.spells > 0;
  const steps = [
    { id: "basics", label: "Basics", icon: Shield },
    { id: "abilities", label: "Abilities", icon: Dices },
    { id: "skills", label: "Skills", icon: Swords },
    { id: "feats", label: "Feats", icon: Sparkles },
    ...(hasSpells ? [{ id: "spells", label: "Spells", icon: Wand2 }] : []),
    { id: "equipment", label: "Equipment", icon: Backpack },
    { id: "review", label: "Review", icon: BookOpen },
  ];
  const step = Math.min(Number(draft.step || 0), steps.length - 1);
  const stepId = steps[step].id;

  useEffect(() => {
    if (!editMode)
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, step }));
  }, [draft, step, editMode]);

  useEffect(() => {
    if (!editMode || !characterId) return;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const { data } = await apiClient.get(`/characters/${characterId}`);
        if (cancelled) return;
        setExistingCharacter(data);
        const raceLanguages = arr(RACES[data.race]?.languages).filter(
          (language) => !isChoiceLang(language),
        );
        setDraft((prev) => ({
          ...prev,
          name: data.name || "",
          edition:
            data.edition ||
            (String(data.ruleset_id || "").includes("2024") ? "2024" : "2014"),
          race: data.race || "Human",
          subrace: data.subrace || "",
          characterClass: data.character_class || "Fighter",
          subclass: data.subclass || "",
          background: data.background || "Soldier",
          alignment: data.alignment || "Neutral",
          scores: Object.fromEntries(
            ABILITIES.map((ability) => [ability, Number(data[ability] || 10)]),
          ),
          skills: arr(data.skill_proficiencies),
          languages: arr(data.languages).filter(
            (language) => !raceLanguages.includes(language),
          ),
          feat: arr(data.feats)[0]?.name || "None",
          cantrips: arr(data.cantrips_known).map(
            (spell) => spell.name || spell,
          ),
          spells: [...arr(data.spells_known), ...arr(data.spells_prepared)].map(
            (spell) => spell.name || spell,
          ),
          equipmentMode: "custom",
          customEquipment: arr(data.starting_equipment).join("\n"),
          personalityTrait: data.personality_traits || data.personality_trait || "",
          ideal: data.ideals || data.ideal || "",
          bond: data.bonds || data.bond || "",
          flaw: data.flaws || data.flaw || "",
          backstory: data.backstory || "",
        }));
      } catch (error) {
        toast.error(
          error?.response?.data?.detail || "Could not load character",
        );
        navigate("/player");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [editMode, characterId, navigate]);

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const updateEquipment = (patch) => {
    setEquipmentTouched(true);
    update(patch);
  };
  const setScore = (ability, value) =>
    update({ scores: { ...draft.scores, [ability]: clamp(value) } });
  const setStep = (index) =>
    update({ step: Math.max(0, Math.min(steps.length - 1, index)) });
  const chosenFeat =
    draft.edition === "2024"
      ? draft.feat !== "None"
        ? draft.feat
        : backgroundData.originFeat2024 || ""
      : draft.feat !== "None"
        ? draft.feat
        : "";

  function validateCurrent() {
    if (stepId === "basics") {
      if (!draft.name.trim()) return "Name your character first.";
      if (!draft.race || !draft.characterClass || !draft.background)
        return "Choose species, class, and background.";
      if (subraces.length && !draft.subrace)
        return "Choose a subrace/species option.";
      if (
        subclassAllowed &&
        arr(classData.subclasses).length &&
        !draft.subclass
      )
        return "Choose your level 1 subclass/patron/domain.";
      if (languageBudget && draft.languages.length !== languageBudget)
        return `Choose ${languageBudget} language${languageBudget === 1 ? "" : "s"}.`;
    }
    if (
      stepId === "abilities" &&
      floatingBudget &&
      floatingSpent !== floatingBudget
    )
      return `Assign ${floatingBudget} floating ability bonus${floatingBudget === 1 ? "" : "es"}.`;
    if (stepId === "skills" && draft.skills.length !== skillTarget)
      return `Choose ${skillTarget} class skill${skillTarget === 1 ? "" : "s"}.`;
    if (stepId === "feats" && draft.edition === "2024" && !chosenFeat)
      return "Confirm an origin feat.";
    if (stepId === "spells") {
      if (draft.cantrips.length !== spellReq.cantrips)
        return `Choose ${spellReq.cantrips} cantrip${spellReq.cantrips === 1 ? "" : "s"}.`;
      if (draft.spells.length !== spellReq.spells)
        return `Choose ${spellReq.spells} level 1 spell${spellReq.spells === 1 ? "" : "s"}.`;
    }
    return "";
  }

  function next() {
    const problem = validateCurrent();
    if (problem) {
      toast.error(problem);
      return;
    }
    setStep(step + 1);
  }

  function toggleList(field, value, max = Infinity) {
    const current = draft[field] || [];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : current.length >= max
        ? current
        : [...current, value];
    update({ [field]: next });
  }

  function toggleFloating(ability) {
    const next = { ...draft.floatingAsi };
    if (next[ability]) delete next[ability];
    else if (floatingSpent < floatingBudget) next[ability] = 1;
    update({ floatingAsi: next });
  }

  function equipmentList() {
    if (draft.equipmentMode === "gold")
      return ["Starting gold instead of equipment — confirm shopping with GM"];
    if (draft.equipmentMode === "custom")
      return draft.customEquipment
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
    return Array.from(
      new Set([
        ...arr(classData.startingEquipment),
        ...arr(backgroundData.equipment),
      ]),
    );
  }

  function spellFields() {
    const classInfo = SPELLCASTING_CLASSES[draft.characterClass];
    if (!classInfo || !hasSpells) return {};
    const ability = classInfo.ability;
    const abilityMod = mod(finalScores[ability]);
    const slots = normaliseSlots(getSpellSlotsForCaster(classInfo, 1));
    const cantrips = draft.cantrips.map((name) =>
      spellEntry(
        cantripPool.find((spell) => spell.name === name) || { name },
        0,
      ),
    );
    const spells = draft.spells.map((name) =>
      spellEntry(
        levelOnePool.find((spell) => spell.name === name) || { name },
        1,
      ),
    );
    return {
      spellcasting_ability: ability,
      spell_save_dc: 8 + getProficiencyBonus(1) + abilityMod,
      spell_attack_bonus: getProficiencyBonus(1) + abilityMod,
      spell_slots: slots,
      spell_slots_remaining: slots,
      cantrips_known: cantrips,
      ...(spellReq.type === "prepared"
        ? { spells_prepared: spells }
        : { spells_known: spells }),
    };
  }

  async function save() {
    if (!draft.name.trim()) {
      toast.error("Name your character before saving.");
      return;
    }
    if (skillTarget && draft.skills.length !== skillTarget) {
      toast.error(
        `Choose ${skillTarget} class skill${skillTarget === 1 ? "" : "s"} before saving.`,
      );
      return;
    }
    if (
      hasSpells &&
      (draft.cantrips.length !== spellReq.cantrips ||
        draft.spells.length !== spellReq.spells)
    ) {
      toast.error("Complete your spell choices before saving.");
      return;
    }

    const equipmentPayload = buildCreatorEquipmentPayload(
      equipmentList(),
      draft.equipmentMode,
    );
    const ac = calculateCreatedCharacterArmorClass(
      { dexterity: finalScores.dexterity },
      equipmentPayload,
    );

    const payload = {
      name: draft.name.trim(),
      race: draft.race,
      subrace: draft.subrace || "",
      character_class: draft.characterClass,
      subclass: subclassAllowed ? draft.subclass || "" : "",
      background: draft.background,
      edition: draft.edition,
      rules_edition: draft.edition,
      ruleset_id: draft.edition === "2024" ? "dnd5e_2024" : "dnd5e_2014",
      alignment: draft.alignment,
      level: 1,
      strength: finalScores.strength,
      dexterity: finalScores.dexterity,
      constitution: finalScores.constitution,
      intelligence: finalScores.intelligence,
      wisdom: finalScores.wisdom,
      charisma: finalScores.charisma,
      max_hit_points: hp,
      current_hit_points: hp,
      armor_class: ac,
      speed: raceData.subraces?.[draft.subrace]?.speed || raceData.speed || 30,
      proficiency_bonus: getProficiencyBonus(1),
      skill_proficiencies: Array.from(
        new Set([...backgroundSkills, ...draft.skills]),
      ),
      saving_throw_proficiencies: arr(classData.savingThrows),
      armor_proficiencies: arr(classData.armorProficiencies),
      weapon_proficiencies: arr(classData.weaponProficiencies),
      tool_proficiencies: arr(backgroundData.toolProficiencies),
      languages: Array.from(new Set([...baseLanguages, ...draft.languages])),
      racial_traits: [
        ...arr(raceData.traits),
        ...arr(raceData.subraces?.[draft.subrace]?.traits),
      ].map((trait) => ({
        name: String(trait).split(" (")[0],
        description: String(trait),
      })),
      class_features: arr(classData.features?.[1])
        .filter((name) => name && name !== "---")
        .map((name) => ({
          name,
          description: `${draft.characterClass} feature gained at level 1.`,
        })),
      feats: chosenFeat
        ? [
            {
              name: chosenFeat,
              source: draft.edition === "2024" ? "origin" : "optional",
            },
          ]
        : [],
      ...equipmentPayload,
      personality_traits: draft.personalityTrait,
      ideals: draft.ideal,
      bonds: draft.bond,
      flaws: draft.flaw,
      backstory: draft.backstory,
      ...spellFields(),
    };

    if (editMode && existingCharacter && !equipmentTouched) {
      [
        "starting_equipment",
        "equipment",
        "inventory",
        "equipped",
        "currency",
        "gold",
        "equipment_choice",
      ].forEach((field) => {
        delete payload[field];
      });
    } else if (editMode && existingCharacter) {
      const mergeByName = (current = [], next = []) => {
        const map = new Map(
          arr(current).map((item) => [
            equipmentNameKey(item?.name || item),
            item,
          ]),
        );
        arr(next).forEach((item) =>
          map.set(equipmentNameKey(item?.name || item), item),
        );
        return Array.from(map.values());
      };
      payload.equipment = mergeByName(
        existingCharacter.equipment,
        payload.equipment,
      );
      payload.inventory = mergeByName(
        existingCharacter.inventory,
        payload.inventory,
      );
      payload.equipped = {
        ...(existingCharacter.equipped || EMPTY_EQUIPPED),
        ...(payload.equipped || {}),
      };
      payload.currency = {
        ...EMPTY_CURRENCY,
        ...(existingCharacter.currency || {}),
        ...(payload.currency || {}),
      };
      payload.gold =
        Number(payload.currency.gold ?? existingCharacter.gold ?? 0) || 0;
    }

    try {
      setSaving(true);
      if (editMode && characterId) {
        await apiClient.patch(`/characters/${characterId}`, payload);
        toast.success("Character updated");
        navigate(`/characters/${characterId}`);
      } else {
        const response = await apiClient.post("/characters", payload);
        localStorage.removeItem(DRAFT_KEY);
        const id = response.data?.character_id || response.data?.character?.id;
        toast.success("Character created");
        navigate(id ? `/characters/${id}` : "/player");
      }
    } catch (error) {
      toast.error(
        error?.formattedDetail ||
          error?.response?.data?.detail ||
          "Could not save character",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <main className="full-creator-page">
        <div className="full-creator-loading">Loading character…</div>
      </main>
    );

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button type="button" onClick={() => navigate("/player")}>
          <ArrowLeft size={17} /> Player
        </button>
        <div>
          <p>Player character builder</p>
          <h1>{editMode ? "Edit Character" : "Full Character Creation"}</h1>
          <span>
            Build a saved sheet with abilities, skills, feats, spells, and
            equipment.
          </span>
        </div>
        <button type="button" onClick={() => navigate("/home")}>
          Dashboard
        </button>
      </header>

      <nav className="full-creator-steps" aria-label="Character creation steps">
        {steps.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={index === step ? "active" : ""}
              onClick={() => setStep(index)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="full-creator-layout">
        <article className="full-creator-panel">
          {stepId === "basics" && (
            <Basics
              draft={draft}
              update={update}
              subraces={subraces}
              subclassAllowed={subclassAllowed}
              classData={classData}
              languageBudget={languageBudget}
            />
          )}
          {stepId === "abilities" && (
            <Abilities
              draft={draft}
              update={update}
              setScore={setScore}
              finalScores={finalScores}
              floatingBudget={floatingBudget}
              floatingSpent={floatingSpent}
              toggleFloating={toggleFloating}
            />
          )}
          {stepId === "skills" && (
            <Skills
              backgroundSkills={backgroundSkills}
              classSkills={classSkills}
              selected={draft.skills}
              target={skillTarget}
              toggle={(skill) => toggleList("skills", skill, skillTarget)}
            />
          )}
          {stepId === "feats" && (
            <Feats
              draft={draft}
              update={update}
              originFeat={backgroundData.originFeat2024}
            />
          )}
          {stepId === "spells" && (
            <Spells
              spellSearch={spellSearch}
              setSpellSearch={setSpellSearch}
              req={spellReq}
              cantrips={visibleCantrips}
              spells={visibleSpells}
              selectedCantrips={draft.cantrips}
              selectedSpells={draft.spells}
              toggleCantrip={(name) =>
                toggleList("cantrips", name, spellReq.cantrips)
              }
              toggleSpell={(name) =>
                toggleList("spells", name, spellReq.spells)
              }
            />
          )}
          {stepId === "equipment" && (
            <Equipment
              draft={draft}
              update={updateEquipment}
              equipment={equipmentList()}
            />
          )}
          {stepId === "review" && (
            <Review
              draft={draft}
              update={update}
              hp={hp}
              ac={ac}
              skills={allSkills}
              feat={chosenFeat}
              spellTotal={draft.cantrips.length + draft.spells.length}
              hasSpells={hasSpells}
            />
          )}
        </article>

        <aside className="full-creator-preview">
          <p>Live sheet preview</p>
          <h2>{draft.name || "Unnamed Character"}</h2>
          <span>
            {draft.race}
            {draft.subrace ? ` (${draft.subrace})` : ""} •{" "}
            {draft.characterClass} • Lv 1
          </span>
          <div className="full-creator-mini-grid">
            <strong>{hp}</strong>
            <span>HP</span>
            <strong>{ac}</strong>
            <span>AC</span>
            <strong>{fmt(mod(finalScores.dexterity))}</strong>
            <span>Init</span>
          </div>
          <div className="full-creator-score-grid">
            {ABILITIES.map((ability) => (
              <div key={ability}>
                <span>{SHORT[ability]}</span>
                <strong>{finalScores[ability]}</strong>
                <em>{fmt(mod(finalScores[ability]))}</em>
              </div>
            ))}
          </div>
          <small>
            Skills: {allSkills.length ? allSkills.join(", ") : "choose skills"}
          </small>
          {hasSpells && (
            <small>
              Spells: {draft.cantrips.length}/{spellReq.cantrips} cantrips,{" "}
              {draft.spells.length}/{spellReq.spells} spells
            </small>
          )}
        </aside>
      </section>

      <footer className="full-creator-footer">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={next}>
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button type="button" onClick={save} disabled={saving}>
            <Check size={16} />{" "}
            {saving
              ? "Saving…"
              : editMode
                ? "Save Changes"
                : "Create Character"}
          </button>
        )}
      </footer>
    </main>
  );
}

function Title({ icon: Icon, title, text }) {
  return (
    <div className="full-creator-section-title">
      <Icon size={21} />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Chip({ active, onClick, children }) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {children}
    </button>
  );
}
function Choice({ title, children }) {
  return (
    <section className="full-creator-choice-block">
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function Basics({
  draft,
  update,
  subraces,
  subclassAllowed,
  classData,
  languageBudget,
}) {
  return (
    <>
      <Title
        icon={Shield}
        title="Core choices"
        text="Name, rules edition, species, class, background, and level-one subclass choices."
      />
      <div className="full-creator-form-grid">
        <label>
          <span>Name</span>
          <input
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label>
          <span>Edition</span>
          <select
            value={draft.edition}
            onChange={(e) => update({ edition: e.target.value })}
          >
            {Object.entries(EDITIONS).map(([id, item]) => (
              <option key={id} value={id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Species / Race</span>
          <select
            value={draft.race}
            onChange={(e) =>
              update({
                race: e.target.value,
                subrace: "",
                floatingAsi: {},
                languages: [],
              })
            }
          >
            {Object.keys(RACES).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        {subraces.length > 0 && (
          <label>
            <span>Subrace</span>
            <select
              value={draft.subrace}
              onChange={(e) => update({ subrace: e.target.value })}
            >
              <option value="">Choose…</option>
              {subraces.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Class</span>
          <select
            value={draft.characterClass}
            onChange={(e) =>
              update({
                characterClass: e.target.value,
                subclass: "",
                skills: [],
                cantrips: [],
                spells: [],
              })
            }
          >
            {Object.keys(CLASSES).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        {subclassAllowed && (
          <label>
            <span>Level 1 subclass</span>
            <select
              value={draft.subclass}
              onChange={(e) => update({ subclass: e.target.value })}
            >
              <option value="">Choose…</option>
              {arr(classData.subclasses).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Background</span>
          <select
            value={draft.background}
            onChange={(e) =>
              update({
                background: e.target.value,
                languages: [],
                feat: "None",
              })
            }
          >
            {Object.keys(BACKGROUNDS).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Alignment</span>
          <select
            value={draft.alignment}
            onChange={(e) => update({ alignment: e.target.value })}
          >
            {[
              "Lawful Good",
              "Neutral Good",
              "Chaotic Good",
              "Lawful Neutral",
              "Neutral",
              "Chaotic Neutral",
              "Lawful Evil",
              "Neutral Evil",
              "Chaotic Evil",
            ].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      {languageBudget > 0 && (
        <Choice
          title={`Language choices ${draft.languages.length}/${languageBudget}`}
        >
          {EXTRA_LANGUAGES.map((language) => (
            <Chip
              key={language}
              active={draft.languages.includes(language)}
              onClick={() =>
                update({
                  languages: draft.languages.includes(language)
                    ? draft.languages.filter((item) => item !== language)
                    : draft.languages.length >= languageBudget
                      ? draft.languages
                      : [...draft.languages, language],
                })
              }
            >
              {language}
            </Chip>
          ))}
        </Choice>
      )}
    </>
  );
}

function Abilities({
  draft,
  update,
  setScore,
  finalScores,
  floatingBudget,
  floatingSpent,
  toggleFloating,
}) {
  return (
    <>
      <Title
        icon={Dices}
        title="Ability scores"
        text="Use a quick array, then adjust each score. Final scores include bonuses."
      />
      <div className="full-creator-chip-row">
        <button type="button" onClick={() => update({ scores: STANDARD })}>
          Standard array
        </button>
        {ABILITIES.map((ability) => (
          <button
            key={ability}
            type="button"
            onClick={() => update({ scores: FOCUS[ability] })}
          >
            {SHORT[ability]} focus
          </button>
        ))}
      </div>
      <div className="full-creator-score-editor">
        {ABILITIES.map((ability) => (
          <label key={ability}>
            <span>{SHORT[ability]}</span>
            <input
              type="number"
              min="3"
              max="20"
              value={draft.scores[ability]}
              onChange={(e) => setScore(ability, e.target.value)}
            />
            <strong>{finalScores[ability]}</strong>
            <em>{fmt(mod(finalScores[ability]))}</em>
          </label>
        ))}
      </div>
      {floatingBudget > 0 && (
        <Choice
          title={`Floating species bonus ${floatingSpent}/${floatingBudget}`}
        >
          {ABILITIES.map((ability) => (
            <Chip
              key={ability}
              active={Boolean(draft.floatingAsi[ability])}
              onClick={() => toggleFloating(ability)}
            >
              {SHORT[ability]} +1
            </Chip>
          ))}
        </Choice>
      )}
    </>
  );
}

function Skills({ backgroundSkills, classSkills, selected, target, toggle }) {
  return (
    <>
      <Title
        icon={Swords}
        title="Skill proficiencies"
        text="Background skills are automatic. Choose class skills here."
      />
      <div className="full-creator-auto-box">
        <strong>Background skills</strong>
        <span>
          {backgroundSkills.length
            ? backgroundSkills.join(", ")
            : "None listed"}
        </span>
      </div>
      <Choice title={`Class skills ${selected.length}/${target}`}>
        {classSkills.map((skill) => (
          <Chip
            key={skill}
            active={selected.includes(skill)}
            onClick={() => toggle(skill)}
          >
            {skill}
          </Chip>
        ))}
      </Choice>
    </>
  );
}

function Feats({ draft, update, originFeat }) {
  return (
    <>
      <Title
        icon={Sparkles}
        title="Feats"
        text="Confirm the 2024 origin feat or add an optional feat if your table uses one."
      />
      {draft.edition === "2024" && (
        <div className="full-creator-auto-box">
          <strong>Suggested origin feat</strong>
          <span>{originFeat || "Choose one below"}</span>
        </div>
      )}
      <label className="full-creator-wide-label">
        <span>
          {draft.edition === "2024" ? "Origin feat override" : "Optional feat"}
        </span>
        <select
          value={draft.feat}
          onChange={(e) => update({ feat: e.target.value })}
        >
          {FEATS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
    </>
  );
}

function Spells({
  spellSearch,
  setSpellSearch,
  req,
  cantrips,
  spells,
  selectedCantrips,
  selectedSpells,
  toggleCantrip,
  toggleSpell,
}) {
  return (
    <>
      <Title
        icon={Wand2}
        title="Spell choices"
        text="Choose exactly what the sheet should save."
      />
      <input
        className="full-creator-search"
        value={spellSearch}
        onChange={(e) => setSpellSearch(e.target.value)}
        placeholder="Search spell names…"
      />
      {req.cantrips > 0 && (
        <Choice title={`Cantrips ${selectedCantrips.length}/${req.cantrips}`}>
          {cantrips.map((spell) => (
            <SpellButton
              key={spell.name}
              spell={spell}
              active={selectedCantrips.includes(spell.name)}
              onClick={() => toggleCantrip(spell.name)}
            />
          ))}
        </Choice>
      )}
      {req.spells > 0 && (
        <Choice title={`Level 1 spells ${selectedSpells.length}/${req.spells}`}>
          {spells.map((spell) => (
            <SpellButton
              key={spell.name}
              spell={spell}
              active={selectedSpells.includes(spell.name)}
              onClick={() => toggleSpell(spell.name)}
            />
          ))}
        </Choice>
      )}
    </>
  );
}

function SpellButton({ spell, active, onClick }) {
  return (
    <button
      type="button"
      className={`full-creator-spell-chip ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <strong>{spell.name}</strong>
      <span>{spell.school || "Spell"}</span>
      <em>{spell.description || ""}</em>
    </button>
  );
}

function Equipment({ draft, update, equipment }) {
  return (
    <>
      <Title
        icon={Backpack}
        title="Equipment choice"
        text="Pick recommended gear, starting gold, or type a custom kit."
      />
      <div className="full-creator-equipment-modes">
        {["recommended", "gold", "custom"].map((mode) => (
          <button
            key={mode}
            type="button"
            className={draft.equipmentMode === mode ? "active" : ""}
            onClick={() => update({ equipmentMode: mode })}
          >
            {mode === "recommended"
              ? "Recommended gear"
              : mode === "gold"
                ? "Starting gold"
                : "Custom kit"}
          </button>
        ))}
      </div>
      {draft.equipmentMode === "custom" && (
        <textarea
          value={draft.customEquipment}
          onChange={(e) => update({ customEquipment: e.target.value })}
          placeholder={"Longsword\nShield\nExplorer pack"}
        />
      )}
      <div className="full-creator-equipment-list">
        {equipment.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </>
  );
}

function Review({
  draft,
  update,
  hp,
  ac,
  skills,
  feat,
  spellTotal,
  hasSpells,
}) {
  return (
    <>
      <Title
        icon={BookOpen}
        title="Review and save"
        text="Add roleplay notes, check the preview, then create the saved character."
      />
      <div className="full-creator-form-grid">
        <label>
          <span>Personality trait</span>
          <input
            value={draft.personalityTrait}
            onChange={(e) => update({ personalityTrait: e.target.value })}
          />
        </label>
        <label>
          <span>Ideal</span>
          <input
            value={draft.ideal}
            onChange={(e) => update({ ideal: e.target.value })}
          />
        </label>
        <label>
          <span>Bond</span>
          <input
            value={draft.bond}
            onChange={(e) => update({ bond: e.target.value })}
          />
        </label>
        <label>
          <span>Flaw</span>
          <input
            value={draft.flaw}
            onChange={(e) => update({ flaw: e.target.value })}
          />
        </label>
      </div>
      <label className="full-creator-wide-label">
        <span>Backstory notes</span>
        <textarea
          value={draft.backstory}
          onChange={(e) => update({ backstory: e.target.value })}
        />
      </label>
      <div className="full-creator-review-grid">
        <div>
          <span>HP</span>
          <strong>{hp}</strong>
        </div>
        <div>
          <span>AC</span>
          <strong>{ac}</strong>
        </div>
        <div>
          <span>Skills</span>
          <strong>{skills.length}</strong>
        </div>
        <div>
          <span>Feat</span>
          <strong>{feat || "None"}</strong>
        </div>
        <div>
          <span>Equipment</span>
          <strong>{draft.equipmentMode}</strong>
        </div>
        <div>
          <span>Spells</span>
          <strong>{hasSpells ? spellTotal : "None"}</strong>
        </div>
      </div>
    </>
  );
}
