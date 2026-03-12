import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Search, Plus, UserPlus, Shield, Heart, Sword, X, Check,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function NPCCombatRecruiter({ campaignId, onAddNPC, existingCombatantIds = [] }) {
  const [npcs, setNpcs] = useState([]);
  const [customCreatures, setCustomCreatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('npcs'); // 'npcs' or 'creatures'
  
  useEffect(() => {
    if (expanded) {
      fetchNPCs();
      fetchCustomCreatures();
    }
  }, [expanded, campaignId]);
  
  const fetchNPCs = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/npcs`);
      setNpcs(response.data || []);
    } catch (error) {
      console.error('Failed to fetch NPCs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCustomCreatures = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/custom-creatures`);
      setCustomCreatures(response.data || []);
    } catch (error) {
      console.error('Failed to fetch creatures:', error);
    }
  };
  
  const filteredNPCs = npcs.filter(npc => 
    npc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !existingCombatantIds.includes(`npc-${npc.id}`)
  );
  
  const filteredCreatures = customCreatures.filter(creature =>
    creature.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !existingCombatantIds.includes(`creature-${creature.id}`)
  );
  
  const addToCombat = (entity, type) => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const dexMod = type === 'npc' ? 0 : Math.floor(((entity.dexterity || 10) - 10) / 2);
    
    const combatant = {
      id: `${type}-${entity.id}-${Date.now()}`,
      name: entity.name,
      type: type === 'npc' ? 'ally' : 'enemy',
      hp: entity.hp || 10,
      maxHp: entity.hp || 10,
      ac: entity.ac || 10,
      initiative: roll + dexMod,
      initiativeRoll: roll,
      initiativeMod: dexMod,
      conditions: [],
      isEnemy: type !== 'npc',
      abilities: entity.abilities || entity.description || '',
      deathSaves: { successes: 0, failures: 0 },
      sourceId: entity.id,
      sourceType: type
    };
    
    if (onAddNPC) {
      onAddNPC(combatant);
      toast.success(`${entity.name} joined combat! (Initiative: ${combatant.initiative})`);
    }
  };
  
  if (!expanded) {
    return (
      <Button
        onClick={() => setExpanded(true)}
        data-testid="recruit-npc-btn"
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '400'
        }}
      >
        <UserPlus size={16} />
        Add NPCs/Creatures to Combat
      </Button>
    );
  }
  
  return (
    <div style={{
      background: 'rgba(10, 10, 46, 0.95)',
      border: '2px solid #22c55e',
      borderRadius: '14px',
      padding: '16px',
      marginTop: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ 
          color: '#22c55e', 
          fontSize: '15px', 
          fontWeight: '400',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <UserPlus size={18} />
          Recruit to Combat
        </h3>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <X size={18} color="#64748b" />
        </button>
      </div>
      
      {/* Tab Selection */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '12px' 
      }}>
        <button
          onClick={() => setSelectedTab('npcs')}
          style={{
            flex: 1,
            padding: '10px',
            background: selectedTab === 'npcs' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(30, 30, 60, 0.5)',
            border: `2px solid ${selectedTab === 'npcs' ? '#22c55e' : '#374151'}`,
            borderRadius: '10px',
            color: selectedTab === 'npcs' ? '#22c55e' : '#94a3b8',
            fontSize: '13px',
            fontWeight: '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Users size={14} />
          NPCs ({npcs.length})
        </button>
        <button
          onClick={() => setSelectedTab('creatures')}
          style={{
            flex: 1,
            padding: '10px',
            background: selectedTab === 'creatures' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 30, 60, 0.5)',
            border: `2px solid ${selectedTab === 'creatures' ? '#ef4444' : '#374151'}`,
            borderRadius: '10px',
            color: selectedTab === 'creatures' ? '#ef4444' : '#94a3b8',
            fontSize: '13px',
            fontWeight: '400',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Sword size={14} />
          Creatures ({customCreatures.length})
        </button>
      </div>
      
      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={16} style={{ 
          position: 'absolute', 
          left: '12px', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: '#64748b' 
        }} />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={`Search ${selectedTab}...`}
          data-testid="npc-search-input"
          style={{
            paddingLeft: '38px',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px solid #374151'
          }}
        />
      </div>
      
      {/* Entity List */}
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>
            <Loader2 size={24} color="#64748b" className="animate-spin" style={{ margin: '0 auto' }} />
          </div>
        ) : selectedTab === 'npcs' ? (
          filteredNPCs.length > 0 ? (
            filteredNPCs.map(npc => (
              <div
                key={npc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    color: '#fff', 
                    fontWeight: '400', 
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {npc.name}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    fontSize: '11px', 
                    color: '#94a3b8' 
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Heart size={12} color="#ef4444" /> {npc.hp || 10}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={12} color="#3b82f6" /> {npc.ac || 10}
                    </span>
                    {npc.location && (
                      <span style={{ color: '#64748b' }}>
                        {npc.location}
                      </span>
                    )}
                  </div>
                  {npc.description && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#64748b', 
                      marginTop: '4px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {npc.description}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => addToCombat(npc, 'npc')}
                  data-testid={`add-npc-${npc.id}`}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <Plus size={14} />
                  Add Ally
                </Button>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>{searchTerm ? 'No matching NPCs' : 'No NPCs in this campaign'}</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>
                Create NPCs in the campaign dashboard
              </p>
            </div>
          )
        ) : (
          filteredCreatures.length > 0 ? (
            filteredCreatures.map(creature => (
              <div
                key={creature.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <span style={{ 
                      color: '#fff', 
                      fontWeight: '400', 
                      fontSize: '14px'
                    }}>
                      {creature.name}
                    </span>
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '400'
                    }}>
                      CR {creature.cr || '?'}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    fontSize: '11px', 
                    color: '#94a3b8' 
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Heart size={12} color="#ef4444" /> {creature.hp || 10}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={12} color="#3b82f6" /> {creature.ac || 10}
                    </span>
                    <span style={{ color: '#64748b' }}>
                      {creature.size || 'Medium'} {creature.type || 'creature'}
                    </span>
                  </div>
                  {creature.abilities && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#64748b', 
                      marginTop: '4px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {creature.abilities}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => addToCombat(creature, 'creature')}
                  data-testid={`add-creature-${creature.id}`}
                  style={{
                    padding: '8px 12px',
                    background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <Plus size={14} />
                  Add Enemy
                </Button>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <Sword size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>{searchTerm ? 'No matching creatures' : 'No custom creatures'}</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>
                Create creatures in the Creatures tab
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default NPCCombatRecruiter;
