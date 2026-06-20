import React from 'react';
import { ArrowLeft, Edit3, TrendingUp, User } from 'lucide-react';

export default function CleanSheetHeader({ character, subtitle, onBack, onEdit, onLevelUp }) {
  return (
    <header className="clean-sheet-header">
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
      <div className="clean-sheet-header-actions">
        <button className="clean-sheet-level" onClick={onLevelUp}>
          <TrendingUp size={18} /> Level Up
        </button>
        <button className="clean-sheet-edit" onClick={onEdit}>
          <Edit3 size={18} /> Edit
        </button>
      </div>
    </header>
  );
}
