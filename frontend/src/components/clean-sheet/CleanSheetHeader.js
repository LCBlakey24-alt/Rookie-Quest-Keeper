import React from 'react';
import { ArrowLeft, Dices, Edit3, Shield, TrendingUp, User, Zap } from 'lucide-react';

import CleanSheetProgressionStrip from './CleanSheetProgressionStrip';
import './CleanSheetHeaderStats.css';

const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const fmt = (value) => (value >= 0 ? `+${value}` : `${value}`);

export default function CleanSheetHeader({ character, subtitle, onBack, onEdit, onLevelUp }) {
  const armorClass = Number(character?.armor_class ?? character?.ac ?? 10) || 10;
  const initiative = abilityMod(character?.dexterity ?? 10);
  const proficiency = Number(character?.proficiency_bonus ?? 2) || 2;
  const speed = Number(character?.speed ?? 30) || 30;

  const quickStats = [
    { label: 'AC', value: armorClass, icon: Shield },
    { label: 'Init', value: fmt(initiative), icon: Zap },
    { label: 'Prof', value: fmt(proficiency), icon: Dices },
    { label: 'Speed', value: `${speed}ft`, icon: TrendingUp },
  ];

  return (
    <header className="clean-sheet-header clean-sheet-header--with-stats">
      <button className="clean-sheet-back" onClick={onBack}>
        <ArrowLeft size={18} /> Dashboard
      </button>
      <div className="clean-sheet-identity">
        <div className="clean-sheet-portrait">
          {character.portrait_url ? <img src={character.portrait_url} alt="" /> : <User size={30} />}
        </div>
        <div>
          <p className="clean-sheet-kicker">Character</p>
          <h1>{character.name}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="clean-sheet-header-stat-strip" aria-label="Character quick stats">
        {quickStats.map(({ label, value, icon: Icon }) => (
          <div className="clean-sheet-header-stat" key={label}>
            <Icon size={16} />
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="clean-sheet-header-actions">
        <button className="clean-sheet-level" onClick={onLevelUp}>
          <TrendingUp size={18} /> Level Up
        </button>
        <button className="clean-sheet-edit" onClick={onEdit}>
          <Edit3 size={18} /> Edit
        </button>
      </div>
      <CleanSheetProgressionStrip character={character} onLevelUp={onLevelUp} />
    </header>
  );
}
