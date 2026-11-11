import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, Settings, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/apiClient';
import DiceRollFlicker from '@/components/DiceRollFlicker';
import LevelUpWizard from '@/components/LevelUpWizard';
import { createCharacterSaveQueue } from '@/data/characterSaveQueue';
import { rollDiceNotation } from '@/data/diceRoller';
import { rollD20 } from '@/components/clean-sheet/cleanSheetUtils';
import { getConcentrationName, getConcentrationSaveDc, getConcentrationSaveModifier } from '@/data/characterConcentrationRules';

import HexHpDial from './HexHpDial';
import HexPortrait from './HexPortrait';
import HexWheel from './HexWheel';
import { SLOT } from './hexGeometry';
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

export const DICE_SLOTS = [
  { sides: 4, slot: SLOT.UPPER_LEFT },
  { sides: 6, slot: SLOT.UPPER_RIGHT },
  { sides: 8, slot: SLOT.RIGHT },
  { sides: 10, slot: SLOT.LOWER_RIGHT },
  { sides: 12, slot: SLOT.LOWER_LEFT },
  { sides: 20, slot: SLOT.LEFT },
];

const SECTION_TITLES = Object.fromEntries(MAIN_SECTIONS.map((section) => [section.id, section.label]));
const VIEW_TITLES = { main: 'Character', core: 'Core Abilities', dice: 'Dice', hp: 'Hit Points', ...SECTION_TITLES };

function viewTitle(entry, rows) {
  if (entry.view === 'roll') return rows.find((row) => row.key === entry.ability)?.name || 'Roll';
  return VIEW_TITLES[entry.view] || 'Character';
}

/**
 * The hexagonal character sheet (preview).
 *
 * Lives beside the classic sheet at /characters/:id/hex and changes nothing
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stack, setStack] = useState([{ view: 'main' }]);
  const [rollBurst, setRollBurst] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
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
  };

  const rollDie = (sides) => {
    const result = rollDiceNotation(`1d${sides}`);
    if (!result.valid || !result.rolls.length) {
      toast.error(`Could not roll a d${sides}`);
      return;
    }
    const kept = result.rolls.find((roll) => !roll.dropped) || result.rolls[0];
    present({ label: `d${sides}`, rolls: result.rolls, modifier: result.modifier, total: result.total, d20: sides === 20 ? kept.result : null, sides });
  };

  const openDice = () => push({ view: 'dice' });

  /**
   * Save an HP dial change through the same queue as the classic sheet.
   * Resolves true only once the server has accepted it.
   */
  const confirmHp = async (target, delta, adjustment) => {
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
  const centreDice = { label: 'D20', ariaLabel: 'Open the dice wheel', onSelect: openDice };

  let wheel;
  if (current.view === 'main') {
    wheel = (
      <HexWheel
        viewKey="main"
        label="Character sections"
        wedges={MAIN_SECTIONS.map((section) => ({
          ...section,
          ariaLabel: `Open ${section.label}`,
          onSelect: () => push({ view: section.id }),
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
  } else if (current.view === 'hp') {
    wheel = <HexHpDial character={character} initialTarget={current.target || 'hp'} onConfirm={confirmHp} onCancel={back} />;
  } else if (current.view === 'dice') {
    wheel = (
      <HexWheel
        viewKey="dice"
        label="Dice"
        wedges={DICE_SLOTS.map(({ sides, slot }) => ({
          id: `d${sides}`,
          slot,
          label: `D${sides}`,
          upright: true,
          ariaLabel: `Roll a d${sides}`,
          onSelect: () => rollDie(sides),
        }))}
        centre={{ label: 'D100', ariaLabel: 'Roll a d100', onSelect: () => rollDie(100) }}
      />
    );
  } else {
    wheel = <HexWheel viewKey={current.view} label={`${VIEW_TITLES[current.view]} (coming soon)`} wedges={[]} centre={centreDice} />;
  }

  const rollRow = current.view === 'roll' ? rows.find((row) => row.key === current.ability) : null;

  if (loading && !character) {
    return (
      <div className="hex-sheet hex-sheet--state" role="status" aria-live="polite">
        <span className="hex-sheet__loading-hex" aria-hidden="true" />
        <p>Opening character…</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="hex-sheet hex-sheet--state" role="alert">
        <p>{loadError || 'This character could not be loaded.'}</p>
        <Link className="hex-sheet__text-button" to="/characters"><span className="hex-glass" aria-hidden="true" />Back to My Characters</Link>
      </div>
    );
  }

  return (
    <div className="hex-sheet" data-testid="hex-sheet">
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
          <button type="button" className="hex-sheet__text-button" onClick={() => window.dispatchEvent(new Event('rq-dice-open'))} data-testid="hex-more-dice">
            <span className="hex-glass" aria-hidden="true" />
            More dice and custom rolls
          </button>
        )}
        {SECTION_TITLES[current.view] && current.view !== 'core' && (
          <div className="hex-sheet__coming" data-testid="hex-coming-soon">
            <p>{VIEW_TITLES[current.view]} joins the wheel in the next phase.</p>
            <Link className="hex-sheet__text-button" to={`/characters/${characterId}`}><span className="hex-glass" aria-hidden="true" />Open on the classic sheet</Link>
          </div>
        )}
      </main>

      <footer className="hex-sheet__footer">
        <button type="button" className="hex-sheet__footer-button" onClick={() => setShowLevelUp(true)} data-testid="hex-level-up">
          <span className="hex-glass" aria-hidden="true" />
          <TrendingUp size={18} aria-hidden="true" /> Level Up
        </button>
        <button type="button" className="hex-sheet__footer-button hex-sheet__footer-button--icon" onClick={() => setShowSettings((open) => !open)} aria-expanded={showSettings} aria-label="Settings and edit character" data-testid="hex-settings">
          <span className="hex-glass" aria-hidden="true" />
          <Settings size={22} aria-hidden="true" />
        </button>
        {showSettings && (
          <div className="hex-sheet__menu" role="menu" aria-label="Character settings">
            <button type="button" role="menuitem" onClick={() => navigate(`/characters/${characterId}/edit`)}>Edit character</button>
            <button type="button" role="menuitem" onClick={() => navigate(`/characters/${characterId}`)}>Open classic sheet</button>
          </div>
        )}
      </footer>

      {showPortrait && (
        <div className="hex-sheet__overlay" role="dialog" aria-modal="true" aria-label={`${identity.name} portrait`} onClick={() => setShowPortrait(false)} onKeyDown={(event) => { if (event.key === 'Escape') setShowPortrait(false); }}>
          <HexPortrait url={portraitUrlFor(character)} name={identity.name} size="large" />
          <button type="button" className="hex-sheet__text-button" autoFocus onClick={() => setShowPortrait(false)}><span className="hex-glass" aria-hidden="true" />Close</button>
        </div>
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
          theme="player"
        />
      )}
    </div>
  );
}
