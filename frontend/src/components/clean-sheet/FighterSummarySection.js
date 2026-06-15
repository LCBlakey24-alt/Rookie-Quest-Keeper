import React from 'react';
import { isFighterCharacter as isFighter } from '@/data/fighterCharacterShape';
import { getFighterSheetSummary } from '@/data/fighterSheetSummary';
import FighterSubclassSummaryPanel from './FighterSubclassSummaryPanel';

export default function FighterSummarySection({ character }) {
  if (!isFighter(character)) return null;

  const summary = getFighterSheetSummary(character);
  return <FighterSubclassSummaryPanel summary={summary} />;
}
