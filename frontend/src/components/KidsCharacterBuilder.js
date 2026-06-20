import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import {
  KIDS_BACKGROUNDS,
  KIDS_FAVORITES,
  KIDS_GEAR,
  KIDS_HERO_TYPES,
  KIDS_SPECIES,
  buildKidsCharacterPayload,
} from '@/data/kidsCharacterBuilds';

const sectionStyle = {
  background: 'var(--rq-bg-panel)',
  border: '1px solid var(--rq-border-default)',
  borderRadius: 18,
  padding: 18,
  boxShadow: '0 18px 50px rgba(0, 0, 0, 0.22)',
};

const cardGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 };
const cardStyle = selected => ({
  border: `2px solid ${selected ? 'var(--rq-accent-primary)' : 'var(--rq-border-default)'}`,
  background: selected ? 'var(--rq-accent-soft)' : 'var(--rq-bg-panel-alt)',
  color: 'var(--rq-text-primary)',
  borderRadius: 16,
  padding: 14,
  minHeight: 92,
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'transform 140ms ease, border-color 140ms ease, background 140ms ease',
});

function ChoiceCards({ title, helper, items, selectedId, onSelect, testPrefix }) {
  return (
    <section style={sectionStyle}>
      <h2 style={{ color: 'var(--rq-text-primary)', margin: '0 0 4px', fontSize: 20 }}>{title}</h2>
      {helper && <p style={{ color: 'var(--rq-text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>{helper}</p>}
      <div style={cardGrid}>
        {items.map(item => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`${testPrefix}-${item.id}`}
              onClick={() => onSelect(item.id)}
              style={cardStyle(selected)}
            >
              <strong style={{ display: 'block', color: selected ? 'var(--rq-accent-hover)' : 'var(--rq-text-primary)', fontSize: 16, marginBottom: 6 }}>{item.label}</strong>
              <span style={{ color: selected ? 'var(--rq-text-secondary)' : 'var(--rq-text-muted)', fontSize: 13, lineHeight: 1.35 }}>{item.tagline || item.note || item.skill}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function KidsCharacterBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [edition, setEdition] = useState('2014');
  const [heroTypeId, setHeroTypeId] = useState('brave-fighter');
  const [speciesId, setSpeciesId] = useState('human');
  const [backgroundId, setBackgroundId] = useState('soldier');
  const [favoriteId, setFavoriteId] = useState('strong');
  const [gearId, setGearId] = useState('sturdy');
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => buildKidsCharacterPayload({
    name: name.trim() || 'Your Hero',
    heroTypeId,
    speciesId,
    backgroundId,
    favoriteId,
    gearId,
    edition,
  }), [backgroundId, edition, favoriteId, gearId, heroTypeId, name, speciesId]);

  const createHero = async () => {
    if (!name.trim()) {
      toast.error('Give your hero a name first');
      return;
    }
    setSaving(true);
    try {
      const payload = buildKidsCharacterPayload({ name, heroTypeId, speciesId, backgroundId, favoriteId, gearId, edition });
      const res = await apiClient.post('/characters', payload);
      toast.success('Hero created!');
      navigate(`/characters/${res.data?.character_id}`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create hero');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--rq-bg-main)', color: 'var(--rq-text-primary)', padding: '28px 18px 44px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: 18 }}>
        <button
          type="button"
          onClick={() => navigate('/characters/new')}
          style={{ justifySelf: 'start', background: 'transparent', border: 'none', color: 'var(--rq-text-muted)', cursor: 'pointer', fontWeight: 700 }}
        >
          ← Back to character modes
        </button>

        <header style={{ ...sectionStyle, background: 'linear-gradient(135deg, var(--rq-bg-panel), var(--rq-bg-panel-alt))' }}>
          <p style={{ color: 'var(--rq-accent-primary)', fontWeight: 900, letterSpacing: 1.4, textTransform: 'uppercase', margin: '0 0 8px' }}>Simple hero builder</p>
          <h1 style={{ margin: 0, color: 'var(--rq-text-primary)', fontSize: 'clamp(32px, 6vw, 58px)', lineHeight: 1 }}>Build a hero in plain English</h1>
          <p style={{ color: 'var(--rq-text-secondary)', fontSize: 17, lineHeight: 1.6, maxWidth: 760 }}>
            Pick the kind of hero you want. Rook keeps the big rules under the table and saves a real character sheet underneath.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 180px', gap: 12, maxWidth: 620 }}>
            <label style={{ color: 'var(--rq-text-muted)', display: 'grid', gap: 6, fontSize: 13, fontWeight: 800 }}>
              Hero name
              <input
                data-testid="kids-name"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Enter a hero name..."
                style={{ padding: '13px 14px', borderRadius: 12, border: '1px solid var(--rq-accent-border)', background: 'var(--rq-bg-input)', color: 'var(--rq-text-primary)', fontSize: 16 }}
              />
            </label>
            <label style={{ color: 'var(--rq-text-muted)', display: 'grid', gap: 6, fontSize: 13, fontWeight: 800 }}>
              Rules
              <select
                data-testid="kids-edition"
                value={edition}
                onChange={event => setEdition(event.target.value)}
                style={{ padding: '13px 14px', borderRadius: 12, border: '1px solid var(--rq-accent-border)', background: 'var(--rq-bg-input)', color: 'var(--rq-text-primary)', fontSize: 16 }}
              >
                <option value="2014">2014</option>
                <option value="2024">2024</option>
              </select>
            </label>
          </div>
        </header>

        <ChoiceCards title="1. What kind of hero?" helper="Choose a simple hero idea. Rook turns it into a real class." items={KIDS_HERO_TYPES} selectedId={heroTypeId} onSelect={setHeroTypeId} testPrefix="kids-hero" />
        <ChoiceCards title="2. What do they look like?" helper="Choose your hero's people/species." items={KIDS_SPECIES} selectedId={speciesId} onSelect={setSpeciesId} testPrefix="kids-species" />
        <ChoiceCards title="3. What is their story?" helper="Pick where your hero learned their first lessons." items={KIDS_BACKGROUNDS} selectedId={backgroundId} onSelect={setBackgroundId} testPrefix="kids-background" />
        <ChoiceCards title="4. What are they good at?" helper="This adds a favourite skill without making you count rules." items={KIDS_FAVORITES} selectedId={favoriteId} onSelect={setFavoriteId} testPrefix="kids-favorite" />
        <ChoiceCards title="5. What gear feels right?" helper="Choose a simple gear style. Rook will still save real equipment." items={KIDS_GEAR} selectedId={gearId} onSelect={setGearId} testPrefix="kids-gear" />

        <section style={{ ...sectionStyle, borderColor: 'var(--rq-accent-border)' }} data-testid="kids-review">
          <h2 style={{ margin: '0 0 10px', color: 'var(--rq-accent-hover)' }}>Review your hero</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {[
              ['Class', preview.character_class],
              ['Species', preview.subrace ? `${preview.subrace} ${preview.race}` : preview.race],
              ['Background', preview.background],
              ['HP', preview.max_hit_points],
              ['AC', preview.armor_class],
              ['Skills', preview.skill_proficiencies?.join(', ') || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--rq-bg-panel-alt)', border: '1px solid var(--rq-border-default)', borderRadius: 14, padding: 12 }}>
                <span style={{ color: 'var(--rq-text-muted)', display: 'block', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</span>
                <strong style={{ color: 'var(--rq-text-primary)', fontSize: 16 }}>{value}</strong>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--rq-text-secondary)', lineHeight: 1.5 }}>
            This creates a real saved sheet with abilities, HP, AC, speed, proficiencies, languages, traits, class features, equipment, and starter spells where needed.
          </p>
          <button
            type="button"
            data-testid="kids-create"
            disabled={saving}
            onClick={createHero}
            style={{ width: '100%', padding: '15px 18px', borderRadius: 14, border: '1px solid var(--rq-accent-primary)', background: saving ? 'var(--rq-bg-elevated)' : 'var(--rq-accent-primary)', color: 'var(--rq-bg-main)', fontSize: 17, fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Creating hero…' : 'Create this hero'}
          </button>
        </section>
      </div>
    </main>
  );
}
