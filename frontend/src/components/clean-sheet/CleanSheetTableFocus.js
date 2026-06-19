import React from 'react';
import { Backpack, BookOpen, Edit3, Sparkles, Swords, TrendingUp } from 'lucide-react';

export default function CleanSheetTableFocus({ onSelectTab, onLevelUp }) {
  return (
    <section className="clean-sheet-table-focus" data-testid="player-table-focus">
      <div className="clean-sheet-table-focus-copy">
        <span><Sparkles size={16} /> At the table</span>
        <strong>Everything you need on your turn, with fewer taps.</strong>
        <p>Jump straight to attacks, spells, items, notes, or level-up without hunting through the full sheet.</p>
      </div>
      <div className="clean-sheet-table-focus-actions">
        <button type="button" onClick={() => onSelectTab('combat')}>
          <Swords size={17} /> Combat
        </button>
        <button type="button" onClick={() => onSelectTab('spells')}>
          <BookOpen size={17} /> Spells
        </button>
        <button type="button" onClick={() => onSelectTab('inventory')}>
          <Backpack size={17} /> Items
        </button>
        <button type="button" onClick={() => onSelectTab('notes')}>
          <Edit3 size={17} /> Notes
        </button>
        <button type="button" onClick={onLevelUp}>
          <TrendingUp size={17} /> Level Up
        </button>
      </div>
    </section>
  );
}
