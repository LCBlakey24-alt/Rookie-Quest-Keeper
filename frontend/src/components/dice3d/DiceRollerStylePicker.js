import React, { useEffect, useState } from 'react';

import { TOWER_SKIN_CATALOG } from '@/components/dice3d/towerSkinCatalog';
import { DICE_DYES } from '@/components/dice3d/diceDyes';
import { loadDiceDyeId, saveDiceDyeId, subscribeDiceDye } from '@/lib/diceDyePreference';
import {
  DICE_STYLES,
  RANDOM_TOWER_SKIN_ID,
  TOWER_CAMERAS,
  loadDiceStyle,
  loadTowerCamera,
  loadTowerSkinId,
  saveDiceStyle,
  saveTowerCamera,
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
export default function DiceRollerStylePicker({ compact = false, onTestRoll }) {
  const [style, setStyle] = useState(loadDiceStyle);
  const [towerSkin, setTowerSkin] = useState(loadTowerSkinId);
  const [towerCamera, setTowerCamera] = useState(loadTowerCamera);
  const [dyeId, setDyeId] = useState(loadDiceDyeId);

  useEffect(() => subscribeDiceStyle((next) => {
    setStyle(next.style);
    setTowerSkin(next.towerSkin);
    setTowerCamera(next.towerCamera);
  }), []);
  useEffect(() => subscribeDiceDye(setDyeId), []);

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
            <label
              className={`rq-roller-style__skin${towerSkin === RANDOM_TOWER_SKIN_ID ? ' is-selected' : ''}`}
              title="A different tower drops your dice each roll."
            >
              <input
                type="radio"
                name="rq-tower-skin"
                value={RANDOM_TOWER_SKIN_ID}
                checked={towerSkin === RANDOM_TOWER_SKIN_ID}
                onChange={() => setTowerSkin(saveTowerSkinId(RANDOM_TOWER_SKIN_ID))}
                data-testid={`tower-skin-${RANDOM_TOWER_SKIN_ID}`}
              />
              <span className="rq-roller-style__swatch rq-roller-style__swatch--surprise" aria-hidden="true">?</span>
              <span>Surprise me</span>
            </label>
          </div>
          {!compact && towerSkin === RANDOM_TOWER_SKIN_ID && (
            <p className="rq-roller-style__hint">A different tower drops your dice each roll.</p>
          )}
        </fieldset>
      )}

      {style === 'tower' && (
        <fieldset className="rq-roller-style__modes">
          <legend>Tower camera</legend>
          <div className="rq-roller-style__options" role="radiogroup" aria-label="Tower camera">
            {TOWER_CAMERAS.map((option) => (
              <label key={option.id} className={`rq-roller-style__option${towerCamera === option.id ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="rq-tower-camera"
                  value={option.id}
                  checked={towerCamera === option.id}
                  onChange={() => setTowerCamera(saveTowerCamera(option.id))}
                  data-testid={`tower-camera-${option.id}`}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
          {!compact && (
            <p className="rq-roller-style__hint">{TOWER_CAMERAS.find((option) => option.id === towerCamera)?.blurb}</p>
          )}
        </fieldset>
      )}

      {!compact && (
        <fieldset className="rq-roller-style__dyes">
          <legend>Dice colour</legend>
          <div className="rq-roller-style__dye-list" role="radiogroup" aria-label="Dice colour">
            {DICE_DYES.map((dye) => (
              <label key={dye.id} className={`rq-roller-style__dye${dyeId === dye.id ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="rq-dice-dye"
                  value={dye.id}
                  checked={dyeId === dye.id}
                  onChange={() => setDyeId(saveDiceDyeId(dye.id))}
                  data-testid={`settings-dice-dye-${dye.id}`}
                />
                <span
                  className="rq-roller-style__die"
                  aria-hidden="true"
                  style={{ background: dye.body, borderColor: dye.edge, color: dye.ink }}
                >20</span>
                <span>{dye.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {onTestRoll && (
        <button type="button" className="rq-roller-style__test" onClick={onTestRoll} data-testid="dice-style-test-roll">
          Roll a test d20
        </button>
      )}
    </div>
  );
}
