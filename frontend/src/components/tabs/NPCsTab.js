import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import NpcCompactStatBlock from '@/components/gm/NpcCompactStatBlock';
import NpcAdvancedEditor from './NpcAdvancedEditor';
import { changedNpcFields, normaliseNpcPatch } from './npcEditPatch';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Loader, Wand2, Check, User, Search, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import RookFormFillPanel from '@/components/RookFormFillPanel';
import './NPCsTab.css';

const NPC_BASIC_FIELDS = [
  { name: 'name', label: 'Name', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

const NPC_FORM_FIELDS = [
  ...NPC_BASIC_FIELDS,
  { name: 'hp', label: 'Hit Points', type: 'number' },
  { name: 'ac', label: 'Armour Class', type: 'number' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'notes', label: 'Motivations, secrets, and hooks', type: 'textarea' },
];

function NPCsTab({ campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const activeCampaignRef = useRef(campaignId);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNPC, setEditingNPC] = useState(null);
  const [deletingNPC, setDeletingNPC] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    hp: 10,
    ac: 10,
    location: '',
    notes: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    // A campaign change must never display records from the previous party.
    activeCampaignRef.current = campaignId;
    setNpcs([]);
    setLoadError(false);
    setLoading(true);
    fetchNPCs();
  }, [campaignId]);

  const fetchNPCs = async () => {
    const requestedCampaign = campaignId;
    try {
      const response = await apiClient.get(`/campaigns/${requestedCampaign}/npcs`);
      if (activeCampaignRef.current !== requestedCampaign) return;
      if (!Array.isArray(response.data)) throw new Error('Invalid NPC response');
      setNpcs(response.data);
      setLoadError(false);
    } catch (error) {
      if (activeCampaignRef.current !== requestedCampaign) return;
      setLoadError(true);
      toast.error('Could not load NPCs. Your saved records have not been deleted.');
    } finally {
      if (activeCampaignRef.current === requestedCampaign) setLoading(false);
    }
  };

  const applyRookNpcPatch = (patch) => {
    setFormData(prev => ({ ...prev, ...normaliseNpcPatch(patch) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingNPC) {
        const changes = changedNpcFields(editingNPC, formData);
        if (Object.keys(changes).length === 0) {
          toast.info('No changes to save');
          resetForm();
          return;
        }
        await apiClient.put(`/campaigns/${campaignId}/npcs/${editingNPC.id}`, changes);
        toast.success('NPC and stat block updated!');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/npcs`, formData);
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
    // Keep the source record intact in memory. The save call only sends
    // changed, supported fields; no unrelated lore or combat data is rewritten.
    setFormData({ ...npc });
    setShowDialog(true);
  };

  const handleDelete = async (npcId) => {
    if (deletingNPC === npcId) {
      try {
        const npc = npcs.find(n => n.id === npcId);
        await apiClient.delete(`/campaigns/${campaignId}/npcs/${npcId}`);
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
      image_url: '',
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
      const response = await apiClient.post(`/rook/generate`, {
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

  // A failed request must never be mistaken for an empty campaign or data loss.
  if (loadError && npcs.length === 0) {
    return <div className="rqk-npc-load-error" role="alert" data-testid="npc-roster-load-error">
      <strong>NPCs could not be loaded</strong>
      <p>This is a loading problem, not confirmation that the campaign has lost its NPCs.</p>
      <Button type="button" onClick={fetchNPCs} className="btn-secondary">Retry loading NPCs</Button>
    </div>;
  }

  // Empty state
  if (npcs.length === 0) {
    return (
      <div className="campaign-management-grid rqk-npcs-roster-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
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
            <RookFormFillPanel
              title="Ask Rook for an NPC draft"
              helperText="Draft the core fields first, then review and save when you are happy. This does not auto-create the NPC."
              section="gm_npc"
              campaignId={campaignId}
              fields={NPC_BASIC_FIELDS}
              currentValues={formData}
              onApply={applyRookNpcPatch}
              placeholder="Example: A wary tavern keeper who knows why travellers disappear near the old bridge..."
            />
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
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Portrait URL (optional)</label>
                <Input value={formData.image_url || ''} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="input" placeholder="Image URL or embedded portrait" style={{ marginBottom: 12 }} />
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
    <div className="campaign-management-grid rqk-npcs-roster-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
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
          <DialogContent className="modal rqk-npc-editor-dialog" style={{ maxWidth: '760px', maxHeight: '88dvh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                {editingNPC ? 'Edit NPC' : 'Add NPC'}
              </DialogTitle>
            </DialogHeader>
            <RookFormFillPanel
              title={editingNPC ? 'Ask Rook to improve this NPC' : 'Ask Rook for an NPC draft'}
              helperText="Draft or improve fields first, then import only the suggestions you want before saving."
              section="gm_npc"
              campaignId={campaignId}
              fields={NPC_FORM_FIELDS}
              currentValues={formData}
              onApply={applyRookNpcPatch}
              placeholder="Example: Turn this into a charming informant with a secret debt, a useful clue, and a memorable voice..."
            />
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
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Portrait URL (optional)</label>
                <Input value={formData.image_url || ''} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="input" placeholder="Image URL or embedded portrait" style={{ marginBottom: 12 }} />
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
                    onChange={(e) => setFormData({ ...formData, hp: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>AC</label>
                  <Input
                    data-testid="npc-ac-input"
                    type="number"
                    value={formData.ac}
                    onChange={(e) => setFormData({ ...formData, ac: e.target.value === '' ? 0 : Number(e.target.value) })}
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
              <NpcAdvancedEditor key={editingNPC?.id || 'new'} value={formData} onChange={setFormData} />
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
        <div className="rqk-npc-list" style={{ display: 'grid', gap: '16px' }}>
          {filteredNPCs.map(npc => (
            <Card 
              key={npc.id} 
              data-testid={`npc-card-${npc.id}`} 
              className="card rqk-npc-card"
              style={{
                animation: lastGenerated?.entity_id === npc.id ? 'glow-pulse 2s ease-out' : 'none',
                border: lastGenerated?.entity_id === npc.id ? '2px solid #F59E0B' : undefined
              }}
            >
              <CardHeader className="rqk-npc-card-header">
                <div className="rqk-npc-card-main" style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div className="rqk-npc-avatar" style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center'
                  }}>
                    {(npc.image_url || npc.portrait_url) ? <img src={npc.image_url || npc.portrait_url} alt={npc.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : <User size={24} color="white" />}
                  </div>
                  <div className="rqk-npc-identity" style={{ flex: 1 }}>
                    <CardTitle className="medieval-heading rqk-npc-name" style={{ fontSize: '20px', color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {npc.name}
                      {lastGenerated?.entity_id === npc.id && (
                        <span style={{ fontSize: '12px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Just created
                        </span>
                      )}
                    </CardTitle>
                    {npc.location && (
                      <p style={{ fontSize: '14px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {npc.location}
                      </p>
                    )}
                  </div>
                  <div className="rqk-npc-card-actions" style={{ display: 'flex', gap: '8px' }}>
                    <Button type="button" aria-label={`Edit ${npc.name}`} data-testid={`edit-npc-btn-${npc.id}`} onClick={() => handleEdit(npc)} className="btn-secondary" style={{ padding: '8px' }}>
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
                      <Button type="button" aria-label={`Delete ${npc.name}`} data-testid={`delete-npc-btn-${npc.id}`} onClick={() => handleDelete(npc.id)} className="btn-danger" style={{ padding: '8px' }}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="rqk-npc-card-content">
                <details className="rqk-npc-combat-details" data-testid={`npc-combat-card-${npc.id}`} style={{ width: '100%' }}>
                  <summary className="rqk-npc-combat-summary" style={{ cursor: 'pointer', color: 'var(--rq-text-primary)', fontSize: 13, fontWeight: 800, padding: '8px 0' }}>
                    Full stat block · HP {npc.hp ?? '—'} · AC {npc.ac ?? '—'} · {Array.isArray(npc.attacks) ? npc.attacks.length : 0} attacks
                  </summary>
                  <NpcCompactStatBlock npc={npc} />
                </details>
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
                border: '1px solid #F59E0B',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Check size={16} style={{ color: '#F59E0B' }} />
                  <span style={{ color: '#F59E0B', fontWeight: '600', fontSize: '13px' }}>NPC Created!</span>
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
