import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { BACKGROUNDS, CLASSES, RACES } from '../data/characterRules5e';
import './FullCharacterCreatorV2.css';

const classFocus = {
  Fighter: 'strength',
  Barbarian: 'strength',
  Paladin: 'strength',
  Rogue: 'dexterity',
  Ranger: 'dexterity',
  Wizard: 'intelligence',
  Sorcerer: 'charisma',
  Warlock: 'charisma',
  Bard: 'charisma',
  Cleric: 'wisdom',
  Druid: 'wisdom',
  Monk: 'dexterity',
};

const abilityOptions = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

const defaultForm = {
  name: '',
  characterClass: 'Fighter',
  race: 'Human',
  background: 'Soldier',
  abilityFocus: 'strength',
  magicPreference: 'not sure',
  equipmentMode: 'recommended',
};

export function buildBasicCreatorPreset({
  name,
  characterClass,
  race,
  background,
  abilityFocus,
  magicPreference,
  equipmentMode,
}) {
  const safeClass = CLASSES[characterClass] ? characterClass : 'Fighter';

  return {
    source: 'basic-creator',
    name: name || '',
    characterClass: safeClass,
    race: RACES[race] ? race : 'Human',
    background: BACKGROUNDS[background] ? background : 'Soldier',
    abilityFocus: abilityFocus || classFocus[safeClass] || 'strength',
    equipmentMode: equipmentMode || 'recommended',
    notes: `Basic Creator preset. Magic preference: ${magicPreference || 'not sure'}`,
  };
}

function BasicField({ label, children }) {
  return (
    <label>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function BasicCharacterCreator() {
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const continueToReview = () => {
    navigate('/characters/new/full', {
      state: { creatorPreset: buildBasicCreatorPreset(form) },
    });
  };

  return (
    <main className="full-creator-page">
      <header className="full-creator-header">
        <button onClick={() => navigate('/characters/new/modes')} className="full-creator-back">
          <ArrowLeft size={18} /> Creation routes
        </button>
        <div>
          <p className="full-creator-eyebrow">Basic Creator</p>
          <h1>Pick the basics, then review before saving.</h1>
          <p>Rook sets up a safe starter draft from your core choices. Full Creator opens next so you can change anything before the character is saved.</p>
        </div>
      </header>

      <section className="full-creator-layout">
        <article className="full-creator-panel">
          <div className="full-creator-form-grid">
            <BasicField label="Name">
              <input
                value={form.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="Hero name"
              />
            </BasicField>

            <BasicField label="Class">
              <select
                value={form.characterClass}
                onChange={(event) => update({
                  characterClass: event.target.value,
                  abilityFocus: classFocus[event.target.value] || form.abilityFocus,
                })}
              >
                {Object.keys(CLASSES).map((className) => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </BasicField>

            <BasicField label="Species">
              <select value={form.race} onChange={(event) => update({ race: event.target.value })}>
                {Object.keys(RACES).map((raceName) => (
                  <option key={raceName} value={raceName}>{raceName}</option>
                ))}
              </select>
            </BasicField>

            <BasicField label="Background">
              <select value={form.background} onChange={(event) => update({ background: event.target.value })}>
                {Object.keys(BACKGROUNDS).map((backgroundName) => (
                  <option key={backgroundName} value={backgroundName}>{backgroundName}</option>
                ))}
              </select>
            </BasicField>

            <BasicField label="Ability focus">
              <select value={form.abilityFocus} onChange={(event) => update({ abilityFocus: event.target.value })}>
                {abilityOptions.map((ability) => (
                  <option key={ability} value={ability}>{ability}</option>
                ))}
              </select>
            </BasicField>

            <BasicField label="Magic preference">
              <select value={form.magicPreference} onChange={(event) => update({ magicPreference: event.target.value })}>
                <option value="not sure">Not sure</option>
                <option value="I want magic">I want magic</option>
                <option value="No magic">No magic</option>
                <option value="Some magic">Some magic</option>
              </select>
            </BasicField>

            <BasicField label="Equipment">
              <select value={form.equipmentMode} onChange={(event) => update({ equipmentMode: event.target.value })}>
                <option value="recommended">Starter gear</option>
                <option value="custom">I will choose later</option>
              </select>
            </BasicField>
          </div>

          <button type="button" onClick={continueToReview} className="full-creator-primary">
            Continue to Full Creator <ChevronRight size={18} />
          </button>
        </article>

        <aside className="full-creator-preview">
          <h2>What happens next?</h2>
          <p>Full Creator opens with your selected class, species, background, ability focus, and equipment mode prefilled.</p>
          <p>No direct save happens on this page, so Basic Creator cannot create an incomplete character record.</p>
        </aside>
      </section>
    </main>
  );
}
