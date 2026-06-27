import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Dices, Server, Sparkles, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { CLASS_FEATURES } from '@/data/classFeatures';
import { SPELLCASTING_CLASSES, getMaxSpellLevel, getSpellsForClass } from '@/data/spellDatabase';
import { ABILITIES, ABILITY_SHORT, HIT_DICE, getFeatsByEdition } from '@/data/levelUpData';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';
const titleFont = 'var(--rq-title-font, "New Rocker", Georgia, serif)';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  hover: '#444444',
  red: '#d00000',
  redSoft: 'rgba(208,0,0,0.2)',
  text: '#ffffff',
  soft: 'rgba(255,255,255,0.74)',
  muted: 'rgba(255,255,255,0.58)',
  line: 'rgba(255,255,255,0.16)',
  strongLine: 'rgba(255,255,255,0.26)',
  success: '#22c55e',
  warning: '#f59e0b',
};

function abilityLabel(ability) {
  return ABILITY_SHORT[ability] || String(ability || '').slice(0, 3).toUpperCase();
}

function abilityScore(character, ability) {
  return Number(character?.[ability] || 10);
}

function abilityMod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

function displayClass(value) {
  const raw = String(value || 'Fighter').trim();
  return raw ? raw.slice(0, 1).toUpperCase() + raw.slice(1) : 'Fighter';
}

function normaliseFeatOptions(preflight, character) {
  const edition = preflight?.edition || (String(character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014');
  const backendNames = preflight?.feat_options || preflight?.general_feat_options || [];
  const localFeats = getFeatsByEdition(edition, 'general');
  const localByName = new Map(localFeats.map(feat => [feat.name.toLowerCase(), feat]));

  if (backendNames.length > 0) {
    return backendNames.map(option => {
      if (typeof option === 'object') return option;
      const local = localByName.get(String(option).toLowerCase());
      return local || { name: String(option), description: 'Available from the server progression check.' };
    });
  }

  return localFeats;
}

function localSubclassOptions(characterClass) {
  const classData = CLASS_FEATURES[String(characterClass || '').toLowerCase()];
  return Object.entries(classData?.subclasses || {}).map(([key, subclass]) => ({
    id: key,
    name: subclass?.name || key,
    description: subclass?.description || 'Subclass option from local backup data.',
  }));
}

function normaliseSubclassOptions(preflight, characterClass) {
  const backendOptions = preflight?.subclass_options || [];
  if (backendOptions.length > 0) {
    return backendOptions.map(option => (
      typeof option === 'object'
        ? { id: option.id || option.name, name: option.name || option.id, description: option.description || 'Server-approved subclass option.' }
        : { id: String(option), name: String(option), description: 'Server-approved subclass option.' }
    ));
  }
  return localSubclassOptions(characterClass);
}

function spellListFor(characterClass, maxLevel) {
  const spellData = getSpellsForClass(characterClass) || {};
  const cantrips = spellData.cantrips || [];
  const spells = [];
  for (let level = 1; level <= maxLevel; level += 1) {
    (spellData[level] || []).forEach(spell => spells.push({ ...spell, level }));
  }
  return { cantrips, spells };
}

function namesFrom(list) {
  return (list || []).map(item => String(item?.name || item)).filter(Boolean);
}

export default function LevelUpWizard({ character, isOpen, onClose, onLevelUp }) {
  const [preflight, setPreflight] = useState(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [hpMethod, setHpMethod] = useState('average');
  const [hpRoll, setHpRoll] = useState(null);
  const [manualHpRoll, setManualHpRoll] = useState('');
  const [choiceType, setChoiceType] = useState('');
  const [asiChoices, setAsiChoices] = useState({ ability1: '', ability2: '' });
  const [selectedFeat, setSelectedFeat] = useState(null);
  const [selectedSubclass, setSelectedSubclass] = useState('');
  const [selectedNewSpells, setSelectedNewSpells] = useState([]);
  const [selectedNewCantrips, setSelectedNewCantrips] = useState([]);
  const [saving, setSaving] = useState(false);

  const currentLevel = Number(character?.level || 1);
  const newLevel = currentLevel + 1;
  const characterClass = displayClass(preflight?.character_class || character?.character_class || 'Fighter');
  const edition = preflight?.edition || (String(character?.edition || character?.ruleset_id || '').includes('2024') ? '2024' : '2014');
  const classInfo = SPELLCASTING_CLASSES[characterClass];
  const isSpellcaster = Boolean(classInfo && !classInfo.subclassOnly);
  const hitDie = Number(preflight?.hit_die || HIT_DICE[characterClass] || 8);
  const conMod = abilityMod(character?.constitution);
  const averageDie = Math.floor(hitDie / 2) + 1;
  const averageHp = Math.max(1, averageDie + conMod);
  const manualHpRollValue = Number(manualHpRoll);
  const validManualRoll = Number.isInteger(manualHpRollValue) && manualHpRollValue >= 1 && manualHpRollValue <= hitDie;
  const hpGain = hpMethod === 'roll'
    ? (hpRoll ? Math.max(1, hpRoll + conMod) : null)
    : hpMethod === 'manual'
      ? (validManualRoll ? Math.max(1, manualHpRollValue + conMod) : null)
      : averageHp;

  const maxSpellLevel = getMaxSpellLevel(characterClass, newLevel) || 0;
  const { cantrips, spells } = useMemo(() => spellListFor(characterClass, maxSpellLevel), [characterClass, maxSpellLevel]);
  const existingSpellNames = namesFrom(character?.spells_known || character?.spells_prepared);
  const existingCantripNames = namesFrom(character?.cantrips_known);
  const cantripGain = Number(preflight?.cantrips_to_learn || 0);
  const spellGain = Number(preflight?.spells_to_learn || 0);
  const needsSubclass = Boolean(preflight?.can_choose_subclass);
  const isAsiLevel = Boolean(preflight?.is_asi_level);
  const subclassOptions = useMemo(() => normaliseSubclassOptions(preflight, characterClass), [preflight, characterClass]);
  const featOptions = useMemo(() => normaliseFeatOptions(preflight, character), [preflight, character]);
  const hasSpellChoices = isSpellcaster && (cantripGain > 0 || spellGain > 0);

  const steps = useMemo(() => ([
    { id: 'overview', label: 'Check' },
    { id: 'hp', label: 'HP' },
    ...(needsSubclass ? [{ id: 'subclass', label: 'Subclass' }] : []),
    ...(hasSpellChoices ? [{ id: 'spells', label: 'Spells' }] : []),
    ...(isAsiLevel ? [{ id: 'asi', label: 'ASI / Feat' }] : []),
    { id: 'confirm', label: 'Confirm' },
  ]), [needsSubclass, hasSpellChoices, isAsiLevel]);

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)]?.id || 'overview';

  useEffect(() => {
    if (!isOpen || !character?.id) return;
    let cancelled = false;
    setStepIndex(0);
    setPreflight(null);
    setPreflightError('');
    setHpMethod('average');
    setHpRoll(null);
    setManualHpRoll('');
    setChoiceType('');
    setAsiChoices({ ability1: '', ability2: '' });
    setSelectedFeat(null);
    setSelectedSubclass(character?.subclass || '');
    setSelectedNewSpells([]);
    setSelectedNewCantrips([]);
    setPreflightLoading(true);

    apiClient.get(`/characters/${character.id}/level-up-options`, { params: { target_level: newLevel } })
      .then(response => {
        if (!cancelled) setPreflight(response.data);
      })
      .catch(error => {
        if (!cancelled) {
          setPreflight(null);
          setPreflightError(error?.response?.data?.detail || 'Server progression check failed. Local backup data is being used.');
        }
      })
      .finally(() => {
        if (!cancelled) setPreflightLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, character?.id, character?.subclass, newLevel]);

  if (!isOpen || !character) return null;

  const rollHp = () => {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    setHpMethod('roll');
    setHpRoll(roll);
    toast.success(`Rolled ${roll} on d${hitDie}`);
  };

  const toggleSpell = (spell, selected, setter, max) => {
    setter(prev => {
      const exists = prev.some(item => item.name === spell.name);
      if (exists) return prev.filter(item => item.name !== spell.name);
      if (prev.length >= max) return prev;
      return [...prev, selected];
    });
  };

  const canProceed = () => {
    if (activeStep === 'overview') return !preflightLoading;
    if (activeStep === 'hp') return hpMethod === 'average' || (hpMethod === 'roll' && hpRoll) || (hpMethod === 'manual' && validManualRoll);
    if (activeStep === 'subclass') return Boolean(selectedSubclass);
    if (activeStep === 'spells') return selectedNewCantrips.length >= cantripGain && selectedNewSpells.length >= spellGain;
    if (activeStep === 'asi') {
      if (choiceType === 'asi') return Boolean(asiChoices.ability1 && asiChoices.ability2);
      if (choiceType === 'feat') return Boolean(selectedFeat);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!canProceed()) return;
    setStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => setStepIndex(prev => Math.max(0, prev - 1));

  const submitLevelUp = async () => {
    if (!hpGain || saving) return;
    setSaving(true);
    try {
      const payload = {
        new_level: newLevel,
        hp_method: hpMethod,
        hp_roll: hpMethod === 'roll' ? hpRoll : hpMethod === 'manual' ? manualHpRollValue : null,
      };

      if (needsSubclass && selectedSubclass) payload.subclass = selectedSubclass;

      if (isAsiLevel) {
        payload.choice_type = choiceType || 'standard';
        if (choiceType === 'asi') payload.asi_choices = asiChoices;
        if (choiceType === 'feat' && selectedFeat) {
          payload.feat_choice = {
            name: selectedFeat.name,
            description: selectedFeat.description || '',
          };
        }
      }

      if (selectedNewSpells.length > 0) {
        payload.new_spells = selectedNewSpells.map(spell => ({ name: spell.name, level: spell.level || 1, school: spell.school || '' }));
      }
      if (selectedNewCantrips.length > 0) {
        payload.new_cantrips = selectedNewCantrips.map(spell => ({ name: spell.name, level: 0, school: spell.school || '' }));
      }

      await apiClient.post(`/characters/${character.id}/level-up`, payload);
      toast.success(`${character.name} reached level ${newLevel}`, { description: `HP increased by ${hpGain}.` });
      onLevelUp?.(newLevel);
      onClose?.();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Could not level up character');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <section style={modalStyle} onClick={event => event.stopPropagation()} data-testid="level-up-wizard">
        <header style={headerStyle}>
          <div>
            <p style={eyebrowStyle}>Character progression</p>
            <h2 style={titleStyle}>Level Up</h2>
            <p style={subtitleStyle}>{character.name} · {characterClass} · Level {currentLevel} → {newLevel}</p>
          </div>
          <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Close level up"><X size={18} /></button>
        </header>

        <nav style={stepRailStyle}>
          {steps.map((step, index) => (
            <span key={step.id} style={stepPillStyle(index === stepIndex, index < stepIndex)}>
              {index < stepIndex ? <Check size={13} /> : index + 1} {step.label}
            </span>
          ))}
        </nav>

        <div style={bodyStyle}>
          {activeStep === 'overview' && (
            <OverviewStep
              preflight={preflight}
              preflightLoading={preflightLoading}
              preflightError={preflightError}
              characterClass={characterClass}
              edition={edition}
              hitDie={hitDie}
              currentLevel={currentLevel}
              newLevel={newLevel}
              spellGain={spellGain}
              cantripGain={cantripGain}
              isAsiLevel={isAsiLevel}
              needsSubclass={needsSubclass}
            />
          )}

          {activeStep === 'hp' && (
            <HPStep
              hpMethod={hpMethod}
              setHpMethod={setHpMethod}
              hitDie={hitDie}
              averageDie={averageDie}
              averageHp={averageHp}
              conMod={conMod}
              hpRoll={hpRoll}
              rollHp={rollHp}
              manualHpRoll={manualHpRoll}
              setManualHpRoll={setManualHpRoll}
              validManualRoll={validManualRoll}
              manualHpRollValue={manualHpRollValue}
              hpGain={hpGain}
            />
          )}

          {activeStep === 'subclass' && (
            <SubclassStep
              characterClass={characterClass}
              subclassOptions={subclassOptions}
              selectedSubclass={selectedSubclass}
              setSelectedSubclass={setSelectedSubclass}
              serverChecked={Boolean(preflight)}
            />
          )}

          {activeStep === 'spells' && (
            <SpellsStep
              characterClass={characterClass}
              cantripGain={cantripGain}
              spellGain={spellGain}
              cantrips={cantrips}
              spells={spells}
              existingCantripNames={existingCantripNames}
              existingSpellNames={existingSpellNames}
              selectedNewCantrips={selectedNewCantrips}
              selectedNewSpells={selectedNewSpells}
              setSelectedNewCantrips={setSelectedNewCantrips}
              setSelectedNewSpells={setSelectedNewSpells}
              toggleSpell={toggleSpell}
              maxSpellLevel={maxSpellLevel}
            />
          )}

          {activeStep === 'asi' && (
            <AsiFeatStep
              character={character}
              choiceType={choiceType}
              setChoiceType={setChoiceType}
              asiChoices={asiChoices}
              setAsiChoices={setAsiChoices}
              selectedFeat={selectedFeat}
              setSelectedFeat={setSelectedFeat}
              featOptions={featOptions}
              edition={edition}
            />
          )}

          {activeStep === 'confirm' && (
            <ConfirmStep
              character={character}
              characterClass={characterClass}
              currentLevel={currentLevel}
              newLevel={newLevel}
              hpGain={hpGain}
              hpMethod={hpMethod}
              selectedSubclass={needsSubclass ? selectedSubclass : ''}
              selectedNewCantrips={selectedNewCantrips}
              selectedNewSpells={selectedNewSpells}
              choiceType={choiceType}
              asiChoices={asiChoices}
              selectedFeat={selectedFeat}
              serverChecked={Boolean(preflight)}
            />
          )}
        </div>

        <footer style={footerStyle}>
          <button type="button" onClick={goBack} disabled={stepIndex === 0 || saving} style={secondaryButtonStyle}>
            <ChevronLeft size={16} /> Back
          </button>
          {activeStep === 'confirm' ? (
            <button type="button" onClick={submitLevelUp} disabled={!canProceed() || saving} style={primaryButtonStyle}>
              <Sparkles size={16} /> {saving ? 'Levelling…' : `Confirm Level ${newLevel}`}
            </button>
          ) : (
            <button type="button" onClick={goNext} disabled={!canProceed()} style={primaryButtonStyle}>
              Next <ChevronRight size={16} />
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function OverviewStep({ preflight, preflightLoading, preflightError, characterClass, edition, hitDie, currentLevel, newLevel, spellGain, cantripGain, isAsiLevel, needsSubclass }) {
  return (
    <div style={sectionStyle}>
      <StatusBanner loading={preflightLoading} checked={Boolean(preflight)} error={preflightError} />
      <div style={summaryGridStyle}>
        <SummaryCard label="Class" value={characterClass} />
        <SummaryCard label="Level" value={`${currentLevel} → ${newLevel}`} />
        <SummaryCard label="Rules" value={`${edition} rules`} />
        <SummaryCard label="Hit die" value={`d${hitDie}`} />
      </div>
      <div style={checklistStyle}>
        <CheckLine active={needsSubclass} text={needsSubclass ? 'Subclass choice is due at this level.' : 'No subclass choice needed this level.'} />
        <CheckLine active={isAsiLevel} text={isAsiLevel ? 'ASI or feat choice is due.' : 'No ASI or feat choice at this level.'} />
        <CheckLine active={cantripGain > 0 || spellGain > 0} text={`${cantripGain} cantrip${cantripGain === 1 ? '' : 's'} and ${spellGain} spell${spellGain === 1 ? '' : 's'} to learn.`} />
      </div>
      <p style={smallNoteStyle}>Multiclass progression will get its own dedicated pass next; this pass makes ordinary level-up choices safer and server-checked.</p>
    </div>
  );
}

function StatusBanner({ loading, checked, error }) {
  if (loading) {
    return <div style={statusBannerStyle(theme.warning)}><Server size={18} /> Checking legal progression options with the server…</div>;
  }
  if (checked) {
    return <div style={statusBannerStyle(theme.success)}><Server size={18} /> Progression checked. This wizard is using server-approved options.</div>;
  }
  return <div style={statusBannerStyle(theme.warning)}><AlertTriangle size={18} /> {error || 'Using local backup progression data.'}</div>;
}

function SummaryCard({ label, value }) {
  return <div style={summaryCardStyle}><span>{label}</span><strong>{value}</strong></div>;
}

function CheckLine({ active, text }) {
  return <div style={checkLineStyle(active)}><Check size={15} /> {text}</div>;
}

function HPStep({ hpMethod, setHpMethod, hitDie, averageDie, averageHp, conMod, hpRoll, rollHp, manualHpRoll, setManualHpRoll, validManualRoll, manualHpRollValue, hpGain }) {
  const conText = conMod >= 0 ? `+${conMod}` : `${conMod}`;
  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Choose hit points</h3>
      <div style={choiceGridStyle}>
        <button type="button" onClick={() => setHpMethod('average')} style={choiceCardStyle(hpMethod === 'average')}>
          <strong>Take average</strong>
          <span>{averageDie} {conText} CON = +{averageHp} HP</span>
        </button>
        <button type="button" onClick={rollHp} style={choiceCardStyle(hpMethod === 'roll')}>
          <strong>Roll d{hitDie}</strong>
          <span>{hpRoll ? `Rolled ${hpRoll}; total +${Math.max(1, hpRoll + conMod)} HP` : 'Roll digitally in the wizard.'}</span>
        </button>
        <button type="button" onClick={() => setHpMethod('manual')} style={choiceCardStyle(hpMethod === 'manual')}>
          <strong>Physical roll</strong>
          <span>Enter the number you rolled at the table.</span>
        </button>
      </div>
      {hpMethod === 'manual' && (
        <label style={fieldStyle}>
          <span>d{hitDie} result</span>
          <input type="number" min="1" max={hitDie} value={manualHpRoll} onChange={event => setManualHpRoll(event.target.value)} style={inputStyle} />
          {manualHpRoll && !validManualRoll && <em style={errorTextStyle}>Enter a whole number from 1 to {hitDie}.</em>}
          {validManualRoll && <em style={goodTextStyle}>{manualHpRollValue} {conText} CON = +{Math.max(1, manualHpRollValue + conMod)} HP</em>}
        </label>
      )}
      <div style={resultStripStyle}><Dices size={18} /> HP gain: <strong>{hpGain ? `+${hpGain}` : 'pending'}</strong></div>
    </div>
  );
}

function SubclassStep({ characterClass, subclassOptions, selectedSubclass, setSelectedSubclass, serverChecked }) {
  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Choose {characterClass} subclass</h3>
      <p style={bodyTextStyle}>{serverChecked ? 'These options came from the server progression check.' : 'Using local backup subclass options.'}</p>
      <div style={listStyle}>
        {subclassOptions.map(option => (
          <button key={option.id || option.name} type="button" onClick={() => setSelectedSubclass(option.name || option.id)} style={wideChoiceStyle(selectedSubclass === (option.name || option.id))}>
            <strong>{option.name}</strong>
            <span>{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SpellsStep({ characterClass, cantripGain, spellGain, cantrips, spells, existingCantripNames, existingSpellNames, selectedNewCantrips, selectedNewSpells, setSelectedNewCantrips, setSelectedNewSpells, toggleSpell, maxSpellLevel }) {
  const availableCantrips = cantrips.filter(spell => !existingCantripNames.includes(spell.name));
  const availableSpells = spells.filter(spell => !existingSpellNames.includes(spell.name));
  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>Spell progression</h3>
      <p style={bodyTextStyle}>{characterClass} can learn up to level {maxSpellLevel || 0} spells.</p>
      {cantripGain > 0 && (
        <SpellPicker title={`Choose ${cantripGain} cantrip${cantripGain === 1 ? '' : 's'}`} selected={selectedNewCantrips} options={availableCantrips} limit={cantripGain} onPick={(spell) => toggleSpell(spell, { ...spell, level: 0 }, setSelectedNewCantrips, cantripGain)} />
      )}
      {spellGain > 0 && (
        <SpellPicker title={`Choose ${spellGain} spell${spellGain === 1 ? '' : 's'}`} selected={selectedNewSpells} options={availableSpells} limit={spellGain} onPick={(spell) => toggleSpell(spell, spell, setSelectedNewSpells, spellGain)} />
      )}
    </div>
  );
}

function SpellPicker({ title, selected, options, limit, onPick }) {
  return (
    <div style={spellPickerStyle}>
      <div style={pickerHeaderStyle}><strong>{title}</strong><span>{selected.length}/{limit}</span></div>
      <div style={spellButtonGridStyle}>
        {options.map(spell => {
          const active = selected.some(item => item.name === spell.name);
          const disabled = !active && selected.length >= limit;
          return (
            <button key={`${spell.name}-${spell.level || 0}`} type="button" disabled={disabled} onClick={() => onPick(spell)} style={spellButtonStyle(active, disabled)} title={spell.description || ''}>
              {spell.name}{spell.level ? ` · L${spell.level}` : ''}
            </button>
          );
        })}
        {options.length === 0 && <p style={smallNoteStyle}>No available options found that are not already on the sheet.</p>}
      </div>
    </div>
  );
}

function AsiFeatStep({ character, choiceType, setChoiceType, asiChoices, setAsiChoices, selectedFeat, setSelectedFeat, featOptions, edition }) {
  return (
    <div style={sectionStyle}>
      <h3 style={sectionTitleStyle}>ASI or feat</h3>
      <div style={choiceGridStyle}>
        <button type="button" onClick={() => { setChoiceType('asi'); setSelectedFeat(null); }} style={choiceCardStyle(choiceType === 'asi')}>
          <strong>Ability Score Improvement</strong>
          <span>Choose two +1 increases, or pick the same ability twice for +2.</span>
        </button>
        <button type="button" onClick={() => { setChoiceType('feat'); setAsiChoices({ ability1: '', ability2: '' }); }} style={choiceCardStyle(choiceType === 'feat')}>
          <strong>Feat</strong>
          <span>Choose a {edition} general feat from the checked list.</span>
        </button>
      </div>

      {choiceType === 'asi' && (
        <div style={asiGridStyle}>
          {[1, 2].map(slot => (
            <label key={slot} style={fieldStyle}>
              <span>Increase {slot}</span>
              <select value={asiChoices[`ability${slot}`]} onChange={event => setAsiChoices(prev => ({ ...prev, [`ability${slot}`]: event.target.value }))} style={inputStyle}>
                <option value="">Choose ability…</option>
                {ABILITIES.map(ability => (
                  <option key={ability} value={ability}>{abilityLabel(ability)} · current {abilityScore(character, ability)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      {choiceType === 'feat' && (
        <div style={listStyle}>
          {featOptions.map(feat => (
            <button key={feat.name} type="button" onClick={() => setSelectedFeat(feat)} style={wideChoiceStyle(selectedFeat?.name === feat.name)}>
              <strong>{feat.name}</strong>
              <span>{feat.description || feat.prereq || 'Feat option from progression data.'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmStep({ character, characterClass, currentLevel, newLevel, hpGain, hpMethod, selectedSubclass, selectedNewCantrips, selectedNewSpells, choiceType, asiChoices, selectedFeat, serverChecked }) {
  const items = [
    ['Character', character.name],
    ['Class', characterClass],
    ['Level', `${currentLevel} → ${newLevel}`],
    ['HP', `${hpMethod} · +${hpGain || 0}`],
    ...(selectedSubclass ? [['Subclass', selectedSubclass]] : []),
    ...(selectedNewCantrips.length ? [['Cantrips', selectedNewCantrips.map(spell => spell.name).join(', ')]] : []),
    ...(selectedNewSpells.length ? [['Spells', selectedNewSpells.map(spell => spell.name).join(', ')]] : []),
    ...(choiceType === 'asi' ? [['ASI', `${abilityLabel(asiChoices.ability1)} +1, ${abilityLabel(asiChoices.ability2)} +1`]] : []),
    ...(choiceType === 'feat' && selectedFeat ? [['Feat', selectedFeat.name]] : []),
  ];

  return (
    <div style={sectionStyle}>
      <StatusBanner loading={false} checked={serverChecked} error={serverChecked ? '' : 'Final choices are using local backup data.'} />
      <h3 style={sectionTitleStyle}>Confirm progression</h3>
      <div style={confirmListStyle}>
        {items.map(([label, value]) => <SummaryCard key={label} label={label} value={value} />)}
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.86)', display: 'grid', placeItems: 'center', padding: 14, fontFamily: fontStack, color: theme.text };
const modalStyle = { width: 'min(920px, 100%)', maxHeight: '92dvh', display: 'grid', gridTemplateRows: 'auto auto minmax(0, 1fr) auto', background: theme.panel, border: `1px solid ${theme.line}`, boxShadow: 'none', overflow: 'hidden' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', gap: 14, padding: '18px 18px 14px', borderBottom: `1px solid ${theme.line}`, background: theme.bg };
const eyebrowStyle = { margin: '0 0 4px', color: theme.muted, fontSize: 11, fontWeight: 950, letterSpacing: '0.12em', textTransform: 'uppercase' };
const titleStyle = { margin: 0, color: theme.text, fontFamily: titleFont, fontSize: 'clamp(34px, 5vw, 58px)', lineHeight: 0.9, letterSpacing: '0.03em' };
const subtitleStyle = { margin: '8px 0 0', color: theme.soft, fontSize: 13 };
const iconButtonStyle = { width: 38, height: 38, display: 'grid', placeItems: 'center', border: 0, background: theme.card, color: theme.text, cursor: 'pointer' };
const stepRailStyle = { display: 'flex', gap: 6, flexWrap: 'wrap', padding: 12, background: theme.panel, borderBottom: `1px solid ${theme.line}` };
const stepPillStyle = (active, done) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 9px', background: active ? theme.red : done ? theme.redSoft : theme.card, color: theme.text, border: `1px solid ${active ? theme.red : theme.line}`, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.06em' });
const bodyStyle = { padding: 18, overflowY: 'auto', minHeight: 0 };
const footerStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, padding: 12, borderTop: `1px solid ${theme.line}`, background: theme.bg };
const primaryButtonStyle = { minHeight: 40, border: 0, background: theme.red, color: theme.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 14px', fontWeight: 950, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 40, border: 0, background: theme.card, color: theme.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 14px', fontWeight: 900, cursor: 'pointer', fontFamily: fontStack };
const sectionStyle = { display: 'grid', gap: 14 };
const sectionTitleStyle = { margin: 0, color: theme.text, fontSize: 24, fontWeight: 950, letterSpacing: '-0.02em' };
const bodyTextStyle = { margin: 0, color: theme.soft, lineHeight: 1.5, fontSize: 14 };
const statusBannerStyle = (colour) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: 12, background: theme.card, border: `1px solid ${theme.line}`, borderLeft: `6px solid ${colour}`, color: theme.text, fontSize: 13, fontWeight: 900 });
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 };
const summaryCardStyle = { display: 'grid', gap: 5, padding: 12, background: theme.card, border: `1px solid ${theme.line}` };
const checklistStyle = { display: 'grid', gap: 7 };
const checkLineStyle = (active) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', background: active ? theme.redSoft : theme.card, border: `1px solid ${active ? 'rgba(208,0,0,0.55)' : theme.line}`, color: theme.text, fontSize: 13 });
const smallNoteStyle = { margin: 0, color: theme.muted, fontSize: 12, lineHeight: 1.45 };
const choiceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 9 };
const choiceCardStyle = (active) => ({ minHeight: 96, display: 'grid', alignContent: 'start', gap: 7, textAlign: 'left', padding: 13, background: active ? theme.redSoft : theme.card, color: theme.text, border: `1px solid ${active ? 'rgba(208,0,0,0.7)' : theme.line}`, cursor: 'pointer', fontFamily: fontStack });
const fieldStyle = { display: 'grid', gap: 6, color: theme.muted, fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const inputStyle = { width: '100%', minHeight: 42, background: theme.bg, border: `1px solid ${theme.strongLine}`, color: theme.text, padding: '0 10px', fontFamily: fontStack, colorScheme: 'dark' };
const errorTextStyle = { color: '#ff6b6b', fontSize: 12, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0 };
const goodTextStyle = { color: theme.success, fontSize: 12, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0 };
const resultStripStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: theme.bg, border: `1px solid ${theme.line}`, color: theme.text, fontWeight: 900 };
const listStyle = { display: 'grid', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 };
const wideChoiceStyle = (active) => ({ display: 'grid', gap: 5, textAlign: 'left', padding: 12, background: active ? theme.redSoft : theme.card, color: theme.text, border: `1px solid ${active ? 'rgba(208,0,0,0.7)' : theme.line}`, cursor: 'pointer', fontFamily: fontStack });
const spellPickerStyle = { display: 'grid', gap: 8, padding: 12, background: theme.card, border: `1px solid ${theme.line}` };
const pickerHeaderStyle = { display: 'flex', justifyContent: 'space-between', color: theme.text, fontSize: 13 };
const spellButtonGridStyle = { display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 190, overflowY: 'auto' };
const spellButtonStyle = (active, disabled) => ({ border: `1px solid ${active ? 'rgba(208,0,0,0.8)' : theme.line}`, background: active ? theme.redSoft : theme.bg, color: disabled ? theme.muted : theme.text, padding: '7px 9px', fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.48 : 1, fontFamily: fontStack });
const asiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, padding: 12, background: theme.card, border: `1px solid ${theme.line}` };
const confirmListStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 };
