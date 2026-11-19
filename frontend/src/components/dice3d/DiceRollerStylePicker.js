import React, { useEffect, useState } from 'react';

import { TOWER_SKIN_CATALOG } from '@/components/dice3d/towerSkinCatalog';
import {
  DICE_STYLES,
  loadDiceStyle,
  loadTowerSkinId,
  saveDiceStyle,
  saveTowerSkinId,
  subscribeDiceStyle,
} from '@/lib/diceStylePreference';
import './DiceRollerStylePicker.css';

/**
 * What plays in the result window after a roll: the 3D dice tray or the 3D
 * dice tower, and with the tower, which design. Lives in Settings; the
 * roller itself never changes. Cosmetic only -- results come from the dice
 * engine either way -- and saved on this device.
 */
export default function DiceRollerStylePicker({ compact = false }) {
  const [style, setStyle] = useState(loadDiceStyle);
  const [towerSkin, setTowerSkin] = useState(loadTowerSkinId);

  useEffect(() => subscribeDiceStyle((next) => {
    setStyle(next.style);
    setTowerSkin(next.towerSkin);
  }), []);

  return (
    <div className={`rq-roller-style${compact ? ' is-compact' : ''}`} data-testid="dice-roller-style">
      <fieldset className="rq-roller-style__modes">
        <legend>Dice animation</legend>
        <div className="rq-roller-style__options" role="radiogroup" aria-label="Dice animation">
          {DICE_STYLES.map((option) => (
            <label key={option.id} className={`rq-roller-style__option${style === option.id ? ' is-selected' : ''}`}>
              <input
                type="radio"
                name="rq-roller-style"
                value={option.id}
                checked={style === option.id}
                onChange={() => setStyle(saveDiceStyle(option.id))}
                data-testid={`dice-style-${option.id}`}
              />
              <span>{option.name}</span>
            </label>
          ))}
        </div>
        {!compact && (
          <p className="rq-roller-style__hint">{DICE_STYLES.find((option) => option.id === style)?.blurb}</p>
        )}
      </fieldset>

      {style === 'tower' && (
        <fieldset className="rq-roller-style__skins">
          <legend>Tower design</legend>
          <div className="rq-roller-style__skin-list" role="radiogroup" aria-label="Tower design">
            {TOWER_SKIN_CATALOG.map((skin) => (
              <label
                key={skin.id}
                className={`rq-roller-style__skin${towerSkin === skin.id ? ' is-selected' : ''}`}
                title={skin.blurb}
              >
                <input
                  type="radio"
                  name="rq-tower-skin"
                  value={skin.id}
                  checked={towerSkin === skin.id}
                  onChange={() => setTowerSkin(saveTowerSkinId(skin.id))}
                  data-testid={`tower-skin-${skin.id}`}
                />
                <span
                  className="rq-roller-style__swatch"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(135deg, ${skin.panel.color} 0 55%, ${skin.edge} 55% 70%, ${skin.plank.color} 70%)` }}
                />
                <span>{skin.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
