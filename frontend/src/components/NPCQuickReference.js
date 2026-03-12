import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, Search, MapPin, ChevronDown, ChevronUp, 
  User, Scroll, Star, Eye, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// GM Theme
const theme = {
  primary: '#F59E0B',
  hover: '#D97706',
  subtle: 'rgba(225, 29, 72, 0.15)',
  bg: '#0B0F19',
  card: '#111827',
  panel: '#111827',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(212, 175, 55, 0.15)',
  success: '#22C55E',
  warning: '#F59E0B',
  cyan: '#06B6D4'
};

function NPCQuickReference({ campaignId, currentLocationId }) {
  const [npcs, setNpcs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [expandedNpcs, setExpandedNpcs] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [npcsRes, locsRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/locations`)
      ]);
      setNpcs(npcsRes.data || []);
      setLocations(locsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch NPCs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter NPCs
  const filteredNpcs = npcs.filter(npc => {
    const matchesSearch = !searchQuery || 
      npc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      npc.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      npc.occupation?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || 
      filterLocation === 'current' && npc.location_id === currentLocationId ||
      npc.location_id === filterLocation;
    
    return matchesSearch && matchesLocation;
  });

  // Group NPCs by location
  const npcsByLocation = filteredNpcs.reduce((acc, npc) => {
    const locId = npc.location_id || 'unknown';
    if (!acc[locId]) acc[locId] = [];
    acc[locId].push(npc);
    return acc;
  }, {});

  const toggleExpand = (npcId) => {
    setExpandedNpcs(prev => {
      const next = new Set(prev);
      if (next.has(npcId)) {
        next.delete(npcId);
      } else {
        next.add(npcId);
      }
      return next;
    });
  };

  const getLocationName = (locationId) => {
    const loc = locations.find(l => l.id === locationId);
    return loc?.name || 'Unknown Location';
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        <div className="skeleton" style={{ height: '20px', width: '150px', margin: '0 auto 12px', borderRadius: '4px' }} />
        <div className="skeleton" style={{ height: '60px', width: '100%', borderRadius: '4px' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="npc-quick-reference">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '18px', 
          color: theme.text, 
          fontWeight: '400', 
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Users size={20} style={{ color: theme.primary }} />
          NPC Quick Reference
        </h2>
        <p style={{ color: theme.muted, fontSize: '12px' }}>
          {filteredNpcs.length} NPCs • Click to expand details
        </p>
      </div>

      {/* Search & Filter */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '16px',
        flexDirection: 'column'
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: theme.muted
          }} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search NPCs..."
            style={{
              background: theme.bg,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              paddingLeft: '36px',
              fontSize: '13px'
            }}
          />
        </div>
        
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            padding: '8px 12px',
            fontSize: '13px'
          }}
        >
          <option value="all">All Locations</option>
          {currentLocationId && (
            <option value="current">Current Location Only</option>
          )}
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {/* NPC List */}
      <div style={{ 
        maxHeight: 'calc(100vh - 350px)', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {filteredNpcs.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: theme.muted,
            background: theme.card,
            border: `1px dashed ${theme.border}`
          }}>
            <Users size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No NPCs found</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
              {searchQuery ? 'Try a different search' : 'Add NPCs in your campaign'}
            </p>
          </div>
        ) : (
          filteredNpcs.map((npc, index) => {
            const isExpanded = expandedNpcs.has(npc.id);
            
            return (
              <div
                key={npc.id}
                className={`card-animated stagger-${Math.min(index + 1, 8)} transition-smooth hover-lift`}
                style={{
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  overflow: 'hidden'
                }}
              >
                {/* NPC Header - Always Visible */}
                <button
                  onClick={() => toggleExpand(npc.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: theme.subtle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={20} color={theme.primary} />
                  </div>
                  
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      color: theme.text, 
                      fontSize: '14px', 
                      fontWeight: '400',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {npc.name}
                    </div>
                    <div style={{ 
                      color: theme.muted, 
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '2px'
                    }}>
                      {npc.role || npc.occupation || 'NPC'}
                      {npc.location_id && (
                        <>
                          <span style={{ color: theme.border }}>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={10} />
                            {getLocationName(npc.location_id)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand Icon */}
                  {isExpanded ? (
                    <ChevronUp size={18} color={theme.muted} />
                  ) : (
                    <ChevronDown size={18} color={theme.muted} />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div 
                    className="animate-fade-in"
                    style={{
                      padding: '0 12px 12px',
                      borderTop: `1px solid ${theme.border}`,
                      marginTop: '4px'
                    }}
                  >
                    {/* Quick Stats */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      marginTop: '12px',
                      marginBottom: '12px'
                    }}>
                      {npc.race && (
                        <div style={{ 
                          background: theme.bg, 
                          padding: '8px', 
                          textAlign: 'center' 
                        }}>
                          <div style={{ color: theme.muted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Race</div>
                          <div style={{ color: theme.text, fontSize: '12px', fontWeight: '400', marginTop: '2px' }}>{npc.race}</div>
                        </div>
                      )}
                      {npc.alignment && (
                        <div style={{ 
                          background: theme.bg, 
                          padding: '8px', 
                          textAlign: 'center' 
                        }}>
                          <div style={{ color: theme.muted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Align</div>
                          <div style={{ color: theme.text, fontSize: '12px', fontWeight: '400', marginTop: '2px' }}>{npc.alignment}</div>
                        </div>
                      )}
                      {npc.status && (
                        <div style={{ 
                          background: theme.bg, 
                          padding: '8px', 
                          textAlign: 'center' 
                        }}>
                          <div style={{ color: theme.muted, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                          <div style={{ 
                            color: npc.status === 'alive' ? theme.success : npc.status === 'dead' ? '#D97706' : theme.warning, 
                            fontSize: '12px', 
                            fontWeight: '400', 
                            marginTop: '2px',
                            textTransform: 'capitalize'
                          }}>
                            {npc.status}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {npc.description && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ 
                          color: theme.muted, 
                          fontSize: '10px', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          Description
                        </div>
                        <p style={{ 
                          color: theme.textSecondary, 
                          fontSize: '12px', 
                          lineHeight: '1.5',
                          margin: 0
                        }}>
                          {npc.description.slice(0, 200)}{npc.description.length > 200 ? '...' : ''}
                        </p>
                      </div>
                    )}

                    {/* Personality / Notes */}
                    {(npc.personality || npc.notes) && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ 
                          color: theme.muted, 
                          fontSize: '10px', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px',
                          marginBottom: '4px'
                        }}>
                          {npc.personality ? 'Personality' : 'Notes'}
                        </div>
                        <p style={{ 
                          color: theme.textSecondary, 
                          fontSize: '12px', 
                          lineHeight: '1.5',
                          margin: 0,
                          fontStyle: 'italic'
                        }}>
                          "{(npc.personality || npc.notes).slice(0, 150)}{(npc.personality || npc.notes).length > 150 ? '...' : ''}"
                        </p>
                      </div>
                    )}

                    {/* Secret (GM Only) */}
                    {npc.secret && (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '8px 10px'
                      }}>
                        <div style={{ 
                          color: '#D97706', 
                          fontSize: '10px', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Eye size={10} /> Secret (GM Only)
                        </div>
                        <p style={{ 
                          color: '#FCA5A5', 
                          fontSize: '11px', 
                          lineHeight: '1.4',
                          margin: 0
                        }}>
                          {npc.secret}
                        </p>
                      </div>
                    )}

                    {/* View Full Button */}
                    <Button
                      onClick={() => setSelectedNpc(npc)}
                      className="btn-press"
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        background: theme.subtle,
                        border: `1px solid ${theme.primary}`,
                        color: theme.primary,
                        padding: '8px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Scroll size={14} /> View Full Details
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Full NPC Modal */}
      {selectedNpc && (
        <div 
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedNpc(null)}
        >
          <div 
            className="modal-content"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.primary}`,
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{ 
                  color: theme.text, 
                  fontSize: '20px', 
                  fontWeight: '400',
                  margin: '0 0 4px'
                }}>
                  {selectedNpc.name}
                </h3>
                <p style={{ color: theme.primary, fontSize: '13px', margin: 0 }}>
                  {selectedNpc.role || selectedNpc.occupation || 'NPC'}
                </p>
              </div>
              <Button
                onClick={() => setSelectedNpc(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px'
                }}
              >
                <X size={20} color={theme.muted} />
              </Button>
            </div>

            {/* All NPC Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Stats Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px'
              }}>
                {selectedNpc.race && (
                  <div style={{ background: theme.bg, padding: '10px' }}>
                    <div style={{ color: theme.muted, fontSize: '10px', textTransform: 'uppercase' }}>Race</div>
                    <div style={{ color: theme.text, fontSize: '14px', fontWeight: '400' }}>{selectedNpc.race}</div>
                  </div>
                )}
                {selectedNpc.alignment && (
                  <div style={{ background: theme.bg, padding: '10px' }}>
                    <div style={{ color: theme.muted, fontSize: '10px', textTransform: 'uppercase' }}>Alignment</div>
                    <div style={{ color: theme.text, fontSize: '14px', fontWeight: '400' }}>{selectedNpc.alignment}</div>
                  </div>
                )}
                {selectedNpc.age && (
                  <div style={{ background: theme.bg, padding: '10px' }}>
                    <div style={{ color: theme.muted, fontSize: '10px', textTransform: 'uppercase' }}>Age</div>
                    <div style={{ color: theme.text, fontSize: '14px', fontWeight: '400' }}>{selectedNpc.age}</div>
                  </div>
                )}
                {selectedNpc.status && (
                  <div style={{ background: theme.bg, padding: '10px' }}>
                    <div style={{ color: theme.muted, fontSize: '10px', textTransform: 'uppercase' }}>Status</div>
                    <div style={{ 
                      color: selectedNpc.status === 'alive' ? theme.success : '#D97706', 
                      fontSize: '14px', 
                      fontWeight: '400',
                      textTransform: 'capitalize'
                    }}>
                      {selectedNpc.status}
                    </div>
                  </div>
                )}
              </div>

              {selectedNpc.description && (
                <div>
                  <div style={{ color: theme.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Description</div>
                  <p style={{ color: theme.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                    {selectedNpc.description}
                  </p>
                </div>
              )}

              {selectedNpc.personality && (
                <div>
                  <div style={{ color: theme.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Personality</div>
                  <p style={{ color: theme.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0, fontStyle: 'italic' }}>
                    "{selectedNpc.personality}"
                  </p>
                </div>
              )}

              {selectedNpc.motivation && (
                <div>
                  <div style={{ color: theme.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>Motivation</div>
                  <p style={{ color: theme.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                    {selectedNpc.motivation}
                  </p>
                </div>
              )}

              {selectedNpc.notes && (
                <div>
                  <div style={{ color: theme.muted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>GM Notes</div>
                  <p style={{ color: theme.textSecondary, fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                    {selectedNpc.notes}
                  </p>
                </div>
              )}

              {selectedNpc.secret && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '12px'
                }}>
                  <div style={{ 
                    color: '#D97706', 
                    fontSize: '11px', 
                    textTransform: 'uppercase', 
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Eye size={12} /> Secret
                  </div>
                  <p style={{ color: '#FCA5A5', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                    {selectedNpc.secret}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NPCQuickReference;
