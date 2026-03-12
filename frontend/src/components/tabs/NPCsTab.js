import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Loader, Wand2, Check, User, Search, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function NPCsTab({ campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNPC, setEditingNPC] = useState(null);
  const [deletingNPC, setDeletingNPC] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [lastGenerated, setLastGenerated] = useState(null);

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
    if (deletingNPC === npcId) {
      try {
        const npc = npcs.find(n => n.id === npcId);
        await axios.delete(`${API}/campaigns/${campaignId}/npcs/${npcId}`);
        toast.success(`${npc.name} removed`, {
          description: 'NPC has been deleted'
        });
        fetchNPCs();
      } catch (error) {
        toast.error('Failed to delete NPC');
      } finally {
        setDeletingNPC(null);
      }
    } else {
      setDeletingNPC(npcId);
      setTimeout(() => setDeletingNPC(null), 5000);
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

  // ROOK - Auto-generate and save
  const handleUnseenServant = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the NPC you want');
      return;
    }
    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const response = await axios.post(`${API}/rook/generate`, {
        prompt: aiPrompt,
        entity_type: 'npc',
        campaign_id: campaignId
      });
      
      if (response.data.success) {
        toast.success(`✨ ${response.data.entity_name} has joined your world!`);
        setLastGenerated(response.data);
        setAiPrompt('');
        fetchNPCs();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'The ROOK failed to create the NPC';
      toast.error(errorMsg);
    } finally {
      setAiGenerating(false);
    }
  };

  // Filter NPCs by search
  const filteredNPCs = npcs.filter(npc =>
    npc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    npc.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    npc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff', marginBottom: '24px' }}>NPCs</h2>
        <LoadingSkeleton type="table" count={4} />
      </div>
    );
  }

  // Empty state
  if (npcs.length === 0) {
    return (
      <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        <EmptyState
          icon={User}
          title="No NPCs Yet"
          description="Create your first NPC to populate your world. Add characters manually or use the ROOK AI to generate them automatically."
          actionLabel="Create Your First NPC"
          onAction={() => setShowDialog(true)}
          color="#f97316"
        />
        
        {/* ROOK Panel - still show for empty state */}
        <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
          <Card className="parchment-dark" style={{ border: '2px solid #f97316' }}>
            <CardHeader>
              <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 size={20} style={{ color: '#f97316' }} />
                ROOK
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p style={{ fontSize: '13px', color: '#fed7aa', marginBottom: '16px', lineHeight: '1.5' }}>
                Describe a character and the ROOK will create and save them to your NPCs automatically.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  data-testid="rook-npc-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="textarea"
                  style={{ minHeight: '100px', fontSize: '13px', borderColor: '#f97316' }}
                  placeholder="Example: A grizzled dwarven blacksmith with a secret past as an adventurer"
                />
              </div>
              <Button
                data-testid="summon-npc-btn"
                onClick={handleUnseenServant}
                disabled={aiGenerating}
                className="btn-primary"
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  border: 'none'
                }}
              >
                {aiGenerating ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Summoning...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Summon NPC
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Dialog for manual creation */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogContent className="modal" style={{ maxWidth: '600px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Add NPC
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button type="submit" className="btn-primary">Add NPC</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      {/* Main Content */}
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff' }}>
          NPCs <span style={{ fontSize: '18px', color: '#94a3b8' }}>({filteredNPCs.length})</span>
        </h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-npc-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Add NPC
            </Button>
          </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '600px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
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
                  style={{ minHeight: '100px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>HP</label>
                  <Input
                    data-testid="npc-hp-input"
                    type="number"
                    value={formData.hp}
                    onChange={(e) => setFormData({ ...formData, hp: parseInt(e.target.value) || 10 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>AC</label>
                  <Input
                    data-testid="npc-ac-input"
                    type="number"
                    value={formData.ac}
                    onChange={(e) => setFormData({ ...formData, ac: parseInt(e.target.value) || 10 })}
                    className="input"
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Location</label>
                <Input
                  data-testid="npc-location-input"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input"
                  placeholder="Where can they be found?"
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                <textarea
                  data-testid="npc-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
                  placeholder="Motivations, secrets, plot hooks..."
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

      {/* Search Bar */}
      {npcs.length > 3 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Search 
              size={18} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#94a3b8' 
              }} 
            />
            <Input
              placeholder="Search NPCs by name, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
      )}

      {/* No results from search */}
      {filteredNPCs.length === 0 && searchTerm && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <p>No NPCs found matching "{searchTerm}"</p>
          <Button 
            onClick={() => setSearchTerm('')}
            className="btn-outline"
            style={{ marginTop: '12px' }}
          >
            Clear Search
          </Button>
        </div>
      )}

      {filteredNPCs.length > 0 && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredNPCs.map(npc => (
            <Card 
              key={npc.id} 
              data-testid={`npc-card-${npc.id}`} 
              className="card"
              style={{
                animation: lastGenerated?.entity_id === npc.id ? 'glow-pulse 2s ease-out' : 'none',
                border: lastGenerated?.entity_id === npc.id ? '2px solid #22c55e' : undefined
              }}
            >
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}>
                    <User size={24} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {npc.name}
                      {lastGenerated?.entity_id === npc.id && (
                        <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Just created
                        </span>
                      )}
                    </CardTitle>
                    {npc.location && (
                      <p style={{ fontSize: '14px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {npc.location}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button data-testid={`edit-npc-btn-${npc.id}`} onClick={() => handleEdit(npc)} className="btn-secondary" style={{ padding: '8px' }}>
                      <Edit size={14} />
                    </Button>
                    
                    {/* Delete with confirmation */}
                    {deletingNPC === npc.id ? (
                      <div style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid #ef4444'
                      }}>
                        <span style={{ fontSize: '11px', color: '#fff', whiteSpace: 'nowrap' }}>Delete?</span>
                        <Button
                          data-testid={`confirm-delete-npc-${npc.id}`}
                          onClick={() => handleDelete(npc.id)}
                          className="btn-icon"
                          style={{ background: '#ef4444', minHeight: '28px', minWidth: '28px', padding: '4px' }}
                        >
                          <Check size={12} />
                        </Button>
                        <Button
                          onClick={() => setDeletingNPC(null)}
                          className="btn-icon"
                          style={{ minHeight: '28px', minWidth: '28px', padding: '4px' }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ) : (
                      <Button data-testid={`delete-npc-btn-${npc.id}`} onClick={() => handleDelete(npc.id)} className="btn-danger" style={{ padding: '8px' }}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {npc.description && (
                  <p style={{ fontSize: '14px', color: '#ffffff', marginBottom: '12px', lineHeight: '1.5' }}>{npc.description}</p>
                )}
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '2px' }}>HP</p>
                    <p style={{ fontSize: '18px', color: '#ffffff', fontWeight: '700' }}>{npc.hp}</p>
                  </div>
                  <div style={{ padding: '8px 16px', background: 'rgba(74, 125, 255, 0.15)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#4a7dff', marginBottom: '2px' }}>AC</p>
                    <p style={{ fontSize: '18px', color: '#ffffff', fontWeight: '700' }}>{npc.ac}</p>
                  </div>
                </div>
                {npc.notes && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', fontStyle: 'italic' }}>{npc.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      {/* ROOK Panel */}
      <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '2px solid #f97316' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wand2 size={20} style={{ color: '#f97316' }} />
              ROOK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: '13px', color: '#fed7aa', marginBottom: '16px', lineHeight: '1.5' }}>
              Describe a character and the ROOK will create and save them to your NPCs automatically.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#f97316', fontWeight: '600' }}>
                Describe your NPC
              </label>
              <textarea
                data-testid="rook-npc-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="textarea"
                style={{ minHeight: '100px', fontSize: '13px', borderColor: '#f97316' }}
                placeholder="Example: A grizzled dwarven blacksmith with a secret past as an adventurer"
              />
            </div>
            <Button
              data-testid="summon-npc-btn"
              onClick={handleUnseenServant}
              disabled={aiGenerating}
              className="btn-primary"
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none'
              }}
            >
              {aiGenerating ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Summoning...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Summon NPC
                </>
              )}
            </Button>
            
            {lastGenerated && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: 'rgba(34, 197, 94, 0.15)', 
                border: '1px solid #22c55e',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Check size={16} style={{ color: '#22c55e' }} />
                  <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '13px' }}>NPC Created!</span>
                </div>
                <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>{lastGenerated.entity_name}</p>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
                  Click the edit button on the card to make changes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <style>{`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.6); }
          100% { box-shadow: 0 0 0px rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
}

export default NPCsTab;
