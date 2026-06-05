import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, Trash2, Play, Pause, SkipForward, ChevronDown, ChevronUp, Dices, Shield } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function InitiativeTracker({ theme, campaignId, combatants = [] }) {
  const [entries, setEntries] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInit, setNewInit] = useState('');
  const [newHp, setNewHp] = useState('');
  const [newIsNpc, setNewIsNpc] = useState(false);

  useEffect(() => {
    if (combatants.length > 0 && entries.length === 0) {
      setEntries(combatants.map((c, i) => ({
        id: `c-${i}-${Date.now()}`,
        character_id: c.type === 'player' ? (c.id || null) : null,
        name: c.name || `Creature ${i + 1}`,
        initiative: 0,
        hp: c.hit_points || c.hp || c.maxHp || 10,
        maxHp: c.hit_points || c.hp || c.maxHp || 10,
        ac: c.armor_class || c.ac || 10,
        isNpc: c.is_npc ?? (c.type !== 'player'),
        conditions: [],
      })));
    }
  }, [combatants]);

  const addEntry = useCallback(() => {
    if (!newName.trim()) return;
    const init = parseInt(newInit) || Math.floor(Math.random() * 20) + 1;
    setEntries(prev => [...prev, {
      id: `e-${Date.now()}`,
      name: newName.trim(),
      initiative: init,
      hp: parseInt(newHp) || 10,
      maxHp: parseInt(newHp) || 10,
      ac: 10,
      isNpc: newIsNpc,
      conditions: [],
    }].sort((a, b) => b.initiative - a.initiative));
    setNewName('');
    setNewInit('');
    setNewHp('');
  }, [newName, newInit, newHp, newIsNpc]);

  const removeEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (currentTurn >= entries.length - 1) setCurrentTurn(0);
  };

  const rollAllInitiative = () => {
    setEntries(prev =>
      prev.map(e => ({ ...e, initiative: Math.floor(Math.random() * 20) + 1 }))
        .sort((a, b) => b.initiative - a.initiative)
    );
    setCurrentTurn(0);
    setRound(1);
  };

  const nextTurn = () => {
    if (entries.length === 0) return;
    const next = (currentTurn + 1) % entries.length;
    if (next === 0) setRound(r => r + 1);
    setCurrentTurn(next);
  };

  const startCombat = () => {
    if (entries.length === 0) return;
    setEntries(prev => [...prev].sort((a, b) => b.initiative - a.initiative));
    setCurrentTurn(0);
    setRound(1);
    setIsActive(true);
  };

  const adjustHp = useCallback((id, delta) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const nextHp = Math.max(0, Math.min(e.maxHp, e.hp + delta));
      // Sync back to character sheet for player characters
      if (e.character_id && nextHp !== e.hp) {
        apiClient.patch(`/characters/${e.character_id}`, { current_hit_points: nextHp })
          .catch(() => {}); // fire-and-forget; local UI stays accurate
      }
      return { ...e, hp: nextHp };
    }));
  }, []);

  const updateInitiative = (id, val) => {
    setEntries(prev =>
      prev.map(e => e.id === id ? { ...e, initiative: parseInt(val) || 0 } : e)
        .sort((a, b) => b.initiative - a.initiative)
    );
  };

  const inputStyle = {
    background: theme.bg.card || 'rgba(255,255,255,0.05)',
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    color: theme.text.primary,
    padding: '6px 8px',
    fontSize: '12px',
    outline: 'none',
  };

  return (
    <div data-testid="initiative-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '16px', color: theme.accent?.gm || theme.accent?.primary, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} /> Initiative Order
        </h3>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {isActive && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#C1121F', padding: '3px 8px', background: 'rgba(193,18,31,0.1)', borderRadius: '6px' }}>
              Round {round}
            </span>
          )}
          <button data-testid="roll-all-initiative" onClick={rollAllInitiative} disabled={entries.length === 0}
            style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: 'rgba(139,92,246,0.15)', color: '#A78BFA', border: `1px solid rgba(139,92,246,0.3)`, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Dices size={12} /> Roll All
          </button>
        </div>
      </div>

      {/* Add Entry */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'end' }}>
        <div style={{ flex: 2 }}>
          <input data-testid="init-name-input" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Name" style={{ ...inputStyle, width: '100%' }}
            onKeyDown={e => e.key === 'Enter' && addEntry()} />
        </div>
        <div style={{ flex: 1 }}>
          <input data-testid="init-roll-input" value={newInit} onChange={e => setNewInit(e.target.value)}
            placeholder="Init" type="number" style={{ ...inputStyle, width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <input data-testid="init-hp-input" value={newHp} onChange={e => setNewHp(e.target.value)}
            placeholder="HP" type="number" style={{ ...inputStyle, width: '100%' }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: theme.text.muted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={newIsNpc} onChange={e => setNewIsNpc(e.target.checked)} style={{ width: '12px', height: '12px' }} />
          NPC
        </label>
        <button data-testid="add-combatant-btn" onClick={addEntry}
          style={{ padding: '6px 10px', borderRadius: '6px', background: theme.accent?.gm || theme.accent?.primary, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
          <Plus size={14} />
        </button>
      </div>

      {/* Entries List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '340px', overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: theme.text.muted, fontSize: '12px' }}>
            Add combatants above to begin tracking initiative
          </div>
        ) : entries.map((entry, idx) => {
          const isCurrent = isActive && idx === currentTurn;
          const hpPct = entry.maxHp > 0 ? (entry.hp / entry.maxHp) * 100 : 0;
          const hpColor = hpPct > 50 ? '#10B981' : hpPct > 25 ? '#F59E0B' : '#EF4444';
          return (
            <div key={entry.id} data-testid={`init-entry-${entry.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                borderRadius: '8px', transition: 'all 0.2s',
                background: isCurrent ? 'rgba(193,18,31,0.1)' : entry.hp === 0 ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isCurrent ? 'rgba(193,18,31,0.4)' : theme.border}`,
                borderLeft: isCurrent ? '3px solid #C1121F' : `1px solid ${theme.border}`,
                opacity: entry.hp === 0 ? 0.5 : 1,
              }}>
              {/* Initiative */}
              <input value={entry.initiative} onChange={e => updateInitiative(entry.id, e.target.value)} type="number"
                style={{ ...inputStyle, width: '38px', textAlign: 'center', fontWeight: 700, fontSize: '14px', padding: '4px' }} />

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: entry.hp === 0 ? theme.text.muted : theme.text.primary,
                  textDecoration: entry.hp === 0 ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {entry.name}
                  {entry.isNpc && <span style={{ fontSize: '9px', marginLeft: '4px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>NPC</span>}
                </div>
                {/* HP Bar */}
                <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', marginTop: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '2px', width: `${hpPct}%`, background: hpColor, transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* HP Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button onClick={() => adjustHp(entry.id, -1)} style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#F87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                  <Minus size={10} />
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, color: hpColor, minWidth: '36px', textAlign: 'center' }}>
                  {entry.hp}/{entry.maxHp}
                </span>
                <button onClick={() => adjustHp(entry.id, 1)} style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', border: 'none', color: '#34D399', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                  <Plus size={10} />
                </button>
              </div>

              {/* Remove */}
              <button onClick={() => removeEntry(entry.id)} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', padding: '2px', opacity: 0.5 }}>
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: '6px' }}>
          {!isActive ? (
            <button data-testid="start-initiative-btn" onClick={startCombat}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: theme.gradient || 'linear-gradient(135deg, #C1121F, #D62839)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Play size={14} /> Start Combat
            </button>
          ) : (
            <>
              <button data-testid="next-turn-btn" onClick={nextTurn}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: 'rgba(193,18,31,0.15)', color: '#C1121F', border: `1px solid rgba(193,18,31,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <SkipForward size={14} /> Next Turn
              </button>
              <button data-testid="end-combat-btn" onClick={() => { setIsActive(false); setCurrentTurn(0); setRound(1); }}
                style={{ padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: 'rgba(239,68,68,0.15)', color: '#F87171', border: `1px solid rgba(239,68,68,0.3)` }}>
                <Pause size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
