import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { toast } from "sonner";
import {
  User, Sword, Shield, Sparkles, Dices, ChevronLeft, ChevronRight,
  Save, RotateCcw, BookOpen, Info, Check, Heart, Zap, Wand2,
  Scroll, Award, Languages, Backpack, Eye
} from "lucide-react";
import {
  ABILITIES,
  MIN_ABILITY_SCORE,
  MAX_ABILITY_SCORE,
  POINT_BUY_TOTAL,
  clampScore,
  calculatePointBuyCost,
  validateAbilityScores
} from "../lib/characterRules";
import { RACES, CLASSES, BACKGROUNDS, EDITIONS } from "../data/characterRules5e";
import { getFeatsByEdition } from "../data/levelUpData";
import { SOURCE_CONTENT_LABELS, SOURCE_LEGAL_NOTICE, getSourcesByContent } from "../data/dndSources5e";
import AbilitiesStep from "./builder/AbilitiesStepTap";
import PortraitGenerator from "./builder/PortraitGenerator";

const DRAFT_KEY = "rq_character_builder_draft_v2";

// Theme
const theme = {
  bg: { primary: '#1F1F23', surface: '#27272B', elevated: '#323235' },
  sunset: { purple: '#EF4444', pink: '#EF4444', gold: '#EF4444' },
  text: { primary: '#FFFFFF', secondary: '#D1D5DB', muted: '#9CA3AF' },
  border: 'rgba(239, 68, 68, 0.35)',
  borderActive: '#EF4444',
  accent: { primary: '#EF4444', soft: 'rgba(239, 68, 68, 0.12)', line: 'rgba(239, 68, 68, 0.28)' },
  success: '#10B981'
};

// All 18 skills mapped to their governing ability
const ALL_SKILLS = {
  Acrobatics: 'dexterity', 'Animal Handling': 'wisdom', Arcana: 'intelligence',
  Athletics: 'strength', Deception: 'charisma', History: 'intelligence',
  Insight: 'wisdom', Intimidation: 'charisma', Investigation: 'intelligence',
  Medicine: 'wisdom', Nature: 'intelligence', Perception: 'wisdom',
  Performance: 'charisma', Persuasion: 'charisma', Religion: 'intelligence',
  'Sleight of Hand': 'dexterity', Stealth: 'dexterity', Survival: 'wisdom'
};

const formatAbility = (a) => a.slice(0, 3).toUpperCase();
const formatModifier = (m) => (m >= 0 ? `+${m}` : `${m}`);

// Steps definition (spells/equipment steps are conditional, added dynamically)
const BASE_STEPS = [
  { id: 'edition', label: 'Edition', icon: BookOpen },
  { id: 'race', label: 'Race', icon: User },
  { id: 'class', label: 'Class', icon: Sword },
  { id: 'background', label: 'Background', icon: Scroll },
  { id: 'abilities', label: 'Abilities', icon: Dices },
  { id: 'skills', label: 'Skills', icon: Award },
  { id: 'spells', label: 'Spells', icon: Wand2, needs: ({ className }) => SPELL_CREATION.has(className) },
  { id: 'equipment', label: 'Gear', icon: Backpack, needs: () => true },
  { id: 'review', label: 'Review', icon: Check }
];

// Classes that pick spells at Level 1 creation
const SPELL_CREATION = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']);

// SRD 5.1 starting spell counts (L1 creation)
const SPELL_COUNTS_L1 = {
  Bard:     { cantrips: 2, spells: 4, type: 'known' },
  Cleric:   { cantrips: 3, spells: 0, type: 'prepared' }, // Cleric prepares any L1 clerc spell, count = WIS mod + level
  Druid:    { cantrips: 2, spells: 0, type: 'prepared' },
  Sorcerer: { cantrips: 4, spells: 2, type: 'known' },
  Warlock:  { cantrips: 2, spells: 2, type: 'known' },
  Wizard:   { cantrips: 3, spells: 6, type: 'spellbook' }, // 6 spells in spellbook at L1
};

// Classes that get Fighting Style at L1 or L2
const FIGHTING_STYLE_CLASSES = {
  Fighter: { level: 1, styles: ['Archery', 'Defense', 'Dueling', 'Great Weapon Fighting', 'Protection', 'Two-Weapon Fighting'] },
  Paladin: { level: 2, styles: ['Defense', 'Dueling', 'Great Weapon Fighting', 'Protection'] },
  Ranger:  { level: 2, styles: ['Archery', 'Defense', 'Dueling', 'Two-Weapon Fighting'] }
};

const getInitialState = () => ({
  step: 0,
  name: "",
  race: "",
  subrace: "",
  className: "",
  subclass: "",
  background: "",
  portrait: "",
  alignment: "Neutral",
  method: "standard",
  edition: "2014",
  stats: { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 },
  selectedSkills: [],
  floatingAsi: {},
  chosenLanguages: [],
  versatilitySkills: [],      // Half-Elf: 2 extra skills
  fightingStyle: '',
  selectedCantrips: [],
  selectedSpells: [],
  equipmentChoice: 'A'
});

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return getInitialState();
    const sanitizedStats = ABILITIES.reduce((acc, a) => {
      acc[a] = clampScore(parsed?.stats?.[a]) || 10;
      return acc;
    }, {});
    return { ...getInitialState(), ...parsed, stats: sanitizedStats };
  } catch {
    return getInitialState();
  }
};

const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'];

// Standard SRD 5e language menu for "one of your choice" options
const EXTRA_LANGUAGE_OPTIONS = [
  'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
  'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'
];

// Classes that choose subclass at L1 in 2014 rules
const SUBCLASS_AT_L1_2014 = new Set(['Cleric', 'Sorcerer', 'Warlock']);

// Count of "floating" extra languages a race grants ("One of choice" strings)
const countLanguageChoices = (raceData) => {
  if (!raceData?.languages) return 0;
  return raceData.languages.filter(l => String(l).toLowerCase().includes('choice') || String(l).toLowerCase().includes('additional')).length;
};

export default function CharacterBuilder({ onCreateCharacter, editMode = false }) {
  const navigate = useNavigate();
  const { characterId } = useParams();
  const initialState = useMemo(loadDraft, []);

  const [step, setStep] = useState(editMode ? 0 : (initialState.step || 0));
  const [isEditMode] = useState(editMode);
  const [loadingCharacter, setLoadingCharacter] = useState(editMode);
  const [name, setName] = useState(initialState.name);
  const [race, setRace] = useState(initialState.race);
  const [subrace, setSubrace] = useState(initialState.subrace);
  const [className, setClassName] = useState(initialState.className);
  const [subclass, setSubclass] = useState(initialState.subclass);
  const [background, setBackground] = useState(initialState.background);
  const [portrait, setPortrait] = useState(initialState.portrait);
  const [alignment, setAlignment] = useState(initialState.alignment || 'Neutral');
  const [method, setMethod] = useState(initialState.method);
  const [edition, setEdition] = useState(initialState.edition || "2014");
  const [stats, setStats] = useState(initialState.stats);
  const [selectedSkills, setSelectedSkills] = useState(initialState.selectedSkills || []);
  const [floatingAsi, setFloatingAsi] = useState(initialState.floatingAsi || {}); // { strength: 1, dexterity: 1 }
  const [chosenLanguages, setChosenLanguages] = useState(initialState.chosenLanguages || []); // ['Draconic', ...]
  const [versatilitySkills, setVersatilitySkills] = useState(initialState.versatilitySkills || []); // Half-Elf
  const [fightingStyle, setFightingStyle] = useState(initialState.fightingStyle || '');
  const [selectedCantrips, setSelectedCantrips] = useState(initialState.selectedCantrips || []);
  const [selectedSpells, setSelectedSpells] = useState(initialState.selectedSpells || []);
  const [spellSearch, setSpellSearch] = useState('');
  const [spellSchoolFilter, setSpellSchoolFilter] = useState('all');
  const [equipmentChoice, setEquipmentChoice] = useState(initialState.equipmentChoice || 'A');
  const [originFeat, setOriginFeat] = useState(initialState.originFeat || ''); // 2024 only
  const [srdSpells, setSrdSpells] = useState([]);
  const [spellsLoading, setSpellsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Personality prompts — added to review step for richer AI/GM context
  const [personalityTrait, setPersonalityTrait] = useState(initialState.personalityTrait || '');
  const [ideal, setIdeal] = useState(initialState.ideal || '');
  const [bond, setBond] = useState(initialState.bond || '');
  const [flaw, setFlaw] = useState(initialState.flaw || '');
  const [backstory, setBackstory] = useState(initialState.backstory || '');

  // Load existing character data in edit mode
  useEffect(() => {
    if (editMode && characterId) loadCharacterForEdit();
  }, [editMode, characterId]);

  const loadCharacterForEdit = async () => {
    try {
      setLoadingCharacter(true);
      const { data: char } = await apiClient.get(`/characters/${characterId}`);
      setName(char.name || "");
      setRace(char.race || "");
      setSubrace(char.subrace || "");
      setClassName(char.character_class || "");
      setSubclass(char.subclass || "");
      setBackground(char.background || "");
      setPortrait(char.portrait_url || "");
      setAlignment(char.alignment || 'Neutral');
      // Personality fields
      setPersonalityTrait(char.personality_trait || '');
      setIdeal(char.ideal || '');
      setBond(char.bond || '');
      setFlaw(char.flaw || '');
      setBackstory(char.backstory || '');
      setEdition(char.edition || "2014");
      setStats({
        strength: char.strength || 10, dexterity: char.dexterity || 10,
        constitution: char.constitution || 10, intelligence: char.intelligence || 10,
        wisdom: char.wisdom || 10, charisma: char.charisma || 10
      });
      // When loading for edit, exclude background skills from selectedSkills (show only class-selected)
      const bgSkills = backgroundData?.skillProficiencies || [];
      const editedSkills = (char.skill_proficiencies || []).filter(s => !bgSkills.includes(s));
      setSelectedSkills(editedSkills);
      setMethod("manual");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load character for editing");
      navigate("/home");
    } finally {
      setLoadingCharacter(false);
    }
  };

  // ── Homebrew integration ────────────────────────────────────────────────
  // Fetches the user's homebrew once on mount and merges races / classes /
  // backgrounds into the existing static dictionaries. Homebrew entries are
  // prefixed with [HOMEBREW] in their description so players can spot them.
  const [homebrew, setHomebrew] = useState({ race: [], class: [], background: [] });
  useEffect(() => {
    let cancelled = false;
    apiClient.get(`/homebrew`).then(res => {
      if (cancelled) return;
      const hb = res.data?.homebrew || {};
      setHomebrew({
        race: hb.race || [],
        class: hb.class || [],
        background: hb.background || []
      });
    }).catch(() => { /* silent — homebrew is optional */ });
    return () => { cancelled = true; };
  }, []);

  // Inject homebrew entries into the static dictionaries (read-only merge).
  // Homebrew entries are converted to the same shape the wizard expects.
  const mergedRaces = useMemo(() => {
    const out = { ...RACES };
    (homebrew.race || []).forEach(item => {
      if (!item?.name) return;
      const ab = item.ability_bonuses || {};
      out[item.name] = {
        name: item.name,
        description: `[HOMEBREW] ${item.description || ''}`,
        speed: Number(item.speed) || 30,
        size: item.size || 'Medium',
        asi2014: ab,
        asi2024: null,
        traits: (item.traits || []).map(t => typeof t === 'string' ? t : (t.name || '')).filter(Boolean),
        languages: item.languages || ['Common'],
        homebrew: true
      };
    });
    return out;
  }, [homebrew.race]);

  const mergedClasses = useMemo(() => {
    const out = { ...CLASSES };
    (homebrew.class || []).forEach(item => {
      if (!item?.name) return;
      const dieMatch = String(item.hit_die || '').match(/(\d+)/);
      out[item.name] = {
        name: item.name,
        description: `[HOMEBREW] ${item.description || ''}`,
        hitDie: dieMatch ? parseInt(dieMatch[1], 10) : 8,
        primaryAbility: (item.primary_ability || 'strength').toLowerCase(),
        savingThrows: (item.saving_throw_proficiencies || []).map(s => s.toLowerCase()),
        armorProf: item.armor_proficiencies || [],
        weaponProf: item.weapon_proficiencies || [],
        skillsToChoose: 2,
        skills: [],
        features: item.features || [],
        homebrew: true
      };
    });
    return out;
  }, [homebrew.class]);

  const mergedBackgrounds = useMemo(() => {
    const out = { ...BACKGROUNDS };
    (homebrew.background || []).forEach(item => {
      if (!item?.name) return;
      out[item.name] = {
        name: item.name,
        description: `[HOMEBREW] ${item.description || ''}`,
        skills: item.skill_proficiencies || [],
        tools: item.tool_proficiencies || [],
        languages: Number(item.languages) || 0,
        equipment: item.equipment || [],
        feature: item.feature_name || '',
        featureDesc: item.feature_description || '',
        homebrew: true
      };
    });
    return out;
  }, [homebrew.background]);
  // ────────────────────────────────────────────────────────────────────────

  const raceData = mergedRaces[race] || RACES[race] || null;
  const availableSubraces = raceData?.subraces ? Object.keys(raceData.subraces) : [];
  const classData = mergedClasses[className] || CLASSES[className] || null;
  const availableSubclasses = classData?.subclasses || [];
  const backgroundData = mergedBackgrounds[background] || BACKGROUNDS[background] || null;

  // Dynamic steps - spells only for spellcasters
  const STEPS = useMemo(() => {
    return BASE_STEPS.filter(s => !s.needs || s.needs({ className }));
  }, [className]);

  // Fetch SRD spells when className changes to a spellcaster
  useEffect(() => {
    if (!SPELL_CREATION.has(className)) {
      setSrdSpells([]);
      return;
    }
    setSpellsLoading(true);
    apiClient.get(`/srd/spells`, { params: { class_name: className } })
      .then(res => setSrdSpells(res.data?.spells || []))
      .catch((error) => toast.error(error?.response?.data?.detail || 'Failed to load spells'))
      .finally(() => setSpellsLoading(false));
  }, [className]);

  // Reset spell picks when class changes
  useEffect(() => {
    if (!className) { setSelectedCantrips([]); setSelectedSpells([]); return; }
    const allowed = new Set((srdSpells || []).map(sp => sp.name));
    setSelectedCantrips(prev => prev.filter(name => allowed.has(name)).slice(0, neededSpells.cantrips || 0));
    setSelectedSpells(prev => prev.filter(name => allowed.has(name)).slice(0, neededSpells.spells || 0));
  }, [className, srdSpells, neededSpells.cantrips, neededSpells.spells]);

  // Reset fighting style when class changes to non-FS class
  useEffect(() => {
    if (!FIGHTING_STYLE_CLASSES[className]) setFightingStyle('');
  }, [className]);

  // Reset subrace + race-specific picks when race changes
  useEffect(() => {
    if (race && availableSubraces.length === 0) setSubrace("");
    if (race && subrace && !availableSubraces.includes(subrace)) setSubrace("");
    setFloatingAsi({});
    setChosenLanguages([]);
    setVersatilitySkills([]);
  }, [race, availableSubraces.length]);

  // How many floating +1s does this race offer? (2014 only)
  const floatingAsiBudget = useMemo(() => {
    if (edition !== '2014' || !raceData) return 0;
    return raceData.asi2014?.choice || 0;
  }, [edition, raceData]);

  // How many extra languages does this race offer?
  const languageBudget = useMemo(() => countLanguageChoices(raceData), [raceData]);

  const totalFloatingSpent = Object.values(floatingAsi).reduce((a, b) => a + b, 0);

  // ASI calculation (now includes floating +1s the player distributed)
  const asiBonus = useMemo(() => {
    const bonus = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 };
    if (edition === "2014" && raceData) {
      const asi = raceData.asi2014 || {};
      if (asi.all) ABILITIES.forEach(a => bonus[a] = asi.all);
      else Object.entries(asi).forEach(([s, v]) => { if (s !== 'choice' && bonus[s] !== undefined) bonus[s] = v; });
      if (subrace && raceData.subraces?.[subrace]?.asi2014) {
        Object.entries(raceData.subraces[subrace].asi2014).forEach(([s, v]) => {
          if (bonus[s] !== undefined) bonus[s] += v;
        });
      }
      // Floating +1s chosen by player
      Object.entries(floatingAsi).forEach(([s, v]) => {
        if (bonus[s] !== undefined) bonus[s] += v;
      });
    } else if (edition === "2024" && backgroundData?.asi2024) {
      Object.entries(backgroundData.asi2024).forEach(([s, v]) => { if (bonus[s] !== undefined) bonus[s] = v; });
    }
    return bonus;
  }, [edition, raceData, backgroundData, subrace, floatingAsi]);

  // Auto-save draft
  useEffect(() => {
    const draft = { step, name, race, subrace, className, subclass, background, portrait, alignment, method, edition, stats, selectedSkills, floatingAsi, chosenLanguages, versatilitySkills, fightingStyle, selectedCantrips, selectedSpells, equipmentChoice, originFeat };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [step, name, race, subrace, className, subclass, background, portrait, alignment, method, edition, stats, selectedSkills, floatingAsi, chosenLanguages, versatilitySkills, fightingStyle, selectedCantrips, selectedSpells, equipmentChoice, originFeat]);

  const pointBuySpent = useMemo(
    () => ABILITIES.reduce((sum, a) => sum + calculatePointBuyCost(stats[a]), 0),
    [stats]
  );
  const pointBuyRemaining = POINT_BUY_TOTAL - pointBuySpent;

  const finalStats = useMemo(() => {
    const out = {};
    ABILITIES.forEach(a => { out[a] = Number(stats[a]) + asiBonus[a]; });
    return out;
  }, [stats, asiBonus]);

  const conMod = Math.floor((finalStats.constitution - 10) / 2);
  const dexMod = Math.floor((finalStats.dexterity - 10) / 2);
  const hitDie = classData?.hitDie || 8;
  const derivedHp = Math.max(1, hitDie + conMod);
  const derivedAc = 10 + dexMod;

  // Skill choices logic
  const classSkillOptions = useMemo(() => {
    if (!classData) return [];
    if (classData.skillChoices === 'any') return Object.keys(ALL_SKILLS);
    return classData.skillChoices || [];
  }, [classData]);
  const classSkillCount = classData?.skillCount || 0;
  const backgroundSkills = backgroundData?.skillProficiencies || [];
  const hasHalfElfVersatility = race === 'Half-Elf' && edition === '2014';
  const versatilityNeeded = hasHalfElfVersatility ? 2 : 0;

  // Spell counts for the current class at level 1
  const spellReq = SPELL_COUNTS_L1[className] || null;

  useEffect(() => {
    setSpellSearch('');
    setSpellSchoolFilter('all');
  }, [className]);
  const wisMod = Math.floor((Number(stats.wisdom || 10) - 10) / 2);
  const intMod = Math.floor((Number(stats.intelligence || 10) - 10) / 2);
  const neededSpells = useMemo(() => {
    if (!spellReq) return { cantrips: 0, spells: 0 };
    // Cleric/Druid prepare spells: count = casting ability mod + level (min 1)
    if (className === 'Cleric') return { cantrips: 3, spells: Math.max(1, wisMod + 1) };
    if (className === 'Druid') return { cantrips: 2, spells: Math.max(1, wisMod + 1) };
    if (className === 'Wizard') return { cantrips: 3, spells: 6 };
    return spellReq;
  }, [className, wisMod, intMod, spellReq]);

  // Toggle a class skill (cannot exceed count, cannot pick if already from background)
  const toggleSkill = (skill) => {
    if (backgroundSkills.includes(skill)) return; // already free from bg
    setSelectedSkills(prev => {
      if (prev.includes(skill)) return prev.filter(s => s !== skill);
      if (prev.length >= classSkillCount) {
        toast.info(`You can only pick ${classSkillCount} class skills.`);
        return prev;
      }
      return [...prev, skill];
    });
  };

  // Ability score allocation now lives in builder/AbilitiesStep.js —
  // it owns the drag-and-drop pool, cinematic roll animation, and point-buy steppers.

  // Step validation
  const canAdvance = () => {
    const id = STEPS[step].id;
    if (id === 'edition') return !!edition;
    if (id === 'race') {
      if (!race) return false;
      if (availableSubraces.length > 0 && !subrace) return false;
      if (floatingAsiBudget > 0 && totalFloatingSpent !== floatingAsiBudget) return false;
      if (languageBudget > 0 && chosenLanguages.length !== languageBudget) return false;
      return true;
    }
    if (id === 'class') {
      if (!className) return false;
      if (edition === '2014' && SUBCLASS_AT_L1_2014.has(className) && !subclass) return false;
      // Fighter requires fighting style at L1
      if (className === 'Fighter' && !fightingStyle) return false;
      return true;
    }
    if (id === 'background') {
      if (!background) return false;
      // 2024 rules: background grants an origin feat at character creation
      if (edition === '2024' && !originFeat) return false;
      return true;
    }
    if (id === 'abilities') {
      if (!validateAbilityScores(stats)) return false;
      if (method === 'point' && pointBuyRemaining !== 0) return false;
      return true;
    }
    if (id === 'skills') {
      if (selectedSkills.length !== classSkillCount) return false;
      if (hasHalfElfVersatility && versatilitySkills.length !== 2) return false;
      return true;
    }
    if (id === 'spells') {
      if (selectedCantrips.length !== neededSpells.cantrips) return false;
      if (selectedSpells.length !== neededSpells.spells) return false;
      return true;
    }
    if (id === 'equipment') return !!equipmentChoice;
    if (id === 'review') return name.trim().length > 0;
    return true;
  };

  const goNext = () => {
    if (!canAdvance()) {
      toast.error('Please complete this step before continuing.');
      return;
    }
    setStep(s => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => setStep(s => Math.max(0, s - 1));
  const goToStep = (i) => {
    // Allow jumping back freely; jumping forward only if can advance
    if (i <= step) { setStep(i); return; }
    if (i === step + 1 && canAdvance()) setStep(i);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    const reset = getInitialState();
    setStep(0);
    setName(""); setRace(""); setSubrace(""); setClassName("");
    setSubclass(""); setBackground(""); setPortrait("");
    setAlignment('Neutral'); setMethod(reset.method); setEdition(reset.edition);
    setStats(reset.stats); setSelectedSkills([]);
    setFloatingAsi({}); setChosenLanguages([]);
    setVersatilitySkills([]); setFightingStyle('');
    setSelectedCantrips([]); setSelectedSpells([]);
    setEquipmentChoice('A');
    setOriginFeat('');
    toast.success('Draft cleared');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter a character name'); return; }
    if (!race) { toast.error('Please choose a race'); return; }
    if (!className) { toast.error('Please choose a class'); return; }
    if (!background) { toast.error('Please choose a background'); return; }
    if (!validateAbilityScores(stats)) { toast.error(`Scores must be ${MIN_ABILITY_SCORE}-${MAX_ABILITY_SCORE}`); return; }

    const finalScores = isEditMode ? stats : finalStats;

    // Build proficiencies from class + background (+ Half-Elf Skill Versatility)
    const allSkills = Array.from(new Set([...(backgroundSkills || []), ...selectedSkills, ...versatilitySkills]));
    const tools = backgroundData?.toolProficiencies || [];
    const baseLanguages = (raceData?.languages || []).filter(l => l !== 'One of choice' && l !== 'One additional language');

    const racialTraits = (raceData?.traits || []).map(t => ({
      name: t.split(' (')[0],
      description: t
    }));
    const subraceTraits = (raceData?.subraces?.[subrace]?.traits || []).map(t => ({
      name: t.split(' (')[0],
      description: t
    }));

    const lvl1Features = classData?.features?.[1] || [];
    const classFeatures = lvl1Features.map(name => ({
      name,
      description: `${className} feature gained at Level 1`
    }));
    // Add Fighting Style as a feature if picked
    if (fightingStyle) {
      classFeatures.push({
        name: `Fighting Style: ${fightingStyle}`,
        description: `Fighting style chosen at character creation.`
      });
    }

    // Determine starting equipment based on choice
    const startingEquipmentList = (classData?.startingEquipment || []);
    const backgroundEquipment = (backgroundData?.equipment || []);

    const payload = {
      name: name.trim(),
      race,
      subrace: subrace || "",
      character_class: className,
      subclass: subclass || "",
      background: background || "",
      edition,
      ruleset_id: edition === '2024' ? 'dnd5e_2024' : 'dnd5e_2014',
      alignment,
      strength: Number(finalScores.strength),
      dexterity: Number(finalScores.dexterity),
      constitution: Number(finalScores.constitution),
      intelligence: Number(finalScores.intelligence),
      wisdom: Number(finalScores.wisdom),
      charisma: Number(finalScores.charisma),
      portrait_url: portrait || "",
      // Personality prompts
      personality_trait: personalityTrait || "",
      ideal: ideal || "",
      bond: bond || "",
      flaw: flaw || "",
      backstory: backstory || "",
    };

    if (!isEditMode) {
      payload.level = 1;
      payload.max_hit_points = derivedHp;
      payload.skill_proficiencies = allSkills;
      payload.saving_throw_proficiencies = classData?.savingThrows || [];
      payload.armor_proficiencies = classData?.armorProficiencies || [];
      payload.weapon_proficiencies = classData?.weaponProficiencies || [];
      payload.tool_proficiencies = tools;
      payload.languages = Array.from(new Set([...baseLanguages, ...chosenLanguages]));
      payload.racial_traits = [...racialTraits, ...subraceTraits];
      payload.class_features = classFeatures;
      payload.speed = raceData?.speed || 30;
      payload.fighting_style = fightingStyle || '';
      payload.equipment_choice = equipmentChoice;
      payload.starting_equipment = [...startingEquipmentList, ...backgroundEquipment];
      payload.cantrips_known = selectedCantrips.map(name => ({ name }));
      const spellsKey = spellReq?.type === 'prepared' ? 'spells_prepared' : 'spells_known';
      payload[spellsKey] = selectedSpells.map(name => ({ name }));
      // 2024 origin feat selected during background step
      if (edition === '2024' && originFeat) {
        payload.feats = [{ name: originFeat, source: 'origin (2024 background)' }];
      }
    }

    try {
      setIsSubmitting(true);
      if (isEditMode && characterId) {
        const updatePayload = { ...payload };
        if (selectedSkills.length || backgroundSkills.length) {
          updatePayload.skill_proficiencies = allSkills;
        }
        await apiClient.patch(`/characters/${characterId}`, updatePayload);
        toast.success("Character updated!");
        navigate(`/characters/${characterId}`);
      } else {
        const response = await apiClient.post(`/characters`, payload);
        onCreateCharacter?.(response.data?.character);
        localStorage.removeItem(DRAFT_KEY);
        toast.success("Character created!");
        navigate(response.data?.character_id ? `/characters/${response.data.character_id}` : '/home');
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} character`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============ STYLES ============
  const pageStyle = {
    minHeight: '100dvh',
    background: theme.bg.primary,
    padding: '24px',
    color: theme.text.primary
  };
  const containerStyle = { maxWidth: '1100px', margin: '0 auto' };
  const panelStyle = {
    background: theme.bg.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    padding: '28px',
    boxShadow: 'none'
  };
  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: theme.bg.primary, border: `1px solid ${theme.border}`,
    borderRadius: '8px', color: theme.text.primary, fontSize: '15px', outline: 'none'
  };
  const labelStyle = { display: 'block', marginBottom: '8px', color: theme.text.secondary, fontSize: '13px', fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' };

  // ============ STEP RENDERS ============
  const renderEditionStep = () => (
    <div>
      <StepHeader icon={BookOpen} title="Choose Your Rules Edition" subtitle="Select the edition that matches your campaign" color={theme.sunset.gold} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '12px' }}>
        {Object.entries(EDITIONS).map(([key, ed]) => (
          <SelectCard
            key={key} active={edition === key} onClick={() => setEdition(key)}
            color={theme.sunset.gold}
            title={ed.name}
            subtitle={ed.description}
            data-testid={`edition-${key}`}
          />
        ))}
      </div>
      <InfoBanner>
        {edition === '2014' ? 'Ability bonuses come from your Race.' : 'Ability bonuses come from your Background (Origin).'}
      </InfoBanner>
      <div style={{
        marginTop: 12,
        padding: 12,
        background: theme.bg.surface,
        border: `1px solid ${theme.border}`,
        color: theme.text.secondary,
        fontSize: 12
      }}>
        <div style={{ color: theme.sunset.gold, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
          Source coverage map
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {['classes', 'subclasses', 'species', 'backgrounds', 'feats', 'spells', 'equipment'].map(key => (
            <span key={key} style={{ border: `1px solid ${theme.border}`, padding: '3px 6px' }}>
              {SOURCE_CONTENT_LABELS[key]}: {getSourcesByContent(key).length}
            </span>
          ))}
        </div>
        <div style={{ color: theme.text.muted, lineHeight: 1.45 }}>
          {SOURCE_LEGAL_NOTICE}
        </div>
      </div>
    </div>
  );

  const renderRaceStep = () => (
    <div>
      <StepHeader icon={User} title="Choose Your Race" subtitle="Your ancestry shapes your traits and abilities" color={theme.sunset.pink} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(mergedRaces).map(([key, r]) => (
          <SelectCard
            key={key} active={race === key} onClick={() => setRace(key)}
            color={theme.sunset.pink}
            title={r.name}
            subtitle={r.description}
            data-testid={`race-${key}`}
            footer={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                <Pill icon="🏃">{r.speed}ft</Pill>
                <Pill icon="📐">{r.size}</Pill>
                {edition === '2014' && r.asi2014 && (
                  <Pill icon="✨">{r.asi2014.all
                    ? `+${r.asi2014.all} All`
                    : Object.entries(r.asi2014).filter(([k]) => k !== 'choice').map(([k, v]) => `+${v} ${k.slice(0, 3).toUpperCase()}`).join(' ')}</Pill>
                )}
              </div>
            }
          />
        ))}
      </div>

      {raceData && (
        <DetailPanel title={`${raceData.name} Traits`} color={theme.sunset.pink}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {raceData.traits.map((t, i) => (
              <div key={i} style={traitChipStyle}><Sparkles size={12} style={{ flexShrink: 0 }} /> {t}</div>
            ))}
          </div>
          {raceData.languages && (
            <div style={{ fontSize: '13px', color: theme.text.secondary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Languages size={14} /> Languages: {raceData.languages.join(', ')}
            </div>
          )}
        </DetailPanel>
      )}

      {availableSubraces.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <label style={labelStyle}>Choose Subrace</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {availableSubraces.map(sr => {
              const sub = raceData.subraces[sr];
              return (
                <SelectCard
                  key={sr} active={subrace === sr} onClick={() => setSubrace(sr)}
                  color={theme.sunset.pink}
                  title={sr}
                  subtitle={(sub.traits || []).slice(0, 1).join(', ') || 'Subrace'}
                  data-testid={`subrace-${sr}`}
                  footer={
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {edition === '2014' && sub.asi2014 && Object.entries(sub.asi2014).map(([k, v]) => (
                        <Pill key={k} icon="✨">+{v} {k.slice(0, 3).toUpperCase()}</Pill>
                      ))}
                    </div>
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Floating ASI picker (Half-Elf 2014: +1 to two abilities of your choice) */}
      {edition === '2014' && floatingAsiBudget > 0 && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: theme.accent.soft, border: `1px solid ${theme.accent.line || theme.border}` }}>
          <label style={labelStyle}>
            Distribute {floatingAsiBudget} floating +1{floatingAsiBudget === 1 ? '' : 's'}
            {' — '}
            <span style={{ color: totalFloatingSpent === floatingAsiBudget ? theme.success : (theme.accent?.primary || theme.accent), textTransform: 'none' }}>
              {totalFloatingSpent}/{floatingAsiBudget} assigned
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Pick {floatingAsiBudget} different abilities to each gain +1. Cannot stack on the same ability.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
            {ABILITIES.map(a => {
              const fixed = (raceData?.asi2014?.[a] || 0) > 0; // fixed bonus already
              const chosen = !!floatingAsi[a];
              const disabled = fixed;
              return (
                <button
                  key={a} type="button" disabled={disabled}
                  data-testid={`floating-asi-${a}`}
                  onClick={() => {
                    setFloatingAsi(prev => {
                      const next = { ...prev };
                      if (next[a]) delete next[a];
                      else if (totalFloatingSpent < floatingAsiBudget) next[a] = 1;
                      else toast.info(`Only ${floatingAsiBudget} floating +1s allowed`);
                      return next;
                    });
                  }}
                  style={{
                    padding: '8px 10px', borderRadius: 8,
                    background: chosen ? 'rgba(16, 185, 129, 0.18)' : disabled ? theme.accent.soft : theme.bg.surface,
                    border: `1px solid ${chosen ? theme.success : disabled ? theme.accent.line : theme.border}`,
                    color: disabled ? theme.text.muted : theme.text.primary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.5 : 1, fontSize: 12, fontWeight: 600
                  }}>
                  {chosen ? '✓ ' : ''}{a.charAt(0).toUpperCase() + a.slice(1)}
                  {fixed && <span style={{ fontSize: 9, display: 'block', color: theme.text.muted }}>Already +{raceData.asi2014[a]}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Language picker (for races with "One of choice") */}
      {languageBudget > 0 && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: theme.accent.soft, border: `1px solid ${theme.accent.line || theme.border}` }}>
          <label style={labelStyle}>
            Choose {languageBudget} extra language{languageBudget === 1 ? '' : 's'}
            {' — '}
            <span style={{ color: chosenLanguages.length === languageBudget ? theme.success : (theme.accent?.primary || theme.accent), textTransform: 'none' }}>
              {chosenLanguages.length}/{languageBudget} picked
            </span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXTRA_LANGUAGE_OPTIONS.filter(l => !(raceData?.languages || []).includes(l)).map(lang => {
              const sel = chosenLanguages.includes(lang);
              return (
                <button
                  key={lang} type="button"
                  data-testid={`language-${lang.toLowerCase()}`}
                  onClick={() => {
                    setChosenLanguages(prev => {
                      if (prev.includes(lang)) return prev.filter(l => l !== lang);
                      if (prev.length >= languageBudget) {
                        toast.info(`Only ${languageBudget} language${languageBudget === 1 ? '' : 's'} can be chosen`);
                        return prev;
                      }
                      return [...prev, lang];
                    });
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12,
                    background: sel ? theme.accent.soft : theme.bg.surface,
                    border: `1px solid ${sel ? (theme.accent?.primary || theme.accent) : theme.border}`,
                    color: theme.text.primary, cursor: 'pointer'
                  }}>
                  {sel ? '✓ ' : ''}{lang}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderClassStep = () => (
    <div>
      <StepHeader icon={Sword} title="Choose Your Class" subtitle="Your class defines your role and abilities" color={theme.sunset.purple} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(mergedClasses).map(([key, c]) => (
          <SelectCard
            key={key} active={className === key} onClick={() => setClassName(key)}
            color={theme.sunset.purple}
            title={c.name}
            subtitle={`Hit Die: d${c.hitDie} • ${c.primaryAbility?.slice(0, 3).toUpperCase()}`}
            data-testid={`class-${key}`}
            footer={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                <Pill icon="❤️">d{c.hitDie} HP</Pill>
                {c.spellcasting && <Pill icon="✦">Spellcaster</Pill>}
                <Pill icon="🛡️">{c.savingThrows.map(s => s.slice(0, 3).toUpperCase()).join('/')}</Pill>
              </div>
            }
          />
        ))}
      </div>

      {classData && (
        <DetailPanel title={`${classData.name} Level 1`} color={theme.sunset.purple}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={detailHeaderStyle}>Saving Throws</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {classData.savingThrows.map(s => <span key={s} style={traitChipStyle}><Shield size={12} /> {s.charAt(0).toUpperCase() + s.slice(1)}</span>)}
              </div>
              <div style={detailHeaderStyle}>Armor & Weapons</div>
              <div style={{ fontSize: '13px', color: theme.text.secondary, marginBottom: '12px', lineHeight: 1.6 }}>
                <div><strong>Armor:</strong> {classData.armorProficiencies.length ? classData.armorProficiencies.join(', ') : 'None'}</div>
                <div><strong>Weapons:</strong> {Array.isArray(classData.weaponProficiencies) ? classData.weaponProficiencies.join(', ') : ''}</div>
              </div>
            </div>
            <div>
              <div style={detailHeaderStyle}>Level 1 Features</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {(classData.features?.[1] || []).map(f => <span key={f} style={traitChipStyle}><Sparkles size={12} /> {f}</span>)}
              </div>
              <div style={detailHeaderStyle}>Starting Equipment</div>
              <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.6 }}>
                {(classData.startingEquipment || []).map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            </div>
          </div>
        </DetailPanel>
      )}

      {availableSubclasses.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {(() => {
            const requiresL1 = edition === '2014' && SUBCLASS_AT_L1_2014.has(className);
            const subclassLabel = {
              'Cleric': 'Divine Domain', 'Sorcerer': 'Sorcerous Origin', 'Warlock': 'Otherworldly Patron'
            }[className] || 'Subclass';
            return (
              <>
                <label style={labelStyle}>
                  {subclassLabel}
                  <span style={{ color: requiresL1 ? '#EF4444' : theme.text.muted, textTransform: 'none', marginLeft: 6 }}>
                    {requiresL1 ? '(REQUIRED at Level 1)' : '(optional now — typically chosen at level 3)'}
                  </span>
                </label>
                <select value={subclass} onChange={e => setSubclass(e.target.value)} style={{ ...inputStyle, borderColor: requiresL1 && !subclass ? '#EF4444' : theme.border }} data-testid="subclass-select">
                  <option value="">{requiresL1 ? `-- Choose a ${subclassLabel} --` : 'Select later'}</option>
                  {availableSubclasses.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                </select>
              </>
            );
          })()}
        </div>
      )}

      {/* Fighting Style (Fighter L1, Paladin L2, Ranger L2) */}
      {FIGHTING_STYLE_CLASSES[className] && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: theme.accent.soft, border: `1px solid ${theme.accent.line || theme.border}` }}>
          <label style={labelStyle}>
            Fighting Style
            <span style={{ color: className === 'Fighter' ? theme.danger : theme.text.muted, textTransform: 'none', marginLeft: 6 }}>
              {className === 'Fighter' ? '(REQUIRED at Level 1)' : `(gained at Level ${FIGHTING_STYLE_CLASSES[className].level})`}
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {FIGHTING_STYLE_CLASSES[className].styles.map(style => {
              const sel = fightingStyle === style;
              return (
                <button
                  key={style} type="button"
                  data-testid={`fighting-style-${style.toLowerCase().replace(/ /g, '-')}`}
                  onClick={() => setFightingStyle(sel ? '' : style)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'left',
                    background: sel ? 'rgba(239, 68, 68, 0.18)' : theme.bg.surface,
                    border: `1px solid ${sel ? theme.danger : theme.border}`,
                    color: theme.text.primary, cursor: 'pointer'
                  }}>
                  {sel ? '✓ ' : ''}{style}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderBackgroundStep = () => (
    <div>
      <StepHeader icon={Scroll} title="Choose Your Background" subtitle="Your past life shapes your skills and gear" color={theme.sunset.gold} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(mergedBackgrounds).map(([key, b]) => (
          <SelectCard
            key={key} active={background === key} onClick={() => setBackground(key)}
            color={theme.sunset.gold}
            title={b.name}
            subtitle={b.description}
            data-testid={`background-${key}`}
            footer={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {(b.skillProficiencies || []).map(sp => <Pill key={sp} icon="📜">{sp}</Pill>)}
                {edition === '2024' && b.asi2024 && (
                  <Pill icon="✨">
                    {Object.entries(b.asi2024).map(([k, v]) => `+${v} ${k.slice(0, 3).toUpperCase()}`).join(' ')}
                  </Pill>
                )}
              </div>
            }
          />
        ))}
      </div>

      {backgroundData && (
        <DetailPanel title={backgroundData.name} color={theme.sunset.gold}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={detailHeaderStyle}>Granted Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                {(backgroundData.skillProficiencies || []).map(s => <span key={s} style={traitChipStyle}><Award size={12} /> {s}</span>)}
              </div>
              {backgroundData.toolProficiencies && (
                <>
                  <div style={detailHeaderStyle}>Tool Proficiencies</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    {backgroundData.toolProficiencies.map(t => <span key={t} style={traitChipStyle}><Backpack size={12} /> {t}</span>)}
                  </div>
                </>
              )}
              {backgroundData.feature && (
                <>
                  <div style={detailHeaderStyle}>Feature</div>
                  <div style={traitChipStyle}><Sparkles size={12} /> {backgroundData.feature}</div>
                </>
              )}
            </div>
            <div>
              <div style={detailHeaderStyle}>Starting Equipment</div>
              <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.6 }}>
                {(backgroundData.equipment || []).map((e, i) => <div key={i}>• {e}</div>)}
              </div>
              {edition === '2024' && backgroundData.originFeat2024 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={detailHeaderStyle}>2024 Origin Feat</div>
                  <div style={traitChipStyle}><Sparkles size={12} /> {backgroundData.originFeat2024}</div>
                </div>
              )}
            </div>
          </div>
        </DetailPanel>
      )}

      {/* 2024 Origin Feat picker — required when edition is 2024 */}
      {edition === '2024' && (
        <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: theme.bg.surface, border: `1px solid ${theme.border}` }}>
          <label style={labelStyle}>
            2024 Origin Feat
            <span style={{ color: originFeat ? '#10B981' : '#EF4444', textTransform: 'none', marginLeft: 6 }}>
              {originFeat ? `✓ ${originFeat}` : '(REQUIRED in 2024 rules)'}
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Pick a 2024-style Origin feat granted by your background. (Origin feats are a new 2024 PHB feature replacing the 2014 background ASI flow.)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {getFeatsByEdition('2024', 'origin').map(feat => {
              const sel = originFeat === feat.name;
              return (
                <button
                  key={feat.name} type="button"
                  data-testid={`origin-feat-${feat.name.toLowerCase().replace(/\s/g, '-').replace(/[()]/g, '')}`}
                  onClick={() => setOriginFeat(sel ? '' : feat.name)}
                  title={feat.description}
                  style={{
                    padding: '8px 10px', borderRadius: 8, fontSize: 12, textAlign: 'left',
                    background: sel ? 'rgba(239, 68, 68, 0.18)' : theme.bg.primary,
                    border: `1px solid ${sel ? theme.sunset.gold : theme.border}`,
                    color: theme.text.primary, cursor: 'pointer'
                  }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{sel ? '✓ ' : ''}{feat.name}</div>
                  <div style={{ fontSize: 10, color: theme.text.muted, lineHeight: 1.4 }}>{feat.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderSkillsStep = () => (
    <div>
      <StepHeader icon={Award} title="Choose Your Skills" subtitle={`Pick ${classSkillCount} class skill${classSkillCount === 1 ? '' : 's'} (background already grants others)`} color={theme.sunset.pink} />

      {backgroundSkills.length > 0 && (
        <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ fontSize: '12px', color: theme.sunset.gold, marginBottom: '6px', fontWeight: 600 }}>
            Granted by {background}:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {backgroundSkills.map(s => <span key={s} style={{ ...traitChipStyle, background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }}><Check size={12} /> {s}</span>)}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '12px', fontSize: '13px', color: theme.text.muted }}>
        Selected: <strong style={{ color: selectedSkills.length === classSkillCount ? '#10B981' : theme.sunset.gold }}>{selectedSkills.length}</strong> / {classSkillCount}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
        {Object.entries(ALL_SKILLS).map(([skill, ab]) => {
          const fromBg = backgroundSkills.includes(skill);
          const canChoose = classSkillOptions.includes(skill);
          const selected = selectedSkills.includes(skill);
          const disabled = fromBg || !canChoose;
          const finalAb = Number(stats[ab]) + (asiBonus[ab] || 0);
          const mod = Math.floor((finalAb - 10) / 2);
          const isProfic = fromBg || selected;
          return (
            <button
              key={skill} type="button" disabled={disabled} onClick={() => toggleSkill(skill)}
              data-testid={`skill-toggle-${skill.replace(/ /g, '-').toLowerCase()}`}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: '8px',
                background: fromBg ? 'rgba(245, 158, 11, 0.12)' : selected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(31, 31, 35, 0.5)',
                border: `1px solid ${fromBg ? 'rgba(245, 158, 11, 0.3)' : selected ? theme.borderActive : theme.border}`,
                color: disabled && !fromBg ? theme.text.muted : theme.text.primary,
                cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled && !fromBg ? 0.45 : 1,
                fontSize: '13px', textAlign: 'left', transition: 'all 0.2s'
              }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isProfic && <Check size={12} color={fromBg ? theme.sunset.gold : theme.sunset.purple} />}
                {skill}
                <span style={{ fontSize: '10px', color: theme.text.muted }}>({ab.slice(0, 3).toUpperCase()})</span>
              </span>
              <span style={{ fontWeight: 600, color: isProfic ? theme.sunset.pink : theme.text.muted }}>
                {formatModifier(isProfic ? mod + 2 : mod)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Half-Elf Skill Versatility - pick 2 extra skills */}
      {hasHalfElfVersatility && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.06)', border: `1px solid ${theme.border}` }}>
          <label style={labelStyle}>
            Half-Elf: Skill Versatility — pick 2 extra skills
            {' — '}
            <span style={{ color: versatilitySkills.length === 2 ? '#10B981' : theme.sunset.gold, textTransform: 'none' }}>
              {versatilitySkills.length}/2 picked
            </span>
          </label>
          <div style={{ fontSize: 12, color: theme.text.muted, marginBottom: 8 }}>
            Any two skills of your choice. Cannot overlap with class or background skills.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
            {Object.keys(ALL_SKILLS).map(skill => {
              const alreadyProfic = backgroundSkills.includes(skill) || selectedSkills.includes(skill);
              const sel = versatilitySkills.includes(skill);
              const disabled = alreadyProfic;
              return (
                <button
                  key={skill} type="button" disabled={disabled}
                  data-testid={`versatility-${skill.replace(/ /g, '-').toLowerCase()}`}
                  onClick={() => {
                    setVersatilitySkills(prev => {
                      if (prev.includes(skill)) return prev.filter(s => s !== skill);
                      if (prev.length >= 2) { toast.info('Only 2 versatility skills allowed'); return prev; }
                      return [...prev, skill];
                    });
                  }}
                  style={{
                    padding: '7px 10px', borderRadius: 6, fontSize: 12, textAlign: 'left',
                    background: sel ? 'rgba(239, 68, 68, 0.2)' : disabled ? 'rgba(239, 68, 68, 0.05)' : 'rgba(31, 31, 35, 0.5)',
                    border: `1px solid ${sel ? theme.sunset.pink : theme.border}`,
                    color: disabled ? theme.text.muted : theme.text.primary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.4 : 1
                  }}>
                  {sel ? '✓ ' : ''}{skill}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderSpellsStep = () => {
    const q = spellSearch.trim().toLowerCase();
    const bySchool = (s) => spellSchoolFilter === 'all' || (s.school || '').toLowerCase() === spellSchoolFilter;
    const byQuery = (s) => !q || (s.name || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    const cantrips = srdSpells.filter(s => s.level === 0 && bySchool(s) && byQuery(s));
    const lvl1Spells = srdSpells.filter(s => s.level === 1 && bySchool(s) && byQuery(s));
    const schools = Array.from(new Set(srdSpells.map(sp => (sp.school || '').toLowerCase()).filter(Boolean))).sort();
    const toggleCantrip = (name) => {
      setSelectedCantrips(prev => {
        if (prev.includes(name)) return prev.filter(x => x !== name);
        if (prev.length >= neededSpells.cantrips) {
          toast.info(`Only ${neededSpells.cantrips} cantrips allowed at Level 1`);
          return prev;
        }
        return [...prev, name];
      });
    };
    const toggleSpell = (name) => {
      setSelectedSpells(prev => {
        if (prev.includes(name)) return prev.filter(x => x !== name);
        if (prev.length >= neededSpells.spells) {
          toast.info(`Only ${neededSpells.spells} Level 1 spells allowed`);
          return prev;
        }
        return [...prev, name];
      });
    };
    const renderSpellCard = (spell, picked, onClick) => (
      <button
        key={spell.name} type="button" onClick={onClick}
        data-testid={`spell-${spell.name.toLowerCase().replace(/ /g, '-')}`}
        style={{
          textAlign: 'left', padding: '10px 12px', borderRadius: 10,
          background: picked ? 'rgba(239, 68, 68, 0.18)' : 'rgba(31, 31, 35, 0.5)',
          border: `1px solid ${picked ? theme.borderActive : theme.border}`,
          color: theme.text.primary, cursor: 'pointer', fontSize: 12
        }}
        title={spell.description?.slice(0, 240) || ''}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{picked ? '✓ ' : ''}{spell.name}</strong>
          <span style={{ fontSize: 10, color: theme.text.muted }}>{spell.school}</span>
        </div>
        <div style={{ fontSize: 10, color: theme.text.muted, marginTop: 3 }}>
          {spell.casting_time} · {spell.range}{spell.concentration ? ' · Concentration' : ''}
        </div>
      </button>
    );
    return (
      <div>
        <StepHeader icon={Wand2} title="Choose Your Spells" subtitle={`${className} gets ${neededSpells.cantrips} cantrips and ${neededSpells.spells} L1 spell${neededSpells.spells === 1 ? '' : 's'} at Level 1`} color={theme.sunset.purple} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            value={spellSearch}
            onChange={(e) => setSpellSearch(e.target.value)}
            placeholder="Search spells by name or text..."
            style={{ ...inputStyle, maxWidth: 320, padding: '10px 12px', fontSize: 13 }}
          />
          <select
            value={spellSchoolFilter}
            onChange={(e) => setSpellSchoolFilter(e.target.value)}
            style={{ ...inputStyle, maxWidth: 220, padding: '10px 12px', fontSize: 13 }}
          >
            <option value="all">All schools</option>
            {schools.map(sc => <option key={sc} value={sc}>{sc[0].toUpperCase() + sc.slice(1)}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setSelectedCantrips([]); setSelectedSpells([]); }}
            style={{ padding: '10px 12px', border: `1px solid ${theme.border}`, background: 'rgba(31, 31, 35, 0.5)', color: theme.text.secondary, cursor: 'pointer' }}
          >
            Clear picks
          </button>
        </div>

        {spellsLoading && <div style={{ color: theme.text.muted, padding: 20 }}>Loading spells…</div>}
        {!spellsLoading && (
          <>
            {neededSpells.cantrips > 0 && (
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>
                  Cantrips — <span style={{ color: selectedCantrips.length === neededSpells.cantrips ? '#10B981' : theme.sunset.gold, textTransform: 'none' }}>
                    {selectedCantrips.length}/{neededSpells.cantrips}
                  </span>
                </label>
                {cantrips.length === 0 && <div style={{ color: theme.text.muted, fontSize: 12 }}>No cantrips available for {className} in SRD.</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                  {cantrips.map(s => renderSpellCard(s, selectedCantrips.includes(s.name), () => toggleCantrip(s.name)))}
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>
                Level 1 Spells — <span style={{ color: selectedSpells.length === neededSpells.spells ? '#10B981' : theme.sunset.gold, textTransform: 'none' }}>
                  {selectedSpells.length}/{neededSpells.spells}
                </span>
                {spellReq?.type === 'prepared' && <span style={{ fontSize: 11, marginLeft: 8, color: theme.text.muted, textTransform: 'none' }}>(prepared spells - can change on long rest)</span>}
              </label>
              {lvl1Spells.length === 0 && <div style={{ color: theme.text.muted, fontSize: 12 }}>No L1 spells available.</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
                {lvl1Spells.map(s => renderSpellCard(s, selectedSpells.includes(s.name), () => toggleSpell(s.name)))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderEquipmentStep = () => {
    const startingList = classData?.startingEquipment || [];
    const bgEquip = backgroundData?.equipment || [];
    // Split into two "option" lists (first half = A, second half = B) purely to make the choice tangible.
    // The underlying data doesn't separate options, so we present the full list + a gold alternative.
    return (
      <div>
        <StepHeader icon={Backpack} title="Choose Starting Gear" subtitle={`${className} gets class equipment. ${background} adds background items.`} color={theme.sunset.gold} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {['A', 'B'].map(choice => {
            const active = equipmentChoice === choice;
            return (
              <button
                key={choice} type="button" onClick={() => setEquipmentChoice(choice)}
                data-testid={`equipment-${choice}`}
                style={{
                  textAlign: 'left', padding: 14, borderRadius: 12,
                  background: active ? 'rgba(245, 158, 11, 0.12)' : 'rgba(31, 31, 35, 0.5)',
                  border: `2px solid ${active ? theme.sunset.gold : theme.border}`,
                  color: theme.text.primary, cursor: 'pointer'
                }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                  {choice === 'A' ? 'Option A — Adventurer Package' : 'Option B — Starting Gold'}
                </div>
                <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.5 }}>
                  {choice === 'A'
                    ? `Take your ${className} starting equipment exactly as recommended.`
                    : `Skip gear and start with rolled gold (DM discretion, roughly class-appropriate).`}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(31, 31, 35, 0.5)', border: `1px solid ${theme.border}` }}>
          <div style={detailHeaderStyle}>Your gear</div>
          {equipmentChoice === 'A' ? (
            <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.8 }}>
              <strong style={{ color: theme.sunset.purple }}>From {className}:</strong>
              <ul style={{ margin: '4px 0 12px 18px', padding: 0 }}>
                {startingList.length === 0 && <li>No starting equipment listed</li>}
                {startingList.map((e, i) => <li key={`c${i}`}>{e}</li>)}
              </ul>
              <strong style={{ color: theme.sunset.gold }}>From {background}:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {bgEquip.length === 0 && <li>None</li>}
                {bgEquip.map((e, i) => <li key={`b${i}`}>{e}</li>)}
              </ul>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: theme.text.secondary, lineHeight: 1.5 }}>
              You'll start with <strong>starting gold</strong> instead of equipment. Work with your DM to purchase gear before session 1.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div>
      <StepHeader icon={Check} title="Review & Name" subtitle="Final touches before your hero is born" color={theme.sunset.gold} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
        <div>
          <label style={labelStyle}>Character Name *</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Enter name..." style={inputStyle} data-testid="character-name-input"
          />
        </div>
        <div>
          <label style={labelStyle}>Alignment</label>
          <select value={alignment} onChange={e => setAlignment(e.target.value)} style={inputStyle} data-testid="alignment-select">
            {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <PortraitGenerator
          character={{
            race, subrace, className, subclass, background, alignment,
            description: backstory
          }}
          portrait={portrait}
          onChange={setPortrait}
        />
      </div>

      {/* Personality prompts — optional but encouraged. Helps GMs & AI co-GM give richer RP. */}
      <div style={{ ...panelStyle, padding: '16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={14} color="#EF4444" />
          <div style={{ fontSize: 12, fontWeight: 800, color: '#EF4444', letterSpacing: 1 }}>
            PERSONALITY & ROLEPLAY
          </div>
          <span style={{ fontSize: 10, color: theme.text.muted, fontStyle: 'italic' }}>
            optional — but richer AI + GM story hooks
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Personality Trait</label>
            <textarea
              value={personalityTrait} onChange={e => setPersonalityTrait(e.target.value)}
              placeholder="e.g. I speak in riddles, I'm suspicious of strangers..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="personality-trait-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Ideal</label>
            <textarea
              value={ideal} onChange={e => setIdeal(e.target.value)}
              placeholder="e.g. Knowledge must be shared freely, Chaos is the only truth..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="ideal-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Bond</label>
            <textarea
              value={bond} onChange={e => setBond(e.target.value)}
              placeholder="e.g. My sister was taken by slavers — I will find her..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="bond-input"
            />
          </div>
          <div>
            <label style={labelStyle}>Flaw / Fear</label>
            <textarea
              value={flaw} onChange={e => setFlaw(e.target.value)}
              placeholder="e.g. I'm afraid of deep water, I trust too easily..."
              style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
              data-testid="flaw-input"
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Backstory (1-2 paragraphs)</label>
          <textarea
            value={backstory} onChange={e => setBackstory(e.target.value)}
            placeholder="Where did your hero come from? What drives them?"
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            data-testid="backstory-input"
          />
        </div>
      </div>

      {/* Summary card */}
      <div style={{ ...panelStyle, padding: '20px', background: 'rgba(31, 31, 35, 0.7)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          {portrait ? (
            <img src={portrait} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.sunset.purple}` }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: theme.bg.surface, border: `1px solid ${theme.sunset.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={28} color="#fff" />
            </div>
          )}
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1.3rem', fontWeight: 700 }}>{name || 'Unnamed Hero'}</div>
            <div style={{ color: theme.text.secondary, fontSize: '14px' }}>
              {race}{subrace && ` (${subrace})`} • {className}{subclass && ` (${subclass})`} • {background}
            </div>
            <div style={{ color: theme.text.muted, fontSize: '12px' }}>{alignment} • Level 1 • {EDITIONS[edition]?.name}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          {ABILITIES.map(a => {
            const final = Number(stats[a]) + (asiBonus[a] || 0);
            const mod = Math.floor((final - 10) / 2);
            return (
              <div key={a} style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)' }}>
                <div style={{ fontSize: '10px', color: theme.text.muted, fontWeight: 600 }}>{formatAbility(a)}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{final}</div>
                <div style={{ fontSize: '12px', color: theme.sunset.gold, fontWeight: 600 }}>{formatModifier(mod)}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          <PreviewStat icon={Heart} label="HP" value={derivedHp} color="#EF4444" />
          <PreviewStat icon={Shield} label="AC" value={derivedAc} color={theme.sunset.purple} />
          <PreviewStat icon={Zap} label="Init" value={formatModifier(dexMod)} color={theme.sunset.pink} />
          <PreviewStat icon={User} label="Speed" value={`${raceData?.speed || 30}ft`} color={theme.sunset.gold} />
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }}>
          <div style={detailHeaderStyle}>Skill Proficiencies</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            {Array.from(new Set([...backgroundSkills, ...selectedSkills])).map(s => (
              <span key={s} style={traitChipStyle}><Check size={11} /> {s}</span>
            ))}
            {[...backgroundSkills, ...selectedSkills].length === 0 && <span style={{ color: theme.text.muted, fontSize: '12px' }}>None</span>}
          </div>
          <div style={detailHeaderStyle}>Saving Throws</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {(classData?.savingThrows || []).map(s => <span key={s} style={traitChipStyle}><Shield size={11} /> {s.charAt(0).toUpperCase() + s.slice(1)}</span>)}
          </div>
        </div>
      </div>
    </div>
  );

  if (loadingCharacter) {
    return (
      <div style={pageStyle}>
        <div style={{ ...containerStyle, textAlign: 'center', padding: '80px' }}>
          <div style={{ color: theme.text.muted }}>Loading character...</div>
        </div>
      </div>
    );
  }

  const stepId = STEPS[step].id;
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => navigate('/home')} data-testid="builder-back-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: theme.text.secondary, cursor: 'pointer', fontSize: '14px' }}>
            <ChevronLeft size={18} /> Dashboard
          </button>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.4rem', margin: 0, color: theme.sunset.gold }}>
            {isEditMode ? 'Edit Hero' : 'Forge Your Hero'}
          </h1>
          {!isEditMode ? (
            <button onClick={clearDraft} data-testid="clear-draft-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#EF4444', cursor: 'pointer', fontSize: '13px' }}>
              <RotateCcw size={14} /> Reset
            </button>
          ) : <div style={{ width: '60px' }} />}
        </div>

        {/* Stepper */}
        <Stepper steps={STEPS} current={step} onJump={goToStep} />

        {/* Progress bar — % completion across the wizard */}
        <div data-testid="builder-progress" style={{
          marginTop: 6, display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 11, color: theme.text.muted, fontWeight: 600, letterSpacing: 0.5,
        }}>
          <span>STEP {step + 1} OF {STEPS.length}</span>
          <div style={{
            flex: 1, height: 6, borderRadius: 3,
            background: 'rgba(239, 68, 68, 0.10)',
            border: '1px solid rgba(239, 68, 68, 0.20)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round(((step + 1) / STEPS.length) * 100)}%`,
              background: '#EF4444',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ color: '#EF4444', minWidth: 36, textAlign: 'right' }}>
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </span>
        </div>

        {/* 2-column: builder panel + sticky live preview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(220px, 280px)',
          gap: 16,
          marginTop: '16px',
          alignItems: 'flex-start',
        }}>
          {/* Panel */}
          <div style={{ ...panelStyle, marginTop: 0 }}>
            {stepId === 'edition' && renderEditionStep()}
            {stepId === 'race' && renderRaceStep()}
            {stepId === 'class' && renderClassStep()}
            {stepId === 'background' && renderBackgroundStep()}
            {stepId === 'abilities' && (
              <AbilitiesStep
                method={method}
                setMethod={setMethod}
                stats={stats}
                setStats={setStats}
                asiBonus={asiBonus}
                classData={classData}
                raceData={raceData}
              />
            )}
            {stepId === 'skills' && renderSkillsStep()}
            {stepId === 'spells' && renderSpellsStep()}
            {stepId === 'equipment' && renderEquipmentStep()}
            {stepId === 'review' && renderReviewStep()}
          </div>

          {/* Live preview — sticky on the right */}
          <div data-testid="builder-live-preview" style={{
            position: 'sticky', top: 16,
            background: theme.bg.surface,
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 12,
            padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#EF4444', letterSpacing: 1 }}>
              LIVE PREVIEW
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.text.primary }}>
              {name || <span style={{ color: theme.text.muted, fontStyle: 'italic' }}>Unnamed Hero</span>}
            </div>
            <div style={{ fontSize: 12, color: theme.text.secondary }}>
              {(race || 'No race')} {subrace ? `(${subrace})` : ''} · {(className || 'No class')}{subclass ? ` (${subclass})` : ''}
            </div>
            <div style={{ fontSize: 11, color: theme.text.muted }}>
              {edition === '2024' ? '2024 Rules' : '2014 Rules'} · {background || 'No background'}
            </div>
            {/* Ability mods */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4,
              padding: 8, borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.20)',
            }}>
              {['STR','DEX','CON','INT','WIS','CHA'].map((ab, i) => {
                const key = ['strength','dexterity','constitution','intelligence','wisdom','charisma'][i];
                const score = (stats?.[key] || 10) + (floatingAsi?.[key] || 0);
                const mod = Math.floor((score - 10) / 2);
                return (
                  <div key={ab} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: theme.text.muted, fontWeight: 700 }}>{ab}</div>
                    <div style={{ fontSize: 14, color: theme.text.primary, fontWeight: 800 }}>{score}</div>
                    <div style={{ fontSize: 10, color: '#EF4444', fontWeight: 700 }}>{mod >= 0 ? `+${mod}` : mod}</div>
                  </div>
                );
              })}
            </div>
            {/* Skills count */}
            <div style={{ fontSize: 11, color: theme.text.secondary }}>
              <strong style={{ color: '#EF4444' }}>{(selectedSkills || []).length}</strong> skill{(selectedSkills || []).length === 1 ? '' : 's'} chosen
              {(selectedCantrips || []).length > 0 && (
                <> · <strong style={{ color: '#EF4444' }}>{selectedCantrips.length}</strong> cantrip{selectedCantrips.length === 1 ? '' : 's'}</>
              )}
              {(selectedSpells || []).length > 0 && (
                <> · <strong style={{ color: '#EF4444' }}>{selectedSpells.length}</strong> spell{selectedSpells.length === 1 ? '' : 's'}</>
              )}
            </div>
            {originFeat && (
              <div style={{ fontSize: 11, color: theme.text.secondary }}>
                <span style={{ color: theme.text.muted }}>Origin Feat:</span> <strong style={{ color: '#EF4444' }}>{originFeat}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
          <button
            type="button" onClick={goBack} disabled={step === 0}
            data-testid="builder-prev-btn"
            style={{
              padding: '12px 20px', borderRadius: '12px', cursor: step === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(239, 68, 68, 0.15)', border: `1px solid ${theme.border}`,
              color: theme.text.primary, opacity: step === 0 ? 0.4 : 1,
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px'
            }}>
            <ChevronLeft size={16} /> Previous
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button" onClick={goNext} disabled={!canAdvance()}
              data-testid="builder-next-btn"
              style={{
                padding: '12px 24px', borderRadius: '12px',
                cursor: canAdvance() ? 'pointer' : 'not-allowed',
                background: canAdvance() ? theme.sunset.gold : 'rgba(239, 68, 68, 0.15)',
                border: canAdvance() ? `1px solid ${theme.sunset.gold}` : `1px solid ${theme.border}`,
                color: canAdvance() ? theme.bg.primary : theme.text.muted,
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600,
                boxShadow: 'none'
              }}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button" onClick={handleSubmit}
              disabled={isSubmitting || !canAdvance()}
              data-testid="builder-submit-btn"
              style={{
                padding: '12px 28px', borderRadius: '12px', cursor: 'pointer',
                background: theme.sunset.gold,
                border: `1px solid ${theme.sunset.gold}`, color: theme.bg.primary,
                opacity: (isSubmitting || !canAdvance()) ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700,
                boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4)'
              }}>
              <Save size={16} /> {isSubmitting ? (isEditMode ? 'Saving...' : 'Forging...') : (isEditMode ? 'Save Changes' : 'Create Character')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function Stepper({ steps, current, onJump }) {
  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', padding: '4px 0' }}>
      {steps.map((s, i) => {
        const Icon = s.icon;
        const completed = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.id}>
            <button
              onClick={() => onJump(i)} type="button"
              data-testid={`step-${s.id}`}
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '20px',
                background: active ? theme.sunset.gold :
                  completed ? 'rgba(16, 185, 129, 0.15)' : theme.bg.surface,
                border: active ? `1px solid ${theme.sunset.gold}` :
                  completed ? '1px solid rgba(16, 185, 129, 0.3)' : `1px solid ${theme.border}`,
                color: active ? theme.bg.primary : completed ? '#10B981' : theme.text.muted,
                cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}>
              {completed ? <Check size={14} /> : <Icon size={14} />}
              <span>{i + 1}. {s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div style={{
                flex: '0 0 12px', height: '2px',
                background: completed ? 'rgba(16, 185, 129, 0.4)' : theme.border,
                borderRadius: '1px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle, color }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.4rem', margin: 0, color, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon size={20} /> {title}
      </h2>
      <p style={{ color: theme.text.muted, fontSize: '13px', margin: '4px 0 0 0' }}>{subtitle}</p>
    </div>
  );
}

function SelectCard({ active, onClick, color, title, subtitle, footer, ...rest }) {
  return (
    <button
      type="button" onClick={onClick} {...rest}
      style={{
        textAlign: 'left', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
        background: active ? theme.bg.elevated : theme.bg.surface,
        border: active ? `2px solid ${theme.sunset.gold}` : `1px solid ${theme.border}`,
        boxShadow: 'none',
        color: theme.text.primary, transition: 'all 0.2s ease',
        outline: 'none'
      }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', fontWeight: 700, marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: theme.text.secondary, lineHeight: 1.4 }}>{subtitle}</div>
      {footer}
    </button>
  );
}

function DetailPanel({ title, color, children }) {
  return (
    <div style={{
      marginTop: '16px', padding: '14px 16px', borderRadius: '12px',
      background: 'rgba(31, 31, 35, 0.65)', border: `1px solid ${theme.border}`,
      borderLeft: `3px solid ${color}`
    }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.95rem', color, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Eye size={14} /> {title}
      </div>
      {children}
    </div>
  );
}

function InfoBanner({ children }) {
  return (
    <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.text.secondary, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Info size={14} color={theme.sunset.pink} />
      {children}
    </div>
  );
}

function Pill({ icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', fontSize: '10px', color: theme.text.secondary, fontWeight: 500 }}>
      <span>{icon}</span>{children}
    </span>
  );
}

function PreviewStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.08)', border: `1px solid ${color}30` }}>
      <Icon size={14} color={color} />
      <div style={{ fontSize: '11px', color: theme.text.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '15px', color, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const traitChipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 8px', borderRadius: '6px',
  background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
  fontSize: '11px', color: theme.text.secondary
};
const detailHeaderStyle = {
  fontSize: '11px', color: theme.text.muted, marginBottom: '6px',
  letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600
};
