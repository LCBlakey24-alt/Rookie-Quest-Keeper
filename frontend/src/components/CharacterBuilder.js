import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  User, Sword, Shield, Sparkles, Dices, ChevronLeft, ChevronRight,
  Save, RotateCcw, BookOpen, Info, Check, Heart, Zap, Wand2,
  Scroll, Award, Languages, Backpack, Eye
} from "lucide-react";
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
import { RACES, CLASSES, BACKGROUNDS, EDITIONS } from "../data/characterRules5e";
import { API_BASE } from "../lib/api";

const DRAFT_KEY = "rq_character_builder_draft_v2";

// Theme
const theme = {
  bg: { primary: '#0F0A1E', surface: '#1A112E', elevated: '#2E1F45' },
  sunset: { purple: '#8A2BE2', pink: '#4DD0E1', gold: '#F59E0B' },
  text: { primary: '#F8FAFC', secondary: '#94A3B8', muted: '#64748B' },
  border: 'rgba(138, 43, 226, 0.3)',
  borderActive: 'rgba(138, 43, 226, 0.7)'
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

// Steps definition
const STEPS = [
  { id: 'edition', label: 'Edition', icon: BookOpen },
  { id: 'race', label: 'Race', icon: User },
  { id: 'class', label: 'Class', icon: Sword },
  { id: 'background', label: 'Background', icon: Scroll },
  { id: 'abilities', label: 'Abilities', icon: Dices },
  { id: 'skills', label: 'Skills', icon: Award },
  { id: 'review', label: 'Review', icon: Check }
];

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
  selectedSkills: []
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing character data in edit mode
  useEffect(() => {
    if (editMode && characterId) loadCharacterForEdit();
  }, [editMode, characterId]);

  const loadCharacterForEdit = async () => {
    try {
      setLoadingCharacter(true);
      const { data: char } = await axios.get(`${API_BASE}/characters/${characterId}`);
      setName(char.name || "");
      setRace(char.race || "");
      setSubrace(char.subrace || "");
      setClassName(char.character_class || "");
      setSubclass(char.subclass || "");
      setBackground(char.background || "");
      setPortrait(char.portrait_url || "");
      setAlignment(char.alignment || 'Neutral');
      setEdition(char.edition || "2014");
      setStats({
        strength: char.strength || 10, dexterity: char.dexterity || 10,
        constitution: char.constitution || 10, intelligence: char.intelligence || 10,
        wisdom: char.wisdom || 10, charisma: char.charisma || 10
      });
      setSelectedSkills(char.skill_proficiencies || []);
      setMethod("manual");
    } catch (error) {
      toast.error("Failed to load character for editing");
      navigate("/home");
    } finally {
      setLoadingCharacter(false);
    }
  };

  const raceData = RACES[race] || null;
  const availableSubraces = raceData?.subraces ? Object.keys(raceData.subraces) : [];
  const classData = CLASSES[className] || null;
  const availableSubclasses = classData?.subclasses || [];
  const backgroundData = BACKGROUNDS[background] || null;

  // Reset subrace if not available for chosen race
  useEffect(() => {
    if (race && availableSubraces.length === 0) setSubrace("");
    if (race && subrace && !availableSubraces.includes(subrace)) setSubrace("");
  }, [race, availableSubraces.length]);

  // ASI calculation
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
    } else if (edition === "2024" && backgroundData?.asi2024) {
      Object.entries(backgroundData.asi2024).forEach(([s, v]) => { if (bonus[s] !== undefined) bonus[s] = v; });
    }
    return bonus;
  }, [edition, raceData, backgroundData, subrace]);

  // Auto-save draft
  useEffect(() => {
    const draft = { step, name, race, subrace, className, subclass, background, portrait, alignment, method, edition, stats, selectedSkills };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [step, name, race, subrace, className, subclass, background, portrait, alignment, method, edition, stats, selectedSkills]);

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

  const setMethodAndStats = (nextMethod) => {
    setMethod(nextMethod);
    if (nextMethod === "standard") {
      const assigned = {};
      ABILITIES.forEach((a, i) => { assigned[a] = STANDARD_ARRAY[i]; });
      setStats(assigned);
    } else if (nextMethod === "point") {
      setStats(ABILITIES.reduce((acc, a) => ({ ...acc, [a]: 8 }), {}));
    } else if (nextMethod === "roll") {
      const rolled = {};
      ABILITIES.forEach((a) => {
        const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
        dice.sort((x, y) => y - x);
        rolled[a] = dice[0] + dice[1] + dice[2];
      });
      setStats(rolled);
    }
  };

  const handleStatChange = (a, v) => {
    setStats(prev => ({ ...prev, [a]: clampScore(v) }));
  };

  const handleAssignedScoreChange = (ability, nextValue) => {
    const value = Number(nextValue);
    setStats(prev => {
      const swappedAbility = ABILITIES.find(a => a !== ability && Number(prev[a]) === value);
      if (!swappedAbility) return { ...prev, [ability]: value };
      return {
        ...prev,
        [ability]: value,
        [swappedAbility]: prev[ability]
      };
    });
  };

  // Step validation
  const canAdvance = () => {
    const id = STEPS[step].id;
    if (id === 'edition') return !!edition;
    if (id === 'race') return !!race && (availableSubraces.length === 0 || !!subrace);
    if (id === 'class') return !!className;
    if (id === 'background') return !!background;
    if (id === 'abilities') {
      if (!validateAbilityScores(stats)) return false;
      if (method === 'point' && pointBuyRemaining !== 0) return false;
      return true;
    }
    if (id === 'skills') return selectedSkills.length === classSkillCount;
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
    toast.success('Draft cleared');
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter a character name'); return; }
    if (!validateAbilityScores(stats)) { toast.error(`Scores must be ${MIN_ABILITY_SCORE}-${MAX_ABILITY_SCORE}`); return; }

    const finalScores = isEditMode ? stats : finalStats;

    // Build proficiencies from class + background
    const allSkills = Array.from(new Set([...(backgroundSkills || []), ...selectedSkills]));
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

    const payload = {
      name: name.trim(),
      race,
      subrace: subrace || "",
      character_class: className,
      subclass: subclass || "",
      background: background || "",
      edition,
      alignment,
      strength: Number(finalScores.strength),
      dexterity: Number(finalScores.dexterity),
      constitution: Number(finalScores.constitution),
      intelligence: Number(finalScores.intelligence),
      wisdom: Number(finalScores.wisdom),
      charisma: Number(finalScores.charisma),
      portrait_url: portrait || ""
    };

    if (!isEditMode) {
      payload.level = 1;
      payload.max_hit_points = derivedHp;
      payload.skill_proficiencies = allSkills;
      payload.saving_throw_proficiencies = classData?.savingThrows || [];
      payload.armor_proficiencies = classData?.armorProficiencies || [];
      payload.weapon_proficiencies = classData?.weaponProficiencies || [];
      payload.tool_proficiencies = tools;
      payload.languages = baseLanguages;
      payload.racial_traits = [...racialTraits, ...subraceTraits];
      payload.class_features = classFeatures;
      payload.speed = raceData?.speed || 30;
    }

    try {
      setIsSubmitting(true);
      if (isEditMode && characterId) {
        const updatePayload = { ...payload };
        if (selectedSkills.length || backgroundSkills.length) {
          updatePayload.skill_proficiencies = allSkills;
        }
        await axios.patch(`${API_BASE}/characters/${characterId}`, updatePayload);
        toast.success("Character updated!");
        navigate(`/characters/${characterId}`);
      } else {
        const response = await axios.post(`${API_BASE}/characters`, payload);
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
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, rgba(138, 43, 226, 0.18) 0%, transparent 50%), linear-gradient(180deg, #0B0518 0%, #0F0A1E 100%)',
    padding: '24px',
    color: theme.text.primary
  };
  const containerStyle = { maxWidth: '1100px', margin: '0 auto' };
  const panelStyle = {
    background: 'rgba(26, 17, 46, 0.7)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${theme.border}`,
    borderRadius: '20px',
    padding: '28px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  };
  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'rgba(15, 10, 30, 0.6)', border: `1px solid ${theme.border}`,
    borderRadius: '10px', color: theme.text.primary, fontSize: '15px', outline: 'none'
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
    </div>
  );

  const renderRaceStep = () => (
    <div>
      <StepHeader icon={User} title="Choose Your Race" subtitle="Your ancestry shapes your traits and abilities" color={theme.sunset.pink} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(RACES).map(([key, r]) => (
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
    </div>
  );

  const renderClassStep = () => (
    <div>
      <StepHeader icon={Sword} title="Choose Your Class" subtitle="Your class defines your role and abilities" color={theme.sunset.purple} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(CLASSES).map(([key, c]) => (
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
          <label style={labelStyle}>Subclass <span style={{ color: theme.text.muted, textTransform: 'none' }}>(optional now — typically chosen at level 3)</span></label>
          <select value={subclass} onChange={e => setSubclass(e.target.value)} style={inputStyle} data-testid="subclass-select">
            <option value="">Select later</option>
            {availableSubclasses.map(sc => <option key={sc} value={sc}>{sc}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  const renderBackgroundStep = () => (
    <div>
      <StepHeader icon={Scroll} title="Choose Your Background" subtitle="Your past life shapes your skills and gear" color={theme.sunset.gold} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {Object.entries(BACKGROUNDS).map(([key, b]) => (
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
    </div>
  );

  const renderAbilitiesStep = () => (
    <div>
      <StepHeader icon={Dices} title="Set Ability Scores" subtitle="Pick a method and assign your scores" color={theme.sunset.purple} />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'standard', label: 'Standard Array', desc: '15, 14, 13, 12, 10, 8' },
          { key: 'point', label: 'Point Buy', desc: `${POINT_BUY_TOTAL} points to spend` },
          { key: 'roll', label: 'Roll 4d6', desc: 'Drop lowest, randomized' }
        ].map(m => (
          <button
            key={m.key} type="button" onClick={() => setMethodAndStats(m.key)}
            data-testid={`method-${m.key}`}
            style={{
              flex: 1, minWidth: '160px', padding: '10px 12px',
              background: method === m.key ? 'linear-gradient(135deg, #8A2BE2, #4DD0E1)' : 'rgba(138, 43, 226, 0.08)',
              border: method === m.key ? 'none' : `1px solid ${theme.border}`,
              borderRadius: '10px', color: theme.text.primary, cursor: 'pointer',
              textAlign: 'left', transition: 'all 0.2s'
            }}>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>{m.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.85 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {method === 'point' && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '10px',
          background: pointBuyRemaining === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: pointBuyRemaining === 0 ? '#10B981' : '#F59E0B', fontWeight: 600, fontSize: '14px'
        }}>
          Points: {pointBuySpent} / {POINT_BUY_TOTAL} ({pointBuyRemaining} remaining)
        </div>
      )}

      {method === 'roll' && (
        <button type="button" onClick={() => setMethodAndStats('roll')}
          style={{ marginBottom: '16px', padding: '8px 14px', background: 'rgba(138, 43, 226, 0.2)',
            border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.text.primary,
            cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Dices size={14} /> Re-roll All
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {ABILITIES.map(ability => {
          const base = stats[ability] || 10;
          const bonus = asiBonus[ability] || 0;
          const final = Number(base) + bonus;
          const mod = Math.floor((final - 10) / 2);
          const isPrimary = classData?.primaryAbility === ability;
          return (
            <div key={ability} style={{
              ...abilityCardStyle,
              border: isPrimary ? `2px solid ${theme.sunset.gold}` : `1px solid ${theme.border}`,
              boxShadow: isPrimary ? '0 0 0 2px rgba(245, 158, 11, 0.15)' : 'none'
            }}>
              <div style={{ fontSize: '11px', color: isPrimary ? theme.sunset.gold : theme.text.muted, marginBottom: '6px', letterSpacing: '1px', fontWeight: 600 }}>
                {formatAbility(ability)} {isPrimary && '★'}
              </div>
              <input
                type="number" min={MIN_ABILITY_SCORE} max={MAX_ABILITY_SCORE}
                value={base} disabled={method === 'standard' || method === 'roll'}
                onChange={e => handleStatChange(ability, e.target.value)}
                data-testid={`ability-${ability}`}
                style={{
                  width: '70px', padding: '8px',
                  background: 'rgba(15, 10, 30, 0.8)', border: `1px solid ${theme.border}`,
                  borderRadius: '8px', color: theme.text.primary, fontSize: '20px',
                  fontWeight: 'bold', textAlign: 'center', outline: 'none',
                  display: method === 'point' ? 'block' : 'none'
                }} />
              {(method === 'standard' || method === 'roll') && (
                <select
                  value={base}
                  onChange={e => handleAssignedScoreChange(ability, e.target.value)}
                  data-testid={`ability-assign-${ability}`}
                  style={{
                    width: '84px', padding: '8px',
                    background: 'rgba(15, 10, 30, 0.8)', border: `1px solid ${theme.border}`,
                    borderRadius: '8px', color: theme.text.primary, fontSize: '18px',
                    fontWeight: 'bold', textAlign: 'center', outline: 'none'
                  }}
                >
                  {Array.from(new Set(ABILITIES.map(a => Number(stats[a])))).sort((a, b) => b - a).map(score => (
                    <option key={score} value={score}>{score}</option>
                  ))}
                </select>
              )}
              {bonus !== 0 && (
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                  + {bonus} = {final}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 700, color: mod >= 0 ? theme.sunset.gold : '#EF4444' }}>
                {formatModifier(mod)}
              </div>
            </div>
          );
        })}
      </div>

      {className && (
        <div style={{ marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'rgba(15, 10, 30, 0.5)', border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: '12px', color: theme.text.muted, marginBottom: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>Level 1 Combat Preview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
            <PreviewStat icon={Heart} label="HP" value={derivedHp} color="#EF4444" />
            <PreviewStat icon={Shield} label="AC" value={derivedAc} color={theme.sunset.purple} />
            <PreviewStat icon={Zap} label="Init" value={formatModifier(dexMod)} color={theme.sunset.pink} />
            <PreviewStat icon={User} label="Speed" value={`${raceData?.speed || 30}ft`} color={theme.sunset.gold} />
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
                background: fromBg ? 'rgba(245, 158, 11, 0.12)' : selected ? 'rgba(138, 43, 226, 0.15)' : 'rgba(15, 10, 30, 0.5)',
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
    </div>
  );

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
        <label style={labelStyle}>Portrait URL (optional)</label>
        <input
          type="url" value={portrait} onChange={e => setPortrait(e.target.value)}
          placeholder="https://..." style={inputStyle} data-testid="portrait-input"
        />
      </div>

      {/* Summary card */}
      <div style={{ ...panelStyle, padding: '20px', background: 'rgba(15, 10, 30, 0.7)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
          {portrait ? (
            <img src={portrait} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${theme.sunset.purple}` }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #8A2BE2, #4DD0E1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <div key={a} style={{ textAlign: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(138, 43, 226, 0.08)' }}>
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
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.4rem', margin: 0, background: 'linear-gradient(135deg, #8A2BE2, #4DD0E1, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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

        {/* Panel */}
        <div style={{ ...panelStyle, marginTop: '16px' }}>
          {stepId === 'edition' && renderEditionStep()}
          {stepId === 'race' && renderRaceStep()}
          {stepId === 'class' && renderClassStep()}
          {stepId === 'background' && renderBackgroundStep()}
          {stepId === 'abilities' && renderAbilitiesStep()}
          {stepId === 'skills' && renderSkillsStep()}
          {stepId === 'review' && renderReviewStep()}
        </div>

        {/* Nav buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '20px' }}>
          <button
            type="button" onClick={goBack} disabled={step === 0}
            data-testid="builder-prev-btn"
            style={{
              padding: '12px 20px', borderRadius: '12px', cursor: step === 0 ? 'not-allowed' : 'pointer',
              background: 'rgba(138, 43, 226, 0.15)', border: `1px solid ${theme.border}`,
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
                background: canAdvance() ? 'linear-gradient(135deg, #8A2BE2, #4DD0E1)' : 'rgba(138, 43, 226, 0.2)',
                border: 'none', color: '#fff', opacity: canAdvance() ? 1 : 0.5,
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600,
                boxShadow: canAdvance() ? '0 4px 16px rgba(138, 43, 226, 0.4)' : 'none'
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
                background: 'linear-gradient(135deg, #8A2BE2 0%, #4DD0E1 50%, #F59E0B 100%)',
                border: 'none', color: '#fff',
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
                background: active ? 'linear-gradient(135deg, #8A2BE2, #4DD0E1)' :
                  completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(138, 43, 226, 0.08)',
                border: active ? 'none' :
                  completed ? '1px solid rgba(16, 185, 129, 0.3)' : `1px solid ${theme.border}`,
                color: active ? '#fff' : completed ? '#10B981' : theme.text.muted,
                cursor: 'pointer', fontSize: '12px', fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}>
              {completed ? <Check size={14} /> : <Icon size={14} />}
              <span>{i + 1}. {s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div style={{
                flex: '0 0 12px', height: '2px',
                background: completed ? 'rgba(16, 185, 129, 0.4)' : 'rgba(138, 43, 226, 0.15)',
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
        background: active ? `linear-gradient(135deg, ${color}30, ${color}10)` : 'rgba(15, 10, 30, 0.5)',
        border: active ? `2px solid ${color}` : `1px solid ${theme.border}`,
        boxShadow: active ? `0 0 0 3px ${color}15, 0 4px 16px rgba(0,0,0,0.3)` : 'none',
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
      background: 'rgba(15, 10, 30, 0.65)', border: `1px solid ${theme.border}`,
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
    <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(77, 208, 225, 0.08)', border: '1px solid rgba(77, 208, 225, 0.2)', color: theme.text.secondary, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Info size={14} color={theme.sunset.pink} />
      {children}
    </div>
  );
}

function Pill({ icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(138, 43, 226, 0.15)', fontSize: '10px', color: theme.text.secondary, fontWeight: 500 }}>
      <span>{icon}</span>{children}
    </span>
  );
}

function PreviewStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(138, 43, 226, 0.08)', border: `1px solid ${color}30` }}>
      <Icon size={14} color={color} />
      <div style={{ fontSize: '11px', color: theme.text.muted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '15px', color, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const traitChipStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  padding: '4px 8px', borderRadius: '6px',
  background: 'rgba(138, 43, 226, 0.12)', border: '1px solid rgba(138, 43, 226, 0.25)',
  fontSize: '11px', color: theme.text.secondary
};
const detailHeaderStyle = {
  fontSize: '11px', color: theme.text.muted, marginBottom: '6px',
  letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600
};
const abilityCardStyle = {
  background: 'rgba(15, 10, 30, 0.5)',
  border: `1px solid ${theme.border}`,
  borderRadius: '10px', padding: '12px', textAlign: 'center'
};
