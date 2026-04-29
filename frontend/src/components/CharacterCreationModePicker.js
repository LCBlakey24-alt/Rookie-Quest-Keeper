import React from 'react';
import { useNavigate } from 'react-router-dom';

const modes = [
  { key: 'premade', title: 'Premade Characters', description: 'Choose a ready-to-play hero, then pick how much control you want over future choices.' },
  { key: 'basic', title: 'Basic Build', description: 'Only pick name, level, class, and race. We auto-fill the rest.' },
  { key: 'full', title: 'Full Creation', description: 'Complete control over background, ability scores, skills, and detailed setup.' },
  { key: 'kids', title: 'Kids Mode', description: 'Simple choices, plain language, and family-friendly character setup.' }
];

export default function CharacterCreationModePicker() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#0F0A1E', color: '#F8FAFC' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Choose Your Character Creation Mode</h1>
        <p style={{ color: '#94A3B8', marginBottom: 24 }}>Pick the experience that matches how you want to play.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {modes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => navigate(`/characters/new/${mode.key}`)}
              style={{ textAlign: 'left', padding: 18, borderRadius: 14, border: '1px solid rgba(138,43,226,.35)', background: 'rgba(26,17,46,.7)', color: 'inherit', cursor: 'pointer' }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{mode.title}</div>
              <div style={{ color: '#94A3B8', fontSize: 14 }}>{mode.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
