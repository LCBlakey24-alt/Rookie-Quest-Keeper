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

function NPCsTab({ campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNPC, setEditingNPC] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hp: 10,
    ac: 10,
    location: '',
    notes: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');

  useEffect(() => {
    fetchNPCs();
  }, [campaignId]);

  const fetchNPCs = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/npcs`);
      setNpcs(response.data);
    } catch (error) {
      toast.error('Failed to load NPCs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingNPC) {
        await axios.put(`${API}/campaigns/${campaignId}/npcs/${editingNPC.id}`, formData);
        toast.success('NPC updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/npcs`, formData);
        toast.success('NPC added!');
      }
      fetchNPCs();
      resetForm();
    } catch (error) {
      toast.error('Failed to save NPC');
    }
  };

  const handleEdit = (npc) => {
    setEditingNPC(npc);
    setFormData({
      name: npc.name,
      description: npc.description,
      hp: npc.hp,
      ac: npc.ac,
      location: npc.location,
      notes: npc.notes
    });
    setShowDialog(true);
  };

  const handleDelete = async (npcId) => {
    if (!window.confirm('Delete this NPC?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/npcs/${npcId}`);
      toast.success('NPC deleted');
      fetchNPCs();
    } catch (error) {
      toast.error('Failed to delete NPC');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      hp: 10,
      ac: 10,
      location: '',
      notes: ''
    });
    setEditingNPC(null);
    setShowDialog(false);
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>NPCs & Monsters</h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-npc-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Add NPC
            </Button>
          </DialogTrigger>
          <DialogContent className="modal">
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
                {editingNPC ? 'Edit NPC' : 'Add NPC'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                <Input
                  data-testid="npc-name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                <textarea
                  data-testid="npc-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>HP</label>
                  <Input
                    data-testid="npc-hp-input"
                    type="number"
                    value={formData.hp}
                    onChange={(e) => setFormData({ ...formData, hp: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>AC</label>
                  <Input
                    data-testid="npc-ac-input"
                    type="number"
                    value={formData.ac}
                    onChange={(e) => setFormData({ ...formData, ac: parseInt(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Location</label>
                  <Input
                    data-testid="npc-location-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                <textarea
                  data-testid="npc-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button data-testid="npc-submit-btn" type="submit" className="btn-primary">{editingNPC ? 'Update' : 'Add'} NPC</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {npcs.length === 0 ? (
        <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#8b7355' }}>No NPCs added yet. Add your first NPC!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {npcs.map(npc => (
            <Card key={npc.id} data-testid={`npc-card-${npc.id}`} className="card">
              <CardHeader>
                <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', marginBottom: '4px' }}>
                  {npc.name}
                </CardTitle>
                {npc.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <MapPin size={14} style={{ color: '#8b7355' }} />
                    <p style={{ fontSize: '12px', color: '#8b7355' }}>{npc.location}</p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {npc.description && (
                  <p style={{ fontSize: '14px', color: '#e8dcc4', marginBottom: '12px', lineHeight: '1.5' }}>{npc.description}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">HP</div>
                    <div className="stat-value">{npc.hp}</div>
                  </div>
                  <div className="stat-block" style={{ flex: 1 }}>
                    <div className="stat-label">AC</div>
                    <div className="stat-value">{npc.ac}</div>
                  </div>
                </div>
                {npc.notes && (
                  <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '12px', fontStyle: 'italic' }}>{npc.notes}</p>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button data-testid={`edit-npc-btn-${npc.id}`} onClick={() => handleEdit(npc)} className="btn-secondary" style={{ flex: 1 }}>
                    <Edit size={14} />
                  </Button>
                  <Button data-testid={`delete-npc-btn-${npc.id}`} onClick={() => handleDelete(npc.id)} className="btn-danger">
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

export default NPCsTab;