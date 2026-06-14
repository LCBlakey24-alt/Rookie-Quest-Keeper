import React from 'react';
import { getFighterSheetSummary } from '@/data/fighterSheetSummary';
import FighterSubclassSummaryPanel from './FighterSubclassSummaryPanel';

function normaliseName(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isFighterCharacter(character = {}) {
  if (normaliseName(character?.character_class || character?.className || character?.class) === 'fighter') return true;

  const levels = character?.class_levels || character?.classLevels || character?.multiclass_levels || {};
  if (Number(levels.fighter || levels.Fighter || 0) > 0) return true;

  const entries = Array.isArray(character?.classes) ? character.classes : [];
  return entries.some(entry => normaliseName(entry?.name || entry?.class_name || entry?.className || entry?.class) === 'fighter');
}

export default function FighterSummarySection({ character }) {
  if (!isFighterCharacter(character)) return null;

  const summary = getFighterSheetSummary(character);
  return <FighterSubclassSummaryPanel summary={summary} />;
}
