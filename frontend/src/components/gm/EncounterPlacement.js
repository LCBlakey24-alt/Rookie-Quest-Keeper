import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Shield, Swords } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import MapCanvas from '@/components/MapBuilder/MapCanvas';
import { createGenericCombatMap } from '@/data/genericCombatTerrain';
import { combatantSide, encounterTokens, otherSide, tokensToPlacements } from '@/data/encounterPlacement';
import './EncounterPlacement.css';

/**
 * Set up a saved encounter before the fight: who is a friend and who is a
 * foe, and which square everyone starts on, on the encounter's battle map.
 * Saving stores the sides on the encounter's own combatants and the squares
 * as `placements`; Combat starts everyone there.
 */
export default function EncounterPlacement({ campaignId, scenario, combatants, onSaved }) {
  const [maps, setMaps] = useState([]);
  const [sides, setSides] = useState({});
  const [tokens, setTokens] = useState([]);
  const [saving, setSaving] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0);
  const boxRef = useRef(null);

  // Fit the whole map in the panel: squares shrink to suit its width.
  useEffect(() => {
    const element = boxRef.current;
    if (!element) return undefined;
    const measure = () => setBoxWidth(element.clientWidth || 0);
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [scenario?.id, Boolean(combatants?.length)]);

  useEffect(() => {
    let cancelled = false;
    apiClient.get(`/campaigns/${campaignId}/maps`)
      .then((response) => { if (!cancelled) setMaps(Array.isArray(response.data) ? response.data : []); })
      .catch(() => { if (!cancelled) setMaps([]); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const savedMap = scenario?.battlefield_mode !== 'generic' && scenario?.map_id
    ? maps.find((map) => String(map.id) === String(scenario.map_id)) : null;
  const map = useMemo(
    () => savedMap || createGenericCombatMap(scenario?.terrain_type || 'stone', scenario?.grid_cols, scenario?.grid_rows),
    [savedMap, scenario?.terrain_type, scenario?.grid_cols, scenario?.grid_rows],
  );

  const withSides = useMemo(
    () => (combatants || []).map((combatant) => (sides[combatant.id] ? { ...combatant, side: sides[combatant.id] } : combatant)),
    [combatants, sides],
  );

  // Fresh tokens whenever the encounter or its map changes.
  const scenarioKey = `${scenario?.id}|${map.width}x${map.height}|${(combatants || []).map((c) => c.id).join(',')}`;
  useEffect(() => {
    setSides({});
    setTokens(encounterTokens(combatants || [], scenario?.placements, map.width, map.height));
  }, [scenarioKey]);

  const toggleSide = (combatant) => {
    const next = otherSide(combatantSide({ ...combatant, side: sides[combatant.id] || combatant.side }));
    setSides((prev) => ({ ...prev, [combatant.id]: next }));
    setTokens((prev) => prev.map((token) => (token.id === combatant.id
      ? { ...token, isEnemy: next === 'enemy', isAlly: next === 'ally' } : token)));
  };

  const moveToken = (id, x, y) => {
    setTokens((prev) => {
      if (prev.some((token) => token.id !== id && token.x === x && token.y === y)) return prev; // one per square
      return prev.map((token) => (token.id === id ? { ...token, x, y } : token));
    });
  };

  const save = async () => {
    if (!scenario?.id) return;
    // Sides live on the encounter's own combatants; party members added at
    // launch are always on the party's side, but their squares are kept.
    const baseCombatants = (scenario.combatants || []).map((combatant) => (sides[combatant.id]
      ? { ...combatant, side: sides[combatant.id] } : combatant));
    const payload = { combatants: baseCombatants, placements: tokensToPlacements(tokens) };
    setSaving(true);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/combat-scenarios/${scenario.id}`, payload);
      onSaved?.(response?.data && response.data.id ? response.data : { ...scenario, ...payload });
      setSides({});
      toast.success('Starting positions saved', { description: 'Combat will start everyone on these squares.' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save positions');
    } finally {
      setSaving(false);
    }
  };

  if (!scenario?.id || !combatants?.length) return null;
  const square = boxWidth ? Math.max(14, Math.min(48, Math.floor(boxWidth / map.width))) : 40;

  return (
    <details className="rq-encounter-place" data-testid="encounter-placement">
      <summary>Friend or foe, and starting positions</summary>
      <p className="rq-encounter-place__help">
        {savedMap ? `On ${savedMap.name}.` : `On a ${map.width} × ${map.height} grid.`} Drag tokens onto their starting squares. Blue rings are friends, red are foes.
      </p>
      <ul className="rq-encounter-place__list" aria-label="Friend or foe">
        {withSides.map((combatant) => {
          const side = combatantSide(combatant);
          const fixed = combatant.type === 'player';
          return (
            <li key={combatant.id} className={`rq-encounter-place__row is-${side}`}>
              <span>{combatant.name}</span>
              {fixed ? (
                <span className="rq-encounter-place__fixed"><Shield size={14} aria-hidden="true" /> Party</span>
              ) : (
                <button type="button" aria-pressed={side === 'enemy'} onClick={() => toggleSide(combatant)}
                  aria-label={`${combatant.name} is a ${side === 'enemy' ? 'foe' : 'friend'}. Switch to ${side === 'enemy' ? 'friend' : 'foe'}`}
                  data-testid={`side-toggle-${combatant.id}`}>
                  {side === 'enemy' ? <><Swords size={14} aria-hidden="true" /> Foe</> : <><Shield size={14} aria-hidden="true" /> Friend</>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="rq-encounter-place__map" ref={boxRef} style={{ height: map.height * square + 2 }}>
        <MapCanvas
          mapData={map}
          onMapChange={() => {}}
          tool="select"
          selectedTerrain="stone"
          selectedWallType="stone"
          tokens={tokens}
          onTokenMove={moveToken}
          fogOfWar={null}
          onFogChange={() => {}}
          showGrid
          gridSize={square}
          showMovement={false}
        />
      </div>
      <div className="rq-encounter-place__actions">
        <button type="button" className="rq-encounter-place__save" onClick={save} disabled={saving} data-testid="save-placements">
          <Save size={15} aria-hidden="true" /> {saving ? 'Saving…' : 'Save positions'}
        </button>
      </div>
    </details>
  );
}
