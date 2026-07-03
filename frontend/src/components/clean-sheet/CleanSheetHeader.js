import React from 'react';
import { Edit3, TrendingUp } from 'lucide-react';
import './CleanSheetHeaderCompact.css';

const SMALL_WORDS = new Set(['of', 'the', 'and', 'or', 'a', 'an', 'to', 'in']);
const ACRONYMS = new Set(['ac', 'dc', 'hp', 'str', 'dex', 'con', 'int', 'wis', 'cha']);

function titleCaseSlug(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^lv\s*\d+/i.test(raw)) return raw.replace(/^lv/i, 'Lv');

  const wrapped = raw.match(/^\((.*)\)$/);
  const text = wrapped ? wrapped[1] : raw;
  const formatted = text
    .replace(/[‐‑‒–—―]+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\bdash\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join(' ');

  return wrapped ? `(${formatted})` : formatted;
}

function formatSubtitle(subtitle) {
  return String(subtitle || '')
    .split('•')
    .map((part) => titleCaseSlug(part))
    .filter(Boolean)
    .join(' • ');
}

function compactSubtitle(character, fallbackSubtitle) {
  const parts = [
    character?.race,
    character?.character_class,
    character?.subclass,
    `Level ${character?.level || 1}`,
  ].filter(Boolean);
  return formatSubtitle(parts.join(' • ') || fallbackSubtitle);
}

export default function CleanSheetHeader({ character, subtitle, onEdit, onLevelUp }) {
  return (
    <>
      <header className="clean-sheet-header clean-sheet-header--simple">
        <div className="clean-sheet-identity">
          <h1>{character.name}</h1>
          <p>{compactSubtitle(character, subtitle)}</p>
        </div>
      </header>
      <div className="clean-sheet-header-actions" aria-label="Character sheet actions">
        <button className="clean-sheet-level" onClick={onLevelUp} type="button">
          <TrendingUp size={18} /> Level Up
        </button>
        <button className="clean-sheet-edit" onClick={onEdit} type="button">
          <Edit3 size={18} /> Edit
        </button>
      </div>
    </>
  );
}
