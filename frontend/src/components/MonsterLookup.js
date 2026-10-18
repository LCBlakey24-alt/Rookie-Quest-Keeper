import React, { useMemo, useState } from 'react';
import { Plus, Search, Skull, X } from 'lucide-react';
import { MONSTER_DATABASE } from '@/data/monsterDatabase';
import NpcCompactStatBlock from '@/components/gm/NpcCompactStatBlock';

// Use the same real D&D stat-block layout as the Bestiary and campaign NPCs.
export default function MonsterLookup({ onAddToCombat }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonster, setSelectedMonster] = useState(null);
  const results = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];
    return MONSTER_DATABASE.filter(monster => [monster.name, monster.type, monster.subtype]
      .some(value => String(value || '').toLowerCase().includes(query))).slice(0, 20);
  }, [searchTerm]);
  const border = '1px solid var(--rq-line, rgba(137,157,176,.14))';
  const ink = 'var(--rq-text-primary, #EADFC8)';
  const muted = 'var(--rq-text-muted, rgba(234,223,200,.6))';
  const panel = 'var(--rq-bg-main, #0B1B2B)';

  return (
    <section aria-label="Monster lookup" style={{ display: 'grid', gap: 10, minWidth: 0 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: panel, border, padding: '0 10px' }}>
        <Search size={16} aria-hidden="true" color="var(--rq-secondary, #6E91B4)" />
        <input
          data-testid="monster-search-input"
          value={searchTerm}
          onChange={event => { setSearchTerm(event.target.value); setSelectedMonster(null); }}
          placeholder="Search monsters... (e.g., Goblin, Dragon)"
          aria-label="Search monsters"
          style={{ minWidth: 0, width: '100%', height: 44, border: 0, outlineOffset: -2, background: 'transparent', color: ink, fontSize: 13 }}
        />
      </label>

      {selectedMonster ? (
        <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
          <button type="button" onClick={() => setSelectedMonster(null)}
            style={{ justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 36, border, padding: '4px 9px', background: panel, color: ink, cursor: 'pointer' }}>
            <X size={14} /> Back to results
          </button>
          <NpcCompactStatBlock npc={selectedMonster} />
          {onAddToCombat && (
            <button type="button" data-testid="add-monster-to-combat-btn" onClick={() => onAddToCombat(selectedMonster)}
              style={{ minHeight: 42, border: '1px solid var(--rq-line-strong, rgba(201,169,107,.3))', background: 'var(--rq-card, #263748)', color: ink, cursor: 'pointer', fontWeight: 850, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Plus size={16} /> Add to Combat
            </button>
          )}
        </div>
      ) : results.length > 0 ? (
        <div style={{ display: 'grid', gap: 3, maxHeight: 300, overflowY: 'auto', border, background: panel }}>
          {results.map(monster => (
            <button key={monster.id || monster.name} type="button" onClick={() => setSelectedMonster(monster)}
              style={{ width: '100%', padding: '10px 11px', border: 0, borderBottom: border, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, textAlign: 'left', background: 'var(--rq-bg-panel, #1E2936)', color: ink }}>
              <span style={{ display: 'grid', gap: 2 }}>
                <strong style={{ fontSize: 13 }}>{monster.name}</strong>
                <span style={{ fontSize: 11, color: muted }}>{[monster.size, monster.type].filter(Boolean).join(' ')}</span>
              </span>
              <span style={{ flexShrink: 0, fontSize: 11, color: 'var(--rq-primary, #C9A96B)', fontWeight: 850 }}>CR {monster.cr ?? '—'}</span>
            </button>
          ))}
        </div>
      ) : searchTerm.trim() ? (
        <p style={{ fontSize: 12, color: muted, margin: 0 }}>No monsters found for "{searchTerm}".</p>
      ) : (
        <div style={{ padding: 20, textAlign: 'center', border, color: muted, background: panel }}>
          <Skull size={25} style={{ margin: '0 auto 8px' }} />
          <p style={{ margin: 0, fontSize: 12 }}>Search for a beast or monster to open its full stat block.</p>
        </div>
      )}
    </section>
  );
}
