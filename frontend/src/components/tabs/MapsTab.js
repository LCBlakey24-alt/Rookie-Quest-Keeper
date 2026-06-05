import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Map, PlusCircle, Trash2, Edit, Grid } from 'lucide-react';
import { MapBuilder } from '@/components/MapBuilder';
import apiClient from '@/lib/apiClient';

const rq = {
  panel: 'var(--rq-bg-panel, #242424)',
  input: 'var(--rq-bg-input, #1F1F1F)',
  border: 'var(--rq-accent-border, rgba(193,18,31,0.35))',
  borderDefault: 'var(--rq-border-default, #3A3A3A)',
  accent: 'var(--rq-accent-primary, #C1121F)',
  accentHover: 'var(--rq-accent-hover, #D62839)',
  accentSoft: 'var(--rq-accent-soft, rgba(193,18,31,0.12))',
  text: 'var(--rq-text-primary, #FFFFFF)',
  textSecondary: 'var(--rq-text-secondary, #D6D6D6)',
  muted: 'var(--rq-text-muted, #A0A0A0)',
  danger: 'var(--rq-danger, #C1121F)',
  radius: 'var(--rq-radius-md, 6px)',
  radiusSm: 'var(--rq-radius-sm, 4px)',
};

function MapsTab({ campaignId }) {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMapBuilder, setShowMapBuilder] = useState(false);
  const [selectedMap, setSelectedMap] = useState(null);

  useEffect(() => {
    fetchMaps();
  }, [campaignId]);

  const fetchMaps = async () => {
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/maps`);
      setMaps(response.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMap = () => {
    setSelectedMap(null);
    setShowMapBuilder(true);
  };

  const handleEditMap = (map) => {
    setSelectedMap(map);
    setShowMapBuilder(true);
  };

  const handleDeleteMap = async (mapId) => {
    if (!window.confirm('Delete this map? This cannot be undone.')) return;
    
    try {
      await apiClient.delete(`/campaigns/${campaignId}/maps/${mapId}`);
      toast.success('Map deleted');
      setMaps(maps.filter(m => m.id !== mapId));
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete map');
    }
  };

  const handleMapSaved = (savedMap) => {
    setMaps(prev => {
      const existing = prev.findIndex(m => m.id === savedMap.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = savedMap;
        return updated;
      }
      return [...prev, savedMap];
    });
    setShowMapBuilder(false);
    toast.success('Map saved!');
  };

  if (loading) {
    return <div className="loading-spinner" />;
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            color: rq.text, 
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Map size={28} style={{ color: rq.accent }} />
            Battle Maps
          </h2>
          <p style={{ color: rq.textSecondary, fontSize: '14px', marginTop: '4px' }}>
            Create and manage battle maps with terrain, walls, and fog of war.
          </p>
        </div>
        <Button
          onClick={handleCreateMap}
          data-testid="create-map-btn"
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '900',
            borderRadius: rq.radiusSm
          }}
        >
          <PlusCircle size={18} />
          Create New Map
        </Button>
      </div>

      {maps.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: rq.panel,
          borderRadius: rq.radius,
          border: `2px dashed ${rq.border}`
        }}>
          <Map size={64} style={{ color: rq.accent, opacity: 0.35, margin: '0 auto 20px' }} />
          <h3 style={{ color: rq.text, fontSize: '20px', fontWeight: '900', marginBottom: '12px', fontFamily: 'Montserrat' }}>
            No Battle Maps Yet
          </h3>
          <p style={{ color: rq.muted, fontSize: '14px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Create your first battle map with terrain, walls, doors, and fog of war. Maps can be linked to combat encounters.
          </p>
          <Button
            onClick={handleCreateMap}
            className="btn-primary"
            style={{ padding: '14px 28px', fontSize: '15px', borderRadius: rq.radiusSm }}
          >
            <PlusCircle size={18} style={{ marginRight: '8px' }} />
            Create Your First Map
          </Button>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          {maps.map(map => (
            <div
              key={map.id}
              data-testid={`map-card-${map.id}`}
              style={{
                background: rq.panel,
                border: `1px solid ${rq.border}`,
                borderRadius: rq.radius,
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ 
                height: '140px', 
                background: `linear-gradient(135deg, ${rq.accentSoft} 0%, ${rq.input} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                borderBottom: `1px solid ${rq.border}`
              }}>
                <Map size={48} style={{ color: rq.accent, opacity: 0.45 }} />
                
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px',
                  display: 'flex',
                  gap: '6px'
                }}>
                  <span style={{
                    background: rq.accentSoft,
                    color: rq.text,
                    padding: '4px 8px',
                    borderRadius: rq.radiusSm,
                    border: `1px solid ${rq.border}`,
                    fontSize: '10px',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Grid size={10} />
                    {map.width || 20}x{map.height || 15}
                  </span>
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                <h3 style={{ 
                  color: rq.text, 
                  fontSize: '16px', 
                  fontWeight: '900', 
                  marginBottom: '6px',
                  fontFamily: 'Montserrat'
                }}>
                  {map.name}
                </h3>
                <p style={{ 
                  color: rq.muted, 
                  fontSize: '12px',
                  marginBottom: '16px'
                }}>
                  {map.objects?.length || 0} objects • {map.walls?.length || 0} walls
                </p>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    onClick={() => handleEditMap(map)}
                    data-testid={`edit-map-${map.id}`}
                    className="btn-outline"
                    style={{
                      flex: 1,
                      borderColor: rq.border,
                      color: rq.text,
                      padding: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      borderRadius: rq.radiusSm
                    }}
                  >
                    <Edit size={14} />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteMap(map.id)}
                    data-testid={`delete-map-${map.id}`}
                    style={{
                      background: rq.accentSoft,
                      border: `1px solid ${rq.border}`,
                      color: rq.danger,
                      padding: '10px',
                      fontSize: '13px',
                      borderRadius: rq.radiusSm
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showMapBuilder && (
        <MapBuilder
          campaignId={campaignId}
          existingMap={selectedMap}
          onClose={() => {
            setShowMapBuilder(false);
            setSelectedMap(null);
          }}
          onMapSaved={handleMapSaved}
        />
      )}
    </div>
  );
}

export default MapsTab;
