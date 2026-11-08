import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import BattlefieldPicker, { battlefieldModeFor } from './BattlefieldPicker';
import { normaliseCombatTerrain } from '@/data/genericCombatTerrain';

// The active Encounters page edits only battlefield fields. It never sends
// stale combatants, NPC stats, initiative or loot back in a map-only PUT.
export default function SavedEncounterBattlefieldEditor({ campaignId, scenario, onSaved }) {
  const [maps, setMaps] = useState([]);
  const [mode, setMode] = useState(() => battlefieldModeFor(scenario));
  const [mapId, setMapId] = useState(() => String(scenario?.map_id || scenario?.mapId || ''));
  const [terrain, setTerrain] = useState(() => normaliseCombatTerrain(scenario?.terrain_type));
  const [columns, setColumns] = useState(() => scenario?.grid_cols || 30);
  const [rows, setRows] = useState(() => scenario?.grid_rows || 20);
  const [feet, setFeet] = useState(() => scenario?.feet_per_square || 5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(battlefieldModeFor(scenario));
    setMapId(String(scenario?.map_id || scenario?.mapId || ''));
    setTerrain(normaliseCombatTerrain(scenario?.terrain_type));
    setColumns(scenario?.grid_cols || 30);
    setRows(scenario?.grid_rows || 20);
    setFeet(scenario?.feet_per_square || 5);
  }, [scenario]);

  useEffect(() => {
    let cancelled = false;
    setMaps([]);
    if (!campaignId) return undefined;
    apiClient.get(`/campaigns/${campaignId}/maps`)
      .then(response => { if (!cancelled) setMaps(Array.isArray(response.data) ? response.data : []); })
      .catch(() => { if (!cancelled) setMaps([]); });
    return () => { cancelled = true; };
  }, [campaignId]);

  if (!scenario?.id || !campaignId) return null;

  const dirty = mode !== battlefieldModeFor(scenario)
    || (mode === 'saved' && mapId !== String(scenario.map_id || scenario.mapId || ''))
    || (mode === 'generic' && terrain !== normaliseCombatTerrain(scenario.terrain_type))
    || (mode !== 'saved' && (columns !== (scenario.grid_cols || 30)
      || rows !== (scenario.grid_rows || 20) || feet !== (scenario.feet_per_square || 5)));

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/combat-scenarios/${scenario.id}`, {
        battlefield_mode: mode,
        map_id: mode === 'saved' ? mapId : '',
        map_url: mode === 'saved' && !mapId ? (scenario.map_url || null) : null,
        terrain_type: mode === 'generic' ? terrain : 'stone',
        grid_cols: columns,
        grid_rows: rows,
        feet_per_square: feet,
      });
      if (!response?.data || String(response.data.id) !== String(scenario.id)) {
        throw new Error('Unexpected encounter save response');
      }
      // The parent replaces its selected encounter with the canonical saved
      // record; do not claim a save before the server confirms it.
      onSaved?.(response.data);
      toast.success('Encounter battlefield saved');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save battlefield; your changes remain in the editor');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setMode(battlefieldModeFor(scenario));
    setMapId(String(scenario.map_id || scenario.mapId || ''));
    setTerrain(normaliseCombatTerrain(scenario.terrain_type));
    setColumns(scenario.grid_cols || 30);
    setRows(scenario.grid_rows || 20);
    setFeet(scenario.feet_per_square || 5);
  };

  return (
    <details data-testid="saved-encounter-battlefield-editor" style={{
      border: '1px solid var(--rq-border-default)', padding: 12,
      background: 'var(--rq-bg-panel)', marginTop: 12, color: 'var(--rq-text-primary)',
    }}>
      <summary style={{ cursor: 'pointer', fontWeight: 850, paddingBottom: 8 }}>Edit saved encounter battlefield</summary>
      <div style={{ display: 'grid', gap: 12 }}>
        <BattlefieldPicker mode={mode} terrainType={terrain} maps={maps}
          mapId={mapId} compact onModeChange={setMode} onMapIdChange={setMapId}
          onTerrainChange={value => setTerrain(normaliseCombatTerrain(value))} />
        {mode !== 'saved' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              ['Map columns',columns,setColumns,5,100],
              ['Map rows',rows,setRows,5,100],
              ['Feet per square',feet,setFeet,1,100],
            ].map(([label,value,setValue,min,max]) => (
              <label key={label} style={{ display: 'grid', gap: 5, fontSize: 12 }}>
                {label}
                <input type="number" min={min} max={max} value={value}
                  onChange={event => setValue(Math.max(min,Math.min(max,Number(event.target.value)||min)))}
                  style={{ width: 100, padding: 8, background: '#132d40', color: '#fff', border: '1px solid #758393' }} />
              </label>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12, opacity: .78, margin: 0 }}>
          These changes update the saved encounter only after you press Save. Live combatants and character sheets are not edited.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={!dirty || saving} onClick={save}
            style={{ padding: '9px 13px', cursor: dirty ? 'pointer' : 'default',
              background: 'var(--rq-card)', color: 'var(--rq-text-primary)',
              border: '1px solid var(--rq-accent-primary)' }}>
            {saving ? 'Saving…' : 'Save battlefield changes'}
          </button>
          <button type="button" disabled={!dirty || saving} onClick={reset}
            style={{ padding: '9px 13px', background: 'transparent',
              color: 'var(--rq-text-primary)', border: '1px solid var(--rq-border-default)' }}>
            Discard changes
          </button>
        </div>
      </div>
    </details>
  );
}
