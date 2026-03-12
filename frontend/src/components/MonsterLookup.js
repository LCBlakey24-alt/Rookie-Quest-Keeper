import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Skull, Shield, Heart, Zap, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function MonsterLookup({ onAddToCombat }) {
  const [monsters, setMonsters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMonsters, setFilteredMonsters] = useState([]);
  const [selectedMonster, setSelectedMonster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonsters();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = monsters.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type?.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 20);
      setFilteredMonsters(filtered);
    } else {
      setFilteredMonsters([]);
    }
  }, [searchTerm, monsters]);

  const fetchMonsters = async () => {
    try {
      const response = await axios.get(`${API}/monsters`);
      setMonsters(response.data || []);
    } catch (error) {
      console.error('Failed to fetch monsters:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCR = (cr) => {
    if (cr === 0.125) return '1/8';
    if (cr === 0.25) return '1/4';
    if (cr === 0.5) return '1/2';
    return cr?.toString() || '?';
  };

  const getStatModifier = (stat) => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : mod.toString();
  };

  return (
    <div>
      {/* Search Input */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search monsters... (e.g., Goblin, Dragon)"
          data-testid="monster-search-input"
          style={{
            paddingLeft: '44px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px solid #374151',
            color: '#fff',
            fontSize: '15px'
          }}
        />
      </div>

      {/* Search Results */}
      {searchTerm && filteredMonsters.length > 0 && !selectedMonster && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '2px solid #374151',
          borderRadius: '12px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {filteredMonsters.map((monster) => (
            <div
              key={monster.name}
              onClick={() => setSelectedMonster(monster)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #1f2937',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(74, 125, 255, 0.2)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <div>
                <span style={{ color: '#fff', fontWeight: '400' }}>{monster.name}</span>
                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '10px' }}>
                  {monster.size} {monster.type}
                </span>
              </div>
              <span style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '400'
              }}>
                CR {formatCR(monster.challenge_rating)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchTerm && filteredMonsters.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
          <Skull size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No monsters found for "{searchTerm}"</p>
        </div>
      )}

      {/* Selected Monster Stat Block */}
      {selectedMonster && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(30, 30, 60, 0.9) 0%, rgba(15, 15, 35, 0.9) 100%)',
          border: '3px solid #ef4444',
          borderRadius: '16px',
          padding: '20px',
          position: 'relative'
        }}>
          {/* Close Button */}
          <button
            onClick={() => setSelectedMonster(null)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={18} color="#ef4444" />
          </button>

          {/* Monster Header */}
          <div style={{ marginBottom: '16px', paddingRight: '40px' }}>
            <h3 style={{ 
              color: '#ef4444', 
              fontSize: '22px', 
              fontWeight: '800', 
              fontFamily: 'Montserrat',
              marginBottom: '4px'
            }}>
              {selectedMonster.name}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
              {selectedMonster.size} {selectedMonster.type}, {selectedMonster.alignment || 'unaligned'}
            </p>
          </div>

          {/* AC, HP, Speed */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <Shield size={20} color="#4a7dff" style={{ margin: '0 auto 4px' }} />
              <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>AC</p>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: '800' }}>{selectedMonster.armor_class}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Heart size={20} color="#ef4444" style={{ margin: '0 auto 4px' }} />
              <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>HP</p>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: '800' }}>{selectedMonster.hit_points}</p>
              {selectedMonster.hit_dice && (
                <p style={{ color: '#64748b', fontSize: '10px' }}>({selectedMonster.hit_dice})</p>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <Zap size={20} color="#eab308" style={{ margin: '0 auto 4px' }} />
              <p style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase' }}>Speed</p>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: '400' }}>{selectedMonster.speed || '30 ft.'}</p>
            </div>
          </div>

          {/* Ability Scores */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(6, 1fr)', 
            gap: '8px',
            marginBottom: '16px'
          }}>
            {[
              { name: 'STR', value: selectedMonster.strength },
              { name: 'DEX', value: selectedMonster.dexterity },
              { name: 'CON', value: selectedMonster.constitution },
              { name: 'INT', value: selectedMonster.intelligence },
              { name: 'WIS', value: selectedMonster.wisdom },
              { name: 'CHA', value: selectedMonster.charisma }
            ].map(stat => (
              <div key={stat.name} style={{ 
                textAlign: 'center',
                padding: '8px 4px',
                background: 'rgba(74, 125, 255, 0.1)',
                borderRadius: '8px',
                border: '1px solid #1e40af'
              }}>
                <p style={{ color: '#4a7dff', fontSize: '10px', fontWeight: '400' }}>{stat.name}</p>
                <p style={{ color: '#fff', fontSize: '16px', fontWeight: '800' }}>{stat.value || 10}</p>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>{getStatModifier(stat.value || 10)}</p>
              </div>
            ))}
          </div>

          {/* Challenge Rating */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '10px',
            marginBottom: '16px'
          }}>
            <span style={{ color: '#ef4444', fontWeight: '400' }}>Challenge Rating</span>
            <span style={{ color: '#fff', fontSize: '20px', fontWeight: '800' }}>
              {formatCR(selectedMonster.challenge_rating)}
              <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>
                ({selectedMonster.xp?.toLocaleString() || '?'} XP)
              </span>
            </span>
          </div>

          {/* Actions Preview */}
          {selectedMonster.actions && selectedMonster.actions.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ color: '#ef4444', fontSize: '14px', fontWeight: '400', marginBottom: '8px', borderBottom: '2px solid #ef4444', paddingBottom: '4px' }}>
                Actions
              </h4>
              {selectedMonster.actions.slice(0, 3).map((action, idx) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: '400', fontSize: '13px' }}>{action.name}. </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                    {action.desc?.substring(0, 150)}{action.desc?.length > 150 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Add to Combat Button */}
          {onAddToCombat && (
            <Button
              onClick={() => onAddToCombat(selectedMonster)}
              className="btn-primary"
              data-testid="add-monster-to-combat-btn"
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} />
              Add to Combat
            </Button>
          )}
        </div>
      )}

      {/* Empty State */}
      {!searchTerm && !selectedMonster && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <Skull size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: '14px' }}>Search for a monster to view its stat block</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Try: Goblin, Orc, Dragon, Zombie...</p>
        </div>
      )}
    </div>
  );
}

export default MonsterLookup;
