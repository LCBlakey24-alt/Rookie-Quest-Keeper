import React, { useState } from 'react';

import DiceRollFlicker from '@/components/DiceRollFlicker';
import { loadDiceDyeId } from '@/lib/diceDyePreference';
import LevelUpCelebration from './LevelUpCelebration';

/** The single d20 a level-up throw shows: it lands on the new level. */
export function levelUpDie(toLevel) {
  const level = Math.min(20, Math.max(1, Math.round(Number(toLevel) || 1)));
  return [{ sides: 20, result: level, sign: 1 }];
}

/**
 * The moment a granted level up is taken: a D20 rolls in the hexagon window
 * and lands on the new level, then "Congratulations!" names the level, then
 * the level-up choices open (`onContinue`).
 *
 * The die is ceremony, not chance: the GM chose the level. It is never
 * recorded as a roll (the dice window only records the 'player' theme).
 * Reduced motion shows the plain result card instead of the 3D throw, as
 * every roll does.
 */
export default function LevelUpReveal({ characterName, fromLevel, toLevel, onContinue, onLater, anchorSelector }) {
  const [stage, setStage] = useState('roll');
  const [rollId] = useState(() => `level-up-${toLevel}-${Date.now()}`);

  if (stage === 'roll') {
    return (
      <DiceRollFlicker
        rollId={rollId}
        isOpen
        onClose={() => setStage('congrats')}
        label={`Level ${toLevel}`}
        rolls={levelUpDie(toLevel)}
        total={Number(toLevel)}
        modifier={0}
        dyeId={loadDiceDyeId()}
        theme="level-up"
        shape="hex"
        anchorSelector={anchorSelector}
        resultCaption={`Welcome to level ${toLevel}`}
      />
    );
  }

  return (
    <LevelUpCelebration
      grant={{ from_level: fromLevel, to_level: toLevel, character_name: characterName }}
      title="Congratulations!"
      message={(
        <>
          <strong>{characterName || 'Your character'}</strong> has levelled up to level {toLevel}.
        </>
      )}
      primaryLabel={`Choose level ${toLevel} options`}
      secondaryLabel="Later"
      onLevelUp={onContinue}
      onLater={onLater}
    />
  );
}
