import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Settings, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import CleanCombatTab from '@/components/clean-sheet/CleanCombatTab';
import CleanSheetFeaturesTab from '@/components/clean-sheet/CleanSheetFeaturesTab';
import CleanSpellsTab from '@/components/clean-sheet/CleanSpellsTab';
// After the clean-sheet tabs, as on the classic sheet, so both chunks load their styles in one order.
import DiceRollFlicker from '@/components/DiceRollFlicker';
import { buildClassFeatureSummary, buildProficiencySummary, groupByActionEconomy, rulesEditionOf } from '@/components/clean-sheet/sheetFeatureSummary';
import { deriveArmorClass, deriveWalkingSpeed } from '@/data/characterCombatDerivations';
import LevelUpWizard from '@/components/LevelUpWizard';
import LevelUpReveal from '@/components/level-up-grant/LevelUpReveal';
import { createCharacterSaveQueue } from '@/data/characterSaveQueue';
import { rollDiceNotation, rollDie as rollOneDie } from '@/data/diceRoller';
import { buildLongRestUpdates, buildShortRestUpdates } from '@/data/characterRestRules';
import { rollD20 } from '@/components/clean-sheet/cleanSheetUtils';
import { getConcentrationName, getConcentrationSaveDc, getConcentrationSaveModifier, needsConcentrationReplacement } from '@/data/characterConcentrationRules';

import HexLoader from '@/components/guild-motif/HexLoader';
import HexEquipment from './HexEquipment';
import HexHpDial from './HexHpDial';
import HexRecovery from './HexRecovery';
import { deathSavePipUpdates, deathSaveResultStyle, deathSaveUpdates, hitDieBlocker, hitDieUpdates, recoveryState } from './recoveryModel';
import HexPortrait from './HexPortrait';
import HexSkillDial from './HexSkillDial';
import HexSpinWheel from './HexSpinWheel';
import HexWheel from './HexWheel';
import GuildChoiceWheel from '@/components/guild-motif/GuildChoiceWheel';
import HexMagicView from './HexMagicView';
import HexTraitsView from './HexTraitsView';
import { spellDiceEntry } from '@/components/clean-sheet/SpellRollRow';
import { SLOT } from './hexGeometry';
import { HEX_THEMES, getHexTheme, loadHexThemeId, saveHexThemeId } from './hexThemes';
import { abilityRows, formatModifier, identityLines, portraitUrlFor, proficiencyBonusFor, vitalsFor } from './hexSheetModel';
import './hexSheet.css';

/** Main wheel, laid out as in the hand-drawn reference. */
export const MAIN_SECTIONS = [
  { id: 'core', label: 'Core Abilities', slot: SLOT.UPPER_LEFT },
  { id: 'skills', label: 'Skills', slot: SLOT.UPPER_RIGHT },
  { id: 'equipment', label: 'Equipment', slot: SLOT.LEFT },
  { id: 'magic', label: 'Magic', slot: SLOT.RIGHT },
  { id: 'traits', label: 'Traits & Feats', slot: SLOT.LOWER_LEFT },
  { id: 'combat', label: 'Combat', slot: SLOT.LOWER_RIGHT },
];

/** Abilities read clockwise from the upper-left edge. */
export const ABILITY_SLOTS = {
  strength: SLOT.UPPER_LEFT,
  dexterity: SLOT.UPPER_RIGHT,
  constitution: SLOT.RIGHT,
  intelligence: SLOT.LOWER_RIGHT,
  wisdom: SLOT.LOWER_LEFT,
  charisma: SLOT.LEFT,
};

/**
 * Combat wheel: three wedges, Actions, Bonus Actions and Reactions. Spin
 * one to the top (or tap it) and everything the character can do with it
 * is listed below the wheel: attacks, spells, features, items and the
 * standard actions, from the classic sheet's own combat rules. Features
 * that use none of the three ("other") are listed with Actions.
 */
export const COMBAT_GROUPS = [
  { id: 'action', label: 'Actions', sections: ['action', 'other'] },
  { id: 'bonus', label: 'Bonus Actions', short: 'Bonus', sections: ['bonus'] },
  { id: 'reaction', label: 'Reactions', sections: ['reaction'] },
];

/** The dice on the dice wheel, in the order they sit round the ring. */
export const DICE_CHOICES = [4, 6, 8, 10, 12, 20, 100];
/** The most dice of one size rolled together from the wheel. */
export const MAX_DICE = 10;

const SECTION_TITLES = Object.fromEntries(MAIN_SECTIONS.map((section) => [section.id, section.label]));
const VIEW_TITLES = { main: 'Character', core: 'Core Abilities', dice: 'Dice', hp: 'Hit Points', death: 'Death Saves', ...SECTION_TITLES };

function viewTitle(entry, rows) {
  if (entry.view === 'roll') return rows.find((row) => row.key === entry.ability)?.name || 'Roll';
  if (entry.view === 'combat' && entry.group) return COMBAT_GROUPS.find((group) => group.id === entry.group)?.label || 'Combat';
  return VIEW_TITLES[entry.view] || 'Character';
}

/**
 * The hexagonal character sheet (preview).
 *
 * The character sheet at /characters/:id (the classic sheet is at /classic). It changes nothing
 * about it. It reads the same character record, computes every number with
 * the classic sheet's helpers, and rolls through the same dice tray, so a
 * roll made here is recorded exactly as one made there.
 *
 * Navigation is a stack: each wheel or choice pushes an entry, Back pops
 * one. The sheet never leaves the page to change section.
 */
export default function HexCharacterSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  // The sheet's latest character, for an Undo pressed after the view that
  // offered it has closed (its own copy stops updating then).
  const latestCharacterRef = useRef(null);
  latestCharacterRef.current = character;
  const latestCharacter = useCallback(() => latestCharacterRef.current, []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stack, setStack] = useState([{ view: 'main' }]);
  const [rollBurst, setRollBurst] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showLevelReveal, setShowLevelReveal] = useState(false);
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  const [themeId, setThemeId] = useState(loadHexThemeId);
  const themeVars = getHexTheme(themeId).vars;
  const settingsRef = useRef(null);

  // The settings menu closes on a tap anywhere else or Escape; it stays open
  // while choosing a theme so the player can compare several.
  useEffect(() => {
    if (!showSettings) return undefined;
    const onPointer = (event) => {
      if (!settingsRef.current?.contains(event.target)) setShowSettings(false);
    };
    const onKey = (event) => { if (event.key === 'Escape') setShowSettings(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [showSettings]);

  const chooseTheme = (id) => {
    setThemeId(id);
    saveHexThemeId(id);
  };
  const rollCounter = useRef(0);
  const choiceRef = useRef(null);

  const queueRef = useRef(null);
  if (!queueRef.current) {
    queueRef.current = createCharacterSaveQueue({
      publish: setCharacter,
      patchRequest: (id, updates) => apiClient.patch(`/characters/${id}`, updates),
      onSuccess: (message) => toast.success(message),
      onError: (error, options) => toast.error(error?.formattedDetail || error?.response?.data?.detail || options.error || 'Could not save character update'),
    });
  }

  useEffect(() => {
    let cancelled = false;
    queueRef.current.reset(characterId, null);
    (async () => {
      try {
        setLoading(true);
        setLoadError('');
        await queueRef.current.whenIdle(characterId);
        if (cancelled) return;
        const response = await apiClient.get(`/characters/${characterId}`);
        if (!cancelled) queueRef.current.reset(characterId, response.data);
      } catch (error) {
        if (!cancelled) setLoadError(error?.formattedDetail || error?.response?.data?.detail || 'This character could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      queueRef.current.invalidate();
    };
  }, [characterId]);

  const rows = useMemo(() => abilityRows(character), [character]);
  const vitals = useMemo(() => vitalsFor(character), [character]);
  const identity = useMemo(() => identityLines(character), [character]);
  const current = stack[stack.length - 1];

  useEffect(() => {
    if (current.view === 'roll') choiceRef.current?.querySelector('button')?.focus();
  }, [current]);

  const push = (entry) => setStack((previous) => [...previous, entry]);
  const back = () => setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous));

  const present = (burst) => {
    rollCounter.current += 1;
    setRollBurst({ ...burst, rollId: `${characterId}-hex-${Date.now()}-${rollCounter.current}` });
  };

  /** A d20 roll with a modifier, exactly as the classic sheet makes one. */
  const rollCheck = (label, modifier) => {
    const result = rollD20(Number(modifier) || 0, { mode: 'normal', label });
    present({ label, rolls: result.rolls, modifier: result.modifier, total: result.total, d20: result.d20, sides: 20 });
    // Attacks read the natural d20 back to spot a 1 or a critical hit.
    return result;
  };

  /** Roll `count` dice of one size together, e.g. 3d6, through the tray. */
  const rollDie = (sides, count = 1) => {
    const notation = `${count}d${sides}`;
    const result = rollDiceNotation(notation);
    if (!result.valid || !result.rolls.length) {
      toast.error(`Could not roll ${count > 1 ? notation : `a d${sides}`}`);
      return;
    }
    const kept = result.rolls.find((roll) => !roll.dropped) || result.rolls[0];
    // A natural 20 or 1 only means something on a single d20.
    const single20 = sides === 20 && count === 1;
    present({ label: count > 1 ? notation : `d${sides}`, rolls: result.rolls, modifier: result.modifier, total: result.total, d20: single20 ? kept.result : null, sides });
  };

  const openDice = () => push({ view: 'dice' });
  const [manageSpells, setManageSpells] = useState(false);
  const [traitDetails, setTraitDetails] = useState(false);
  const rollSpellDice = (request) => {
    const entry = spellDiceEntry(request);
    if (!entry) { toast.error(`Could not roll ${request.notation}`); return; }
    present(entry);
  };
  const [diceChoice, setDiceChoice] = useState(20);
  const [diceCount, setDiceCount] = useState(1);
  const diceNotation = `${diceCount}d${diceChoice}`;

  /**
   * Save an HP dial change through the same queue as the classic sheet.
   * Resolves true only once the server has accepted it.
   */
  const confirmHp = async (target, delta, adjustment) => {
    // A rest is replacing HP on the server; a dial save worked out from the
    // HP before the rest would undo it when it lands.
    if (recovering) {
      toast.info('Finishing the rest first. Try again in a moment.');
      return false;
    }
    const saved = await queueRef.current.patch(adjustment.updates, {
      error: target === 'temp' ? 'Could not save temporary HP' : 'Could not save HP',
    });
    if (!saved) return false;
    const { result } = adjustment;
    toast.success(target === 'temp'
      ? `Temporary HP is now ${result.tempHp}`
      : `Hit points ${result.currentHp} / ${result.maxHp}${result.tempHp ? ` (+${result.tempHp} temp)` : ''}`);
    const concentratingOn = getConcentrationName(character?.concentrating_on || character?.concentration);
    if (adjustment.damage > 0 && concentratingOn) {
      const dc = getConcentrationSaveDc(adjustment.damage);
      const modifier = getConcentrationSaveModifier(character, proficiencyBonusFor(character));
      toast.warning(`You took ${adjustment.damage} damage — concentration check`, {
        description: `Concentrating on ${concentratingOn}. Make a Constitution save, DC ${dc}.`,
        duration: 12000,
        action: { label: 'Roll CON Save', onClick: () => rollCheck(`Concentration Save DC ${dc}`, modifier) },
      });
    }
    return true;
  };
  // Rests, Hit Dice and death saves (under the hit-point dial), with the
  // classic sheet's rules: rests go through the server's rest routes.
  const [recovering, setRecovering] = useState(false);
  const rest = async (type) => {
    if (!character || recovering) return;
    setRecovering(true);
    const endpoint = type === 'long' ? 'long-rest' : 'short-rest';
    try {
      await queueRef.current.runServerAction(async (id, confirmed) => {
        try {
          return await apiClient.post(`/characters/${id}/${endpoint}`);
        } catch (error) {
          // Fall back only when an older backend lacks the route; retrying
          // after a timeout or 500 could apply the rest twice.
          const status = error?.response?.status;
          if (status !== 404 && status !== 405) throw error;
          return apiClient.patch(`/characters/${id}`, type === 'long' ? buildLongRestUpdates(confirmed) : buildShortRestUpdates(confirmed));
        }
      }, {
        success: type === 'long' ? 'Long rest completed' : 'Short rest completed',
        error: `Could not apply ${type} rest`,
      });
    } finally {
      setRecovering(false);
    }
  };
  const spendHitDie = async () => {
    if (!character || recovering) return;
    const state = recoveryState(character);
    const blocker = hitDieBlocker(state);
    if (blocker) {
      toast.error(blocker);
      return;
    }
    const die = rollOneDie(state.hitDieSides);
    const spend = hitDieUpdates(state, die);
    present({ label: `Hit Die d${state.hitDieSides}`, rolls: [{ sides: state.hitDieSides, result: die }], modifier: state.conMod, total: spend.total, d20: null, sides: state.hitDieSides });
    setRecovering(true);
    await queueRef.current.patch(spend.updates, { success: `Recovered ${spend.healed} HP`, error: 'Could not spend the Hit Die' });
    setRecovering(false);
  };
  const rollDeathSave = async () => {
    if (!character || recovering) return;
    // A pass shows green in the dice tray and a fail red, captioned instead
    // of the meaningless "d20 + 0" sum.
    const result = rollD20(0, { mode: 'normal', label: 'Death Save' });
    const style = deathSaveResultStyle(result.d20);
    present({ label: 'Death Save', rolls: result.rolls, modifier: 0, total: result.total, d20: result.d20, sides: 20, tone: style.tone, caption: style.caption });
    const outcome = deathSaveUpdates(recoveryState(character), result.d20);
    setRecovering(true);
    await queueRef.current.patch(outcome.updates, { success: outcome.message, error: 'Could not save the death save' });
    setRecovering(false);
  };

  // Arriving from a GM-granted "Level up now" (?levelup=1) opens the wizard
  // once the sheet has loaded, then drops the flag from the address.
  const wantsLevelUp = new URLSearchParams(location.search).get('levelup') === '1';
  // A level up the GM granted and the player has not taken yet.
  const levelUpReady = Number(character?.level_up_grant?.to_level || 0) > Number(character?.level || 1);
  // A granted level starts with the D20 reveal; levelling without a grant
  // goes straight to the choices.
  const startLevelUp = () => (levelUpReady ? setShowLevelReveal(true) : setShowLevelUp(true));
  useEffect(() => {
    if (!wantsLevelUp || !character) return;
    if (Number(character?.level_up_grant?.to_level || 0) > Number(character?.level || 1)) setShowLevelReveal(true);
    else setShowLevelUp(true);
    navigate(location.pathname, { replace: true });
  }, [wantsLevelUp, character, navigate, location.pathname]);

  // Starting concentration on a second spell ends the first, so ask first,
  // exactly as the classic sheet does.
  const patchWithConcentrationGuard = async (updates, options = {}) => {
    const current = character?.concentrating_on || character?.concentration || null;
    const next = updates?.concentrating_on ?? updates?.concentration;
    if (!needsConcentrationReplacement(current, next)) return queueRef.current.patch(updates, options);
    const nextName = getConcentrationName(next);
    const currentName = getConcentrationName(current) || 'your current spell';
    // Toast actions can outlive this sheet; bind the choice to this character.
    const session = queueRef.current.getSession();
    toast.warning(`Already concentrating on ${currentName}`, {
      description: `Starting concentration on ${nextName} will end ${currentName}.`,
      duration: 10000,
      action: {
        label: `Switch to ${nextName}`,
        onClick: () => queueRef.current.patchForSession(session, updates, { ...options, success: `Concentrating on ${nextName}` }),
      },
      cancel: { label: `Keep ${currentName}`, onClick: () => {} },
    });
    return false;
  };

  // The Traits list is the classic sheet's Features tab, fed the same derived data.
  const featureProps = useMemo(() => {
    const rulesEdition = rulesEditionOf(character);
    const classFeatureSummary = character ? buildClassFeatureSummary(character, rulesEdition) : [];
    return {
      rulesEdition,
      classFeatureSummary,
      actionEconomyGroups: groupByActionEconomy(classFeatureSummary),
      proficiencySummary: buildProficiencySummary(character),
    };
  }, [character]);

  const centreDice = { label: 'D20', icon: 'd20', ariaLabel: 'Open the dice wheel', onSelect: openDice };

  let wheel;
  if (current.view === 'main') {
    wheel = (
      <HexWheel
        viewKey="main"
        label="Character sections"
        wedges={MAIN_SECTIONS.map((section) => ({
          ...section,
          ariaLabel: `Open ${section.label}`,
          onSelect: () => push(section.id === 'combat' ? { view: 'combat', group: 'action' } : { view: section.id }),
        }))}
        centre={centreDice}
      />
    );
  } else if (current.view === 'core' || current.view === 'roll') {
    wheel = (
      <HexWheel
        variant="stat"
        viewKey="core"
        label="Core abilities"
        wedges={rows.map((row) => ({
          id: row.key,
          slot: ABILITY_SLOTS[row.key],
          label: row.name,
          edgeLabel: row.name,
          value: formatModifier(row.check),
          active: current.view === 'roll' && current.ability === row.key,
          ariaLabel: `${row.name}: check ${formatModifier(row.check)}, saving throw ${formatModifier(row.save)}${row.saveProficient ? ' (proficient)' : ''}. Choose a roll.`,
          onSelect: () => (current.view === 'roll'
            ? setStack((previous) => [...previous.slice(0, -1), { view: 'roll', ability: row.key }])
            : push({ view: 'roll', ability: row.key })),
        }))}
        centre={centreDice}
      />
    );
  } else if (current.view === 'combat') {
    wheel = (
      <HexSpinWheel
        label="Combat: spin a wedge to the top"
        sectors={COMBAT_GROUPS}
        value={current.group}
        onChange={(group) => setStack((previous) => [...previous.slice(0, -1), { view: 'combat', group }])}
        centre={centreDice}
      />
    );
  } else if (current.view === 'skills') {
    wheel = character ? <HexSkillDial character={character} proficiencyBonus={proficiencyBonusFor(character)} onRoll={rollCheck} /> : null;
  } else if (current.view === 'equipment') {
    wheel = character ? (
      <HexEquipment
        character={character}
        proficiencyBonus={proficiencyBonusFor(character)}
        onRoll={rollCheck}
        onPresent={(burst) => present(burst)}
        onSave={(updates, options) => queueRef.current.patch(updates, options)}
      />
    ) : null;
  } else if (current.view === 'death' && character) {
    // Death saves on the sheet's own wheel: passes on the right and fails on
    // the left, each filling from the top wedge down; the centre rolls.
    const state = recoveryState(character);
    const tap = (type, index) => {
      if (recovering) return;
      queueRef.current.patch(deathSavePipUpdates(state, type, index), { error: 'Could not update death saves' });
    };
    const wedge = (type, index, slot) => {
      const count = type === 'success' ? state.successes : state.failures;
      const marked = count >= index;
      const word = type === 'success' ? 'Pass' : 'Fail';
      return {
        id: `death-${type}-${index}`,
        slot,
        label: word,
        edgeLabel: word,
        value: marked ? (type === 'success' ? '✓' : '✗') : String(index),
        className: `hex-death-wedge hex-death-wedge--${type}${marked ? ' is-marked' : ''}`,
        pressed: marked,
        ariaLabel: `${word} ${index} of 3${marked ? ', marked' : ''}`,
        disabled: recovering,
        onSelect: () => tap(type, index),
      };
    };
    wheel = (
      <HexWheel
        viewKey="death"
        variant="stat"
        label="Death saves"
        wedges={[
          wedge('success', 1, SLOT.UPPER_RIGHT),
          wedge('success', 2, SLOT.RIGHT),
          wedge('success', 3, SLOT.LOWER_RIGHT),
          wedge('failure', 1, SLOT.UPPER_LEFT),
          wedge('failure', 2, SLOT.LEFT),
          wedge('failure', 3, SLOT.LOWER_LEFT),
        ]}
        centre={{
          label: 'Roll',
          sublabel: 'DEATH SAVE',
          ariaLabel: 'Roll a death save',
          onSelect: () => { if (!(state.dead || state.stable || state.currentHp > 0)) rollDeathSave(); },
        }}
      />
    );
  } else if (current.view === 'hp') {
    wheel = <HexHpDial character={character} initialTarget={current.target || 'hp'} onConfirm={confirmHp} onCancel={back} />;
  } else if (current.view === 'dice') {
    // Turn the die you want to the top, then press the centre to roll it.
    wheel = (
      <GuildChoiceWheel
        label="Dice"
        caption="DICE"
        options={DICE_CHOICES.map((sides) => ({ id: `d${sides}`, label: `d${sides}`, short: `D${sides}` }))}
        value={`d${diceChoice}`}
        onChange={(id) => setDiceChoice(Number(id.slice(1)))}
        centreText={diceCount > 1 ? `${diceCount}D${diceChoice}` : `D${diceChoice}`}
        onConfirm={() => rollDie(diceChoice, diceCount)}
        confirmLabel="ROLL"
        confirmAria={diceCount > 1 ? `Roll ${diceNotation}` : `Roll a d${diceChoice}`}
      />
    );
  } else {
    // Magic and Traits are lists for now: no empty wheel above them.
    wheel = ['magic', 'traits'].includes(current.view) ? null : <HexWheel viewKey={current.view} label={VIEW_TITLES[current.view]} wedges={[]} centre={centreDice} />;
  }

  const rollRow = current.view === 'roll' ? rows.find((row) => row.key === current.ability) : null;

  if (loading && !character) {
    return (
      <div className="hex-sheet hex-sheet--state" style={themeVars} role="status" aria-live="polite">
        <HexLoader label="Opening character…" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="hex-sheet hex-sheet--state" style={themeVars} role="alert">
        <p>{loadError || 'This character could not be loaded.'}</p>
        <Link className="hex-sheet__text-button" to="/characters"><span className="hex-glass" aria-hidden="true" />Back to My Characters</Link>
      </div>
    );
  }

  return (
    <div className={`hex-sheet${['combat', 'equipment', 'skills', 'magic', 'traits'].includes(current.view) ? ' hex-sheet--with-list' : ''}${current.view === 'hp' ? ' hex-sheet--hp' : ''}`} style={themeVars} data-theme={themeId} data-testid="hex-sheet">
      <header className="hex-sheet__header">
        <button type="button" className="hex-sheet__hex-button" onClick={() => navigate('/characters')} aria-label="Back to My Characters" data-testid="hex-leave">
          <span className="hex-sheet__hex-button-rim" aria-hidden="true">
            <span className="hex-sheet__hex-button-face"><ArrowLeft size={18} /></span>
          </span>
        </button>
        <div className="hex-sheet__identity">
          <h1>{identity.name}</h1>
          <p>{identity.classLine}</p>
          {identity.subclassLine && <p className="hex-sheet__subclass">{identity.subclassLine}</p>}
        </div>
        <HexPortrait url={portraitUrlFor(character)} name={identity.name} onOpen={() => setShowPortrait(true)} />
      </header>

      <section className="hex-sheet__vitals" aria-label="Vital statistics">
        <button
          type="button"
          className="hex-sheet__vital hex-sheet__vital--hp"
          data-testid="hex-vital-hp"
          aria-label={`Hit points ${vitals.currentHp} of ${vitals.maxHp}${vitals.tempHp ? `, plus ${vitals.tempHp} temporary` : ''}. Adjust hit points.`}
          onClick={() => { if (current.view !== 'hp') push({ view: 'hp' }); }}
        >
          <span className="hex-glass" aria-hidden="true" />
          <span className="hex-sheet__vital-label">Hit Points</span>
          <strong>{vitals.currentHp} / {vitals.maxHp}</strong>
          {vitals.tempHp > 0 && <span className="hex-sheet__vital-extra">+{vitals.tempHp} temp</span>}
        </button>
        <button
          type="button"
          className="hex-sheet__vital"
          data-testid="hex-vital-initiative"
          aria-label={`Initiative ${formatModifier(vitals.initiative)}. Roll initiative.`}
          onClick={() => rollCheck('Initiative', vitals.initiative)}
        >
          <span className="hex-glass" aria-hidden="true" />
          <span className="hex-sheet__vital-label">Initiative</span>
          <strong>{formatModifier(vitals.initiative)}</strong>
        </button>
        <div className="hex-sheet__vital" data-testid="hex-vital-ac" aria-label={`Armour class ${vitals.armorClass}`} role="group">
          <span className="hex-sheet__vital-label">Armour Class</span>
          <strong>{vitals.armorClass}</strong>
        </div>
      </section>

      <nav className="hex-sheet__trail" aria-label="Wheel navigation">
        {stack.length > 1 ? (
          <button type="button" className="hex-sheet__back" onClick={back} data-testid="hex-back">
            <span className="hex-glass" aria-hidden="true" />
            <ChevronLeft size={16} aria-hidden="true" /> Back
          </button>
        ) : <span className="hex-sheet__back-spacer" aria-hidden="true" />}
        <ol className="hex-sheet__crumbs" data-testid="hex-crumbs">
          {stack.map((entry, index) => (
            <li key={`${entry.view}-${index}`} aria-current={index === stack.length - 1 ? 'location' : undefined}>
              {viewTitle(entry, rows)}
            </li>
          ))}
        </ol>
      </nav>

      <main className="hex-sheet__wheel-area">
        {wheel}
        {current.view === 'hp' && character && (
          <HexRecovery
            character={character}
            busy={recovering}
            onRest={rest}
            onSpendHitDie={spendHitDie}
            onOpenDeathSaves={() => push({ view: 'death' })}
          />
        )}
        {current.view === 'death' && character && (() => {
          const state = recoveryState(character);
          return (
            <div className="hex-death" data-testid="hex-death-saves">
              <p className="hex-death__status" aria-live="polite">
                {state.dead ? 'Three fails: your character has died.' : state.stable ? 'Three passes: stable at 0 HP.' : state.currentHp <= 0 ? 'Dying: roll a death save each turn.' : 'Back on your feet. These saves are still marked.'}
              </p>
              <button
                type="button"
                className="hex-sheet__text-button"
                disabled={recovering}
                onClick={() => queueRef.current.patch({ death_saves_successes: 0, death_saves_failures: 0 }, { success: 'Death saves cleared', error: 'Could not clear death saves' })}
                data-testid="hex-clear-death-saves"
              >
                Clear death saves
              </button>
            </div>
          );
        })()}
        {current.view === 'main' && character && recoveryState(character).showDeathSaves && (
          <button type="button" className="hex-sheet__death-link" onClick={() => push({ view: 'death' })} data-testid="hex-main-death-saves">
            <span className="hex-glass" aria-hidden="true" />
            {recoveryState(character).currentHp <= 0 ? 'Dying: death saves' : 'Death saves'}
          </button>
        )}
        {rollRow && (
          <div className="hex-sheet__choice" ref={choiceRef} role="group" aria-label={`${rollRow.name} roll`} data-testid="hex-roll-choice">
            <button type="button" onClick={() => { rollCheck(`${rollRow.name} Check`, rollRow.check); back(); }} data-testid="hex-roll-check">
              <span className="hex-glass" aria-hidden="true" />
              <span>{rollRow.name} check</span><strong>{formatModifier(rollRow.check)}</strong>
            </button>
            <button type="button" onClick={() => { rollCheck(`${rollRow.name} Save`, rollRow.save); back(); }} data-testid="hex-roll-save">
              <span className="hex-glass" aria-hidden="true" />
              <span>{rollRow.name} save{rollRow.saveProficient ? ' ●' : ''}</span><strong>{formatModifier(rollRow.save)}</strong>
            </button>
          </div>
        )}
        {current.view === 'dice' && (
          <div className="hex-dice-count" role="group" aria-label="How many dice">
            <button type="button" onClick={() => setDiceCount((n) => Math.max(1, n - 1))} disabled={diceCount <= 1} aria-label="One die fewer" data-testid="hex-dice-fewer">
              <span className="hex-glass" aria-hidden="true" />−
            </button>
            <output aria-live="polite" data-testid="hex-dice-count">{diceCount} × D{diceChoice}</output>
            <button type="button" onClick={() => setDiceCount((n) => Math.min(MAX_DICE, n + 1))} disabled={diceCount >= MAX_DICE} aria-label="One die more" data-testid="hex-dice-more">
              <span className="hex-glass" aria-hidden="true" />+
            </button>
          </div>
        )}
        {current.view === 'dice' && (
          <button type="button" className="hex-sheet__text-button" onClick={() => window.dispatchEvent(new Event('rq-dice-open'))} data-testid="hex-more-dice">
            <span className="hex-glass" aria-hidden="true" />
            Mixed dice and custom rolls
          </button>
        )}
        {current.view === 'combat' && character && (
          <section className="hex-combat-list" aria-label={viewTitle(current, rows)} data-testid="hex-combat-list">
            <CleanCombatTab
              getLatestCharacter={latestCharacter}
              character={character}
              proficiencyBonus={proficiencyBonusFor(character)}
              section={COMBAT_GROUPS.find((group) => group.id === current.group)?.sections || ['action', 'other']}
              onRoll={rollCheck}
              onCharacterUpdate={patchWithConcentrationGuard}
              onDiceResult={(entry) => present(entry)}
            />
          </section>
        )}
        {current.view === 'magic' && character && (
          <HexMagicView
            getLatestCharacter={latestCharacter}
            character={character}
            proficiencyBonus={proficiencyBonusFor(character)}
            onRollAttack={rollCheck}
            onRollDice={rollSpellDice}
            onSave={patchWithConcentrationGuard}
            onManage={() => setManageSpells((open) => !open)}
          />
        )}
        {current.view === 'magic' && character && manageSpells && (
          <section className="hex-combat-list hex-section-list character-page-v2" aria-label="Manage spells" data-testid="hex-magic-manage-list">
            <CleanSpellsTab
              character={character}
              onCharacterUpdate={patchWithConcentrationGuard}
              onRollAttack={rollCheck}
              onRollDice={rollSpellDice}
            />
          </section>
        )}
        {current.view === 'traits' && character && (
          <HexTraitsView
            character={character}
            classFeatureSummary={featureProps.classFeatureSummary}
            rulesEdition={featureProps.rulesEdition}
            onMore={() => setTraitDetails((open) => !open)}
            moreOpen={traitDetails}
          />
        )}
        {current.view === 'traits' && character && traitDetails && (
          <section className="hex-combat-list hex-section-list character-page-v2" aria-label="All trait details" data-testid="hex-traits-details">
            <CleanSheetFeaturesTab
              ac={deriveArmorClass(character)}
              actionEconomyGroups={featureProps.actionEconomyGroups}
              character={character}
              classFeatureSummary={featureProps.classFeatureSummary}
              exhaustionLevel={Number(character.exhaustion_level || 0)}
              proficiencyBonus={proficiencyBonusFor(character)}
              proficiencySummary={featureProps.proficiencySummary}
              rulesEdition={featureProps.rulesEdition}
              speed={deriveWalkingSpeed(character)}
              onOpenInventory={() => push({ view: 'equipment' })}
              onCharacterUpdate={(updates, options = {}) => queueRef.current.patch(updates, options)}
            />
          </section>
        )}
        {SECTION_TITLES[current.view] && !['core', 'combat', 'equipment', 'skills', 'magic', 'traits'].includes(current.view) && (
          <div className="hex-sheet__coming" data-testid="hex-coming-soon">
            <p>{VIEW_TITLES[current.view]} joins the wheel in the next phase.</p>
            <Link className="hex-sheet__text-button" to={`/characters/${characterId}/classic`}><span className="hex-glass" aria-hidden="true" />Open on the classic sheet</Link>
          </div>
        )}
      </main>

      <footer className="hex-sheet__footer">
        <button type="button" className={`hex-sheet__footer-button${levelUpReady ? ' is-ready' : ''}`} onClick={startLevelUp} data-testid="hex-level-up">
          <span className="hex-glass" aria-hidden="true" />
          <TrendingUp size={18} aria-hidden="true" /> {levelUpReady ? `Level up ready · ${character.level_up_grant.to_level}` : 'Level Up'}
        </button>
        <div className="hex-sheet__settings" ref={settingsRef}>
          <button type="button" className="hex-sheet__footer-button hex-sheet__footer-button--icon" onClick={() => setShowSettings((open) => !open)} aria-expanded={showSettings} aria-label="Settings and edit character" data-testid="hex-settings">
            <span className="hex-glass" aria-hidden="true" />
            <Settings size={22} aria-hidden="true" />
          </button>
          {showSettings && (
            <div className="hex-sheet__menu" role="menu" aria-label="Character settings">
              <button type="button" role="menuitem" onClick={() => navigate(`/characters/${characterId}/edit`)}>Edit character</button>
              <button type="button" role="menuitem" onClick={() => navigate(`/characters/${characterId}/classic`)}>Open classic sheet</button>
              <p className="hex-sheet__theme-heading" id="hex-theme-heading">Colour theme</p>
              <div className="hex-sheet__themes" role="group" aria-labelledby="hex-theme-heading">
                {HEX_THEMES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={themeId === entry.id}
                    onClick={() => chooseTheme(entry.id)}
                    data-testid={`hex-theme-${entry.id}`}
                  >
                    <span className="hex-sheet__theme-swatch" style={{ background: entry.swatch.glow }} aria-hidden="true"><i style={{ background: entry.swatch.bg }} /></span>
                    {entry.name}
                    {themeId === entry.id && <span className="hex-sheet__theme-check" aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </footer>

      {showPortrait && (
        <div className="hex-sheet__overlay" role="dialog" aria-modal="true" aria-label={`${identity.name} portrait`} onClick={() => setShowPortrait(false)} onKeyDown={(event) => { if (event.key === 'Escape') setShowPortrait(false); }}>
          <HexPortrait url={portraitUrlFor(character)} name={identity.name} size="large" />
          <button type="button" className="hex-sheet__text-button" autoFocus onClick={() => setShowPortrait(false)}><span className="hex-glass" aria-hidden="true" />Close</button>
        </div>
      )}

      {showLevelReveal && levelUpReady && (
        <LevelUpReveal
          characterName={character.name}
          fromLevel={Number(character.level) || 1}
          toLevel={Number(character.level_up_grant.to_level)}
          onContinue={() => { setShowLevelReveal(false); setShowLevelUp(true); }}
          onLater={() => setShowLevelReveal(false)}
        />
      )}

      {showLevelUp && (
        <LevelUpWizard
          character={character}
          isOpen={showLevelUp}
          onClose={() => setShowLevelUp(false)}
          onLevelUp={() => {
            setShowLevelUp(false);
            setTimeout(() => window.location.reload(), 500);
          }}
        />
      )}

      {rollBurst && (
        <DiceRollFlicker
          key={rollBurst.rollId}
          rollId={rollBurst.rollId}
          isOpen
          onClose={() => setRollBurst(null)}
          label={rollBurst.label}
          rolls={(rollBurst.rolls || []).map((roll) => ({
            sides: roll.sides || rollBurst.sides || 20,
            result: typeof roll === 'object' ? roll.result : roll,
            dropped: typeof roll === 'object' && Boolean(roll.dropped),
          }))}
          modifier={rollBurst.modifier}
          total={rollBurst.total}
          isCrit={rollBurst.sides === 20 && rollBurst.d20 === 20}
          isFumble={rollBurst.sides === 20 && rollBurst.d20 === 1}
          resultTone={rollBurst.tone}
          resultCaption={rollBurst.caption}
          theme="player"
          shape="hex"
          anchorSelector=".hex-sheet__wheel-area svg[data-hex-radius]"
        />
      )}
    </div>
  );
}
