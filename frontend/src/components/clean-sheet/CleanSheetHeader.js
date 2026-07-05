import React from 'react';
import { Edit3, Moon, Sun, TrendingUp } from 'lucide-react';
import './CleanSheetHeaderCompact.css';
import './CleanSheetFinalHammer.css';

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

function formatSubtitleParts(parts) {
  return parts.map((part) => titleCaseSlug(part)).filter(Boolean);
}

function compactSubtitleParts(character, fallbackSubtitle) {
  const directParts = [
    character?.race,
    character?.character_class,
    character?.subclass,
  ].filter(Boolean);

  if (directParts.length) return formatSubtitleParts(directParts);

  return formatSubtitleParts(String(fallbackSubtitle || '').split('•')).filter((part) => !/^level\s+\d+/i.test(part));
}

export default function CleanSheetHeader({ character, subtitle, onEdit, onLevelUp, onShortRest, onLongRest, resting }) {
  const subtitleParts = compactSubtitleParts(character, subtitle);
  const primaryLine = subtitleParts.slice(0, 2).join(' • ');
  const secondaryLine = subtitleParts[2] || '';
  const levelLabel = `Level ${character?.level || 1}`;

  const confirmRest = (type) => {
    const isLongRest = type === 'long';
    const message = isLongRest
      ? 'Take a Long Rest? This may restore HP, reset temporary HP, restore spell slots/resources, reset death saves, and recover hit dice where the sheet supports it.'
      : 'Take a Short Rest? This may restore short-rest resources and allow hit dice recovery where the sheet supports it.';
    if (!window.confirm(message)) return;
    if (isLongRest) onLongRest?.();
    else onShortRest?.();
  };

  return (
    <>
      <header className="clean-sheet-header clean-sheet-header--simple">
        <div className="clean-sheet-identity">
          <span className="clean-sheet-hero-level-badge">{levelLabel}</span>
          <h1>{character.name}</h1>
          <p className="clean-sheet-hero-subtitle" aria-label={[...subtitleParts, levelLabel].join(' • ')}>
            {primaryLine && <span className="clean-sheet-hero-subtitle-line clean-sheet-hero-subtitle-line--primary">{primaryLine}</span>}
            {secondaryLine && <span className="clean-sheet-hero-subtitle-line clean-sheet-hero-subtitle-line--secondary">{secondaryLine}</span>}
          </p>
        </div>
      </header>
      <div className="clean-sheet-header-actions clean-sheet-header-actions--play" aria-label="Character sheet actions">
        <button className="clean-sheet-level" onClick={onLevelUp} type="button">
          <TrendingUp size={18} /> Level Up
        </button>
        <button className="clean-sheet-edit" onClick={onEdit} type="button">
          <Edit3 size={18} /> Edit
        </button>
        <button className="clean-sheet-rest clean-sheet-rest--short" onClick={() => confirmRest('short')} type="button" disabled={resting}>
          <Moon size={17} /> Short Rest
        </button>
        <button className="clean-sheet-rest clean-sheet-rest--long" onClick={() => confirmRest('long')} type="button" disabled={resting}>
          <Sun size={17} /> Long Rest
        </button>
      </div>
    </>
  );
}
