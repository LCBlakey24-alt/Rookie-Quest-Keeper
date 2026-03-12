import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Map, PlusCircle, Trash2, Edit, Grid } from 'lucide-react';
import { MapBuilder } from '@/components/MapBuilder';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

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
      const response = await axios.get(`${API}/campaigns/${campaignId}/maps`);
      setMaps(response.data || []);
    } catch (error) {
      console.error('Failed to load maps:', error);
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
      await axios.delete(`${API}/campaigns/${campaignId}/maps/${mapId}`);
      toast.success('Map deleted');
      setMaps(maps.filter(m => m.id !== mapId));
    } catch (error) {
      toast.error('Failed to delete map');
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
      {/* Header */}
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
            color: '#ffffff', 
            fontFamily: 'Cityworm, sans-serif', 
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Map size={28} style={{ color: '#06b6d4' }} />
            Battle Maps
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Create and manage battle maps with terrain, walls, and fog of war
          </p>
        </div>
        <Button
          onClick={handleCreateMap}
          data-testid="create-map-btn"
          style={{
            background: 'linear-gradient(180deg, #06b6d4 0%, #0891b2 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          <PlusCircle size={18} />
          Create New Map
        </Button>
      </div>

      {/* Maps Grid */}
      {maps.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'rgba(6, 182, 212, 0.05)',
          borderRadius: '16px',
          border: '2px dashed rgba(6, 182, 212, 0.3)'
        }}>
          <Map size={64} style={{ color: '#06b6d4', opacity: 0.3, margin: '0 auto 20px' }} />
          <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '12px', fontFamily: 'Montserrat' }}>
            No Battle Maps Yet
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            Create your first battle map with terrain, walls, doors, and fog of war. 
            Maps can be linked to combat encounters.
          </p>
          <Button
            onClick={handleCreateMap}
            style={{
              background: 'linear-gradient(180deg, #06b6d4 0%, #0891b2 100%)',
              padding: '14px 28px',
              fontSize: '15px'
            }}
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
                background: 'rgba(6, 182, 212, 0.08)',
                border: '2px solid rgba(6, 182, 212, 0.25)',
                borderRadius: '16px',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Map Preview */}
              <div style={{ 
                height: '140px', 
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(15, 23, 42, 0.9) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <Map size={48} style={{ color: '#06b6d4', opacity: 0.4 }} />
                
                {/* Quick Info Badges */}
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px',
                  display: 'flex',
                  gap: '6px'
                }}>
                  <span style={{
                    background: 'rgba(6, 182, 212, 0.2)',
                    color: '#22d3ee',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Grid size={10} />
                    {map.width || 20}x{map.height || 15}
                  </span>
                </div>
              </div>

              {/* Map Info */}
              <div style={{ padding: '16px' }}>
                <h3 style={{ 
                  color: '#fff', 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  marginBottom: '6px',
                  fontFamily: 'Montserrat'
                }}>
                  {map.name}
                </h3>
                <p style={{ 
                  color: '#64748b', 
                  fontSize: '12px',
                  marginBottom: '16px'
                }}>
                  {map.objects?.length || 0} objects • {map.walls?.length || 0} walls
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    onClick={() => handleEditMap(map)}
                    data-testid={`edit-map-${map.id}`}
                    style={{
                      flex: 1,
                      background: 'rgba(6, 182, 212, 0.15)',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      color: '#22d3ee',
                      padding: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Edit size={14} />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteMap(map.id)}
                    data-testid={`delete-map-${map.id}`}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '10px',
                      fontSize: '13px'
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

      {/* Map Builder Modal */}
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
