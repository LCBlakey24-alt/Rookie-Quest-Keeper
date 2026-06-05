import React from 'react';
import { Users } from 'lucide-react';
import SendItemPanel from './SendItemPanel';

export default function PartyTab({ theme, players }) {
  return (
    <div>
      <h2 style={{, fontSize: '22px', color: theme.text.primary, fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Users size={24} style={{ color: theme.accent.primary }} /> Party Overview
      </h2>
      
      {players.length === 0 ? (
        <div style={{ background: theme.bg.card, border: `1px dashed ${theme.border}`, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
          <Users size={40} style={{ color: theme.accent.primary, margin: '0 auto 16px' }} />
          <p style={{ color: theme.text.secondary, fontSize: '15px', marginBottom: '8px' }}>No players in campaign</p>
          <p style={{ color: theme.text.muted, fontSize: '14px' }}>Add players in the Players tab of your campaign dashboard</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {players.map(player => (
            <div key={player.id} style={{ background: theme.bg.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: theme.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: theme.text.primary, fontSize: '20px' }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: theme.text.primary, fontWeight: '600', fontSize: '17px' }}>{player.name}</div>
                  <div style={{ color: theme.accent.secondary, fontSize: '14px' }}>
                    {player.race || 'Unknown'} {player.class || 'Adventurer'} {player.level ? `Lv.${player.level}` : ''}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ background: 'rgba(236, 72, 153, 0.15)', border: `1px solid ${theme.accent.secondary}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: theme.accent.secondary, fontWeight: '500' }}>HP</div>
                  <div style={{ fontSize: '18px', color: theme.text.primary, fontWeight: '600' }}>{player.hp || player.max_hp || '?'}/{player.max_hp || '?'}</div>
                </div>
                <div style={{ background: 'rgba(212, 160, 23, 0.15)', border: `1px solid ${theme.accent.primary}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: theme.accent.primary, fontWeight: '500' }}>AC</div>
                  <div style={{ fontSize: '18px', color: theme.text.primary, fontWeight: '600' }}>{player.ac || '?'}</div>
                </div>
                <div style={{ background: theme.accent.gmSubtle, border: `1px solid ${theme.accent.gm}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: theme.accent.gm, fontWeight: '500' }}>INIT</div>
                  <div style={{ fontSize: '18px', color: theme.text.primary, fontWeight: '600' }}>
                    {player.stats?.dexterity ? (() => {
                      const mod = Math.floor((player.stats.dexterity - 10) / 2);
                      return mod >= 0 ? `+${mod}` : `${mod}`;
                    })() : '?'}
                  </div>
                </div>
              </div>
              
              {player.stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginTop: '14px' }}>
                  {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((stat, i) => {
                    const statKey = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'][i];
                    const val = player.stats[statKey] || 10;
                    const mod = Math.floor((val - 10) / 2);
                    return (
                      <div key={stat} style={{ textAlign: 'center', background: 'rgba(15, 10, 30, 0.5)', borderRadius: '6px', padding: '6px' }}>
                        <div style={{ fontSize: '11px', color: theme.text.muted }}>{stat}</div>
                        <div style={{ fontSize: '14px', color: theme.text.primary, fontWeight: '500' }}>{val}</div>
                        <div style={{ fontSize: '11px', color: mod >= 0 ? theme.accent.gm : theme.accent.secondary }}>{mod >= 0 ? '+' : ''}{mod}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Send Item to Player */}
      <div style={{ marginTop: '20px' }}>
        <SendItemPanel theme={theme} partyCharacters={players.map(p => ({
          id: p.id, name: p.name, level: p.level, character_class: p.class || p.character_class,
        }))} />
      </div>
    </div>
  );
}
