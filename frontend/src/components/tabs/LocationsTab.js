import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Sparkles, Copy, Loader } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function LocationsTab({ campaignId }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location_type: '',
    description: '',
    notable_npcs: '',
    notes: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');

  useEffect(() => {
    fetchLocations();
  }, [campaignId]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/locations`);
      setLocations(response.data);
    } catch (error) {
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await axios.put(`${API}/campaigns/${campaignId}/locations/${editingLocation.id}`, formData);
        toast.success('Location updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/locations`, formData);
        toast.success('Location added!');
      }
      fetchLocations();
      resetForm();
    } catch (error) {
      toast.error('Failed to save location');
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      location_type: location.location_type,
      description: location.description,
      notable_npcs: location.notable_npcs,
      notes: location.notes
    });
    setShowDialog(true);
  };

  const handleDelete = async (locationId) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/locations/${locationId}`);
      toast.success('Location deleted');
      fetchLocations();
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location_type: '',
      description: '',
      notable_npcs: '',
      notes: ''
    });
    setEditingLocation(null);
    setShowDialog(false);
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>Locations</h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-location-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '600px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
                {editingLocation ? 'Edit Location' : 'Add Location'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                  <Input
                    data-testid="location-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Type</label>
                  <Input
                    data-testid="location-type-input"
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                    className="input"
                    placeholder="City, Dungeon, Forest..."
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                <textarea
                  data-testid="location-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '100px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notable NPCs</label>
                <Input
                  data-testid="location-npcs-input"
                  value={formData.notable_npcs}
                  onChange={(e) => setFormData({ ...formData, notable_npcs: e.target.value })}
                  className="input"
                  placeholder="Key NPCs found here..."
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                <textarea
                  data-testid="location-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button data-testid="location-submit-btn" type="submit" className="btn-primary">{editingLocation ? 'Update' : 'Add'} Location</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locations.length === 0 ? (
        <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#8b7355' }}>No locations added yet. Build your world!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {locations.map(location => (
            <Card key={location.id} data-testid={`location-card-${location.id}`} className="card">
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <MapPin size={24} style={{ color: '#d4af37', marginTop: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', marginBottom: '4px' }}>
                      {location.name}
                    </CardTitle>
                    {location.location_type && (
                      <p style={{ fontSize: '14px', color: '#8b7355' }}>{location.location_type}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {location.description && (
                  <p style={{ fontSize: '14px', color: '#e8dcc4', marginBottom: '12px', lineHeight: '1.5' }}>{location.description}</p>
                )}
                {location.notable_npcs && (
                  <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '4px' }}>Notable NPCs</p>
                    <p style={{ fontSize: '14px', color: '#e8dcc4' }}>{location.notable_npcs}</p>
                  </div>
                )}
                {location.notes && (
                  <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '12px', fontStyle: 'italic' }}>{location.notes}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Button data-testid={`edit-location-btn-${location.id}`} onClick={() => handleEdit(location)} className="btn-secondary" style={{ flex: 1 }}>
                    <Edit size={14} />
                  </Button>
                  <Button data-testid={`delete-location-btn-${location.id}`} onClick={() => handleDelete(location.id)} className="btn-danger">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationsTab;