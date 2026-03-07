import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, Plus, Trash2, Save, X, Link2, Unlink, 
  ZoomIn, ZoomOut, Move, RefreshCw, Heart, Swords,
  AlertCircle, HandshakeIcon, HelpCircle, Crown, Shield
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// GM Theme - Red (Tron Aries)
const theme = {
  primary: '#E11D48',
  hover: '#F43F5E',
  subtle: 'rgba(225, 29, 72, 0.15)',
  glow: '0 0 20px rgba(225, 29, 72, 0.3)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(255, 255, 255, 0.1)'
};

// Relationship types with colors and icons
const RELATIONSHIP_TYPES = [
  { id: 'ally', label: 'Ally', color: '#22C55E', icon: HandshakeIcon },
  { id: 'enemy', label: 'Enemy', color: '#EF4444', icon: Swords },
  { id: 'family', label: 'Family', color: '#8B5CF6', icon: Heart },
  { id: 'romantic', label: 'Romantic', color: '#EC4899', icon: Heart },
  { id: 'business', label: 'Business', color: '#F59E0B', icon: Crown },
  { id: 'rival', label: 'Rival', color: '#F97316', icon: AlertCircle },
  { id: 'neutral', label: 'Neutral', color: '#6B7280', icon: HelpCircle },
  { id: 'servant', label: 'Serves', color: '#3B82F6', icon: Shield },
];

function NPCRelationshipWeb({ campaignId }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [npcs, setNpcs] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkSource, setLinkSource] = useState(null);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState({ targetId: '', type: 'ally', description: '' });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState({});
  const [draggingNode, setDraggingNode] = useState(null);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [npcsRes, relRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/npcs`),
        axios.get(`${API}/campaigns/${campaignId}/npc-relationships`).catch(() => ({ data: [] }))
      ]);
      
      const npcData = npcsRes.data || [];
      setNpcs(npcData);
      setRelationships(relRes.data || []);
      
      // Initialize node positions in a circle
      const positions = {};
      const centerX = 400;
      const centerY = 300;
      const radius = Math.min(200, npcData.length * 30);
      
      npcData.forEach((npc, i) => {
        const angle = (2 * Math.PI * i) / npcData.length;
        positions[npc.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });
      
      setNodePositions(positions);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRelationship = async () => {
    if (!selectedNpc || !newRelation.targetId) {
      toast.error('Select both NPCs for the relationship');
      return;
    }

    const relationData = {
      source_id: selectedNpc.id,
      target_id: newRelation.targetId,
      relationship_type: newRelation.type,
      description: newRelation.description
    };

    try {
      const response = await axios.post(
        `${API}/campaigns/${campaignId}/npc-relationships`, 
        relationData
      );
      setRelationships(prev => [...prev, response.data]);
      toast.success('Relationship added!');
      setShowAddRelation(false);
      setNewRelation({ targetId: '', type: 'ally', description: '' });
    } catch (error) {
      // Fallback to local state
      const localRelation = {
        id: Date.now().toString(),
        ...relationData
      };
      setRelationships(prev => [...prev, localRelation]);
      toast.success('Relationship added locally!');
      setShowAddRelation(false);
      setNewRelation({ targetId: '', type: 'ally', description: '' });
    }
  };

  const handleDeleteRelationship = async (relationId) => {
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/npc-relationships/${relationId}`);
      setRelationships(prev => prev.filter(r => r.id !== relationId));
      toast.success('Relationship removed');
    } catch (error) {
      setRelationships(prev => prev.filter(r => r.id !== relationId));
      toast.success('Relationship removed');
    }
  };

  const handleNodeMouseDown = (e, npcId) => {
    e.stopPropagation();
    if (linkMode) {
      if (!linkSource) {
        setLinkSource(npcId);
        toast.info('Now click the target NPC');
      } else if (linkSource !== npcId) {
        // Create relationship
        setSelectedNpc(npcs.find(n => n.id === linkSource));
        setNewRelation({ ...newRelation, targetId: npcId });
        setShowAddRelation(true);
        setLinkMode(false);
        setLinkSource(null);
      }
    } else {
      setDraggingNode(npcId);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (draggingNode) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setNodePositions(prev => ({
        ...prev,
        [draggingNode]: {
          x: (prev[draggingNode]?.x || 0) + dx / zoom,
          y: (prev[draggingNode]?.y || 0) + dy / zoom
        }
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggingNode, isDragging, dragStart, zoom]);

  const handleMouseUp = () => {
    setDraggingNode(null);
    setIsDragging(false);
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target === containerRef.current || e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  const getRelationType = (typeId) => RELATIONSHIP_TYPES.find(t => t.id === typeId) || RELATIONSHIP_TYPES[6];

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    
    // Recalculate positions
    const positions = {};
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(200, npcs.length * 30);
    
    npcs.forEach((npc, i) => {
      const angle = (2 * Math.PI * i) / npcs.length;
      positions[npc.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });
    
    setNodePositions(positions);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading NPC data...
      </div>
    );
  }

  return (
    <div style={{
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: theme.subtle,
            border: `1px solid ${theme.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={20} color={theme.primary} />
          </div>
          <div>
            <h3 style={{ 
              color: theme.primary, 
              fontSize: '18px', 
              fontWeight: '700',
              margin: 0,
              fontFamily: 'Cityworm, sans-serif'
            }}>
              NPC RELATIONSHIP WEB
            </h3>
            <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
              Visualize connections between NPCs
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={() => { setLinkMode(!linkMode); setLinkSource(null); }}
            style={{
              background: linkMode ? theme.primary : 'transparent',
              border: `1px solid ${linkMode ? theme.primary : theme.border}`,
              color: linkMode ? '#fff' : theme.muted,
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {linkMode ? <Unlink size={16} /> : <Link2 size={16} />}
            {linkMode ? 'Cancel Link' : 'Link NPCs'}
          </Button>
          <Button
            onClick={resetView}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.muted,
              padding: '8px'
            }}
          >
            <RefreshCw size={16} />
          </Button>
          <Button
            onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.muted,
              padding: '8px'
            }}
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              color: theme.muted,
              padding: '8px'
            }}
          >
            <ZoomOut size={16} />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {RELATIONSHIP_TYPES.map(type => (
          <div key={type.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '3px', 
              background: type.color 
            }} />
            <span style={{ color: theme.muted, fontSize: '11px' }}>{type.label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        style={{
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          height: '500px',
          overflow: 'hidden',
          position: 'relative',
          cursor: isDragging ? 'grabbing' : (linkMode ? 'crosshair' : 'grab')
        }}
      >
        {npcs.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.muted
          }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h4 style={{ color: theme.text, margin: '0 0 8px' }}>No NPCs Yet</h4>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Create NPCs in the NPCs tab to build your relationship web
            </p>
          </div>
        ) : (
          <svg
            width="100%"
            height="100%"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Relationship lines */}
            {relationships.map((rel) => {
              const sourcePos = nodePositions[rel.source_id];
              const targetPos = nodePositions[rel.target_id];
              if (!sourcePos || !targetPos) return null;
              
              const relType = getRelationType(rel.relationship_type);
              
              return (
                <g key={rel.id}>
                  <line
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={relType.color}
                    strokeWidth={2}
                    strokeDasharray={rel.relationship_type === 'enemy' ? '5,5' : 'none'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleDeleteRelationship(rel.id)}
                  />
                  {/* Midpoint label */}
                  <text
                    x={(sourcePos.x + targetPos.x) / 2}
                    y={(sourcePos.y + targetPos.y) / 2 - 8}
                    fill={relType.color}
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {relType.label}
                  </text>
                </g>
              );
            })}

            {/* NPC nodes */}
            {npcs.map((npc) => {
              const pos = nodePositions[npc.id] || { x: 400, y: 300 };
              const isSelected = selectedNpc?.id === npc.id;
              const isLinkSource = linkSource === npc.id;
              
              return (
                <g
                  key={npc.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, npc.id)}
                  onClick={() => !linkMode && setSelectedNpc(npc)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Glow effect */}
                  {(isSelected || isLinkSource) && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={32}
                      fill="none"
                      stroke={theme.primary}
                      strokeWidth={2}
                      style={{ filter: `drop-shadow(${theme.glow})` }}
                    />
                  )}
                  
                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={25}
                    fill={isSelected || isLinkSource ? theme.primary : theme.card}
                    stroke={theme.primary}
                    strokeWidth={isSelected || isLinkSource ? 2 : 1}
                  />
                  
                  {/* NPC initials */}
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    fill={theme.text}
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {npc.name.slice(0, 2).toUpperCase()}
                  </text>
                  
                  {/* NPC name below */}
                  <text
                    x={pos.x}
                    y={pos.y + 45}
                    fill={theme.textSecondary}
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {npc.name.length > 12 ? npc.name.slice(0, 12) + '...' : npc.name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Link mode indicator */}
        {linkMode && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: theme.primary,
            color: '#fff',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            LINK MODE: {linkSource ? 'Click target NPC' : 'Click source NPC'}
          </div>
        )}
      </div>

      {/* Selected NPC Panel */}
      {selectedNpc && !showAddRelation && (
        <div style={{
          marginTop: '16px',
          background: theme.bg,
          border: `1px solid ${theme.primary}`,
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ color: theme.primary, fontSize: '16px', fontWeight: '700', margin: '0 0 4px' }}>
                {selectedNpc.name}
              </h4>
              <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
                {selectedNpc.description || 'No description'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={() => setShowAddRelation(true)}
                style={{
                  background: theme.primary,
                  border: 'none',
                  color: '#fff',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px'
                }}
              >
                <Plus size={14} />
                Add Relationship
              </Button>
              <Button
                onClick={() => setSelectedNpc(null)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  padding: '8px'
                }}
              >
                <X size={14} />
              </Button>
            </div>
          </div>

          {/* Existing relationships */}
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ color: theme.text, fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
              Relationships ({relationships.filter(r => r.source_id === selectedNpc.id || r.target_id === selectedNpc.id).length})
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {relationships
                .filter(r => r.source_id === selectedNpc.id || r.target_id === selectedNpc.id)
                .map(rel => {
                  const otherId = rel.source_id === selectedNpc.id ? rel.target_id : rel.source_id;
                  const otherNpc = npcs.find(n => n.id === otherId);
                  const relType = getRelationType(rel.relationship_type);
                  const direction = rel.source_id === selectedNpc.id ? '→' : '←';
                  
                  return (
                    <div key={rel.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: theme.card,
                      border: `1px solid ${theme.border}`
                    }}>
                      <span style={{ color: relType.color, fontWeight: '600', fontSize: '12px' }}>
                        {relType.label}
                      </span>
                      <span style={{ color: theme.muted }}>{direction}</span>
                      <span style={{ color: theme.text, flex: 1 }}>{otherNpc?.name || 'Unknown'}</span>
                      <Button
                        onClick={() => handleDeleteRelationship(rel.id)}
                        style={{
                          padding: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: theme.muted
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Add Relationship Form */}
      {showAddRelation && selectedNpc && (
        <div style={{
          marginTop: '16px',
          background: theme.bg,
          border: `1px solid ${theme.primary}`,
          padding: '20px'
        }}>
          <h4 style={{ color: theme.text, fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            Add Relationship for {selectedNpc.name}
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Related NPC
              </label>
              <select
                value={newRelation.targetId}
                onChange={(e) => setNewRelation({ ...newRelation, targetId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                <option value="">Select NPC...</option>
                {npcs.filter(n => n.id !== selectedNpc.id).map(npc => (
                  <option key={npc.id} value={npc.id}>{npc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Relationship Type
              </label>
              <select
                value={newRelation.type}
                onChange={(e) => setNewRelation({ ...newRelation, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                {RELATIONSHIP_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
              Description (optional)
            </label>
            <Input
              value={newRelation.description}
              onChange={(e) => setNewRelation({ ...newRelation, description: e.target.value })}
              placeholder="How do they know each other?"
              style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              onClick={handleAddRelationship}
              style={{ background: theme.primary, border: 'none', color: '#fff', padding: '10px 20px' }}
            >
              <Save size={16} style={{ marginRight: '8px' }} />
              Save Relationship
            </Button>
            <Button
              onClick={() => { setShowAddRelation(false); setNewRelation({ targetId: '', type: 'ally', description: '' }); }}
              style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '10px 20px' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NPCRelationshipWeb;
