import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/apiClient';
import NpcCompactStatBlock from '@/components/gm/NpcCompactStatBlock';
import RosterSplitView from '@/components/gm/RosterSplitView';
import NpcFullStatEditor from './NpcFullStatEditor';
import { createNpcDraft, prepareNpcSavePayload } from './npcEditorDraft';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Loader, Wand2, Check, User, Search, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import RookFormFillPanel from '@/components/RookFormFillPanel';
import { matchesNpcSearch } from '@/lib/npcRosterSearch';
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

function normaliseNpcPatch(patch = {}) {
  const next = { ...patch };
  if (next.hp !== undefined) {
    const hp = Number(next.hp);
    if (Number.isFinite(hp) && hp >= 0) next.hp = hp;
    else delete next.hp;
  }
  if (next.ac !== undefined) {
    const ac = Number(next.ac);
    if (Number.isFinite(ac) && ac >= 0) next.ac = ac;
    else delete next.ac;
  }
  return next;
}

function NPCsTab({ campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const activeCampaignRef = useRef(campaignId);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNPC, setEditingNPC] = useState(null);
  const [deletingNPC, setDeletingNPC] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNpcId, setSelectedNpcId] = useState('');
  const [formData, setFormData] = useState(() => createNpcDraft());
  // The empty-library onboarding screen can still summon a first NPC.
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    // A campaign change must never display records from the previous party.
    activeCampaignRef.current = campaignId;
    setNpcs([]);
    setSelectedNpcId('');
    setSearchTerm('');
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
      setSelectedNpcId(previous => response.data.some(npc => npc.id === previous) ? previous : (response.data[0]?.id || ''));
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
      // Preserve the sourced GM stats and homebrew actions when saving changes.
      const payload = prepareNpcSavePayload(formData);
      if (editingNPC) {
        await apiClient.put(`/campaigns/${campaignId}/npcs/${editingNPC.id}`, payload);
        toast.success('NPC updated!');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/npcs`, payload);
        toast.success('NPC added!');
      }
      fetchNPCs();
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to save NPC');
    }
  };

  const handleEdit = (npc) => {
    setEditingNPC(npc);
    setFormData(createNpcDraft(npc));
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
    setFormData(createNpcDraft());
    setEditingNPC(null);
    setShowDialog(false);
  };

  // Only shown for an empty roster. Regular creation lives in the Create NPC tool.
  const handleUnseenServant = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the NPC you want');
      return;
    }
    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const response = await apiClient.post('/rook/generate', {
        prompt: aiPrompt, entity_type: 'npc', campaign_id: campaignId,
      });
      if (response.data?.success) {
        setLastGenerated(response.data);
        setAiPrompt('');
        toast.success('NPC created');
        await fetchNPCs();
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not create NPC');
    } finally {
      setAiGenerating(false);
    }
  };

  // Find NPCs by story, role, skills and GM notes as well as the displayed name.
  // Search is always local to the active campaign; never mix the two parties.
  const filteredNPCs = npcs
    .filter(npc => matchesNpcSearch(npc, searchTerm))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));

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
              <NpcFullStatEditor
                key="new-empty"
                draft={formData}
                editing={false}
                onChange={(key, value) => setFormData(previous => ({ ...previous, [key]: value }))}
              />
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
    <div className="rqk-npc-master">
      {/* Full-width GM roster and details: the separate Create NPC tab owns the generator. */}
      {loadError && <div className="rqk-npc-load-error" role="status">
        <strong>Could not refresh the NPC list.</strong>
        <span>Showing the last successfully loaded records; nothing was deleted.</span>
        <Button type="button" onClick={fetchNPCs} className="btn-secondary">Retry loading NPCs</Button>
      </div>}
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
          <DialogContent className="modal rqk-npc-edit-dialog" style={{ maxWidth: '740px', maxHeight: '90dvh', overflowY: 'auto' }}>
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
                    onChange={(e) => setFormData({ ...formData, hp: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>AC</label>
                  <Input
                    data-testid="npc-ac-input"
                    type="number"
                    value={formData.ac}
                    onChange={(e) => setFormData({ ...formData, ac: e.target.value })}
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
              <NpcFullStatEditor
                key={editingNPC?.id || 'new'}
                draft={formData}
                editing={Boolean(editingNPC)}
                onChange={(key, value) => setFormData(previous => ({ ...previous, [key]: value }))}
              />
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
              placeholder="Search names, roles, lore, skills or GM notes..."
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
        <RosterSplitView
          key={campaignId}
          testId="gm-npc-split-reference"
          title="Campaign NPCs"
          items={filteredNPCs}
          selectedId={selectedNpcId}
          onSelect={setSelectedNpcId}
          getSubtitle={npc => npc.role || npc.occupation || npc.location || 'NPC'}
          getBadge={npc => npc.location && (npc.role || npc.occupation) ? npc.location : null}
          renderDetail={npc => (
            <div className="rqk-npc-selected-sheet" data-testid={`npc-card-${npc.id}`}>
              <div className="rqk-reference-browser__detail-actions">
                <Button type="button" aria-label={`Edit ${npc.name}`}
                  data-testid={`edit-npc-btn-${npc.id}`}
                  onClick={() => handleEdit(npc)} className="btn-secondary">
                  <Edit size={15} /> Edit NPC
                </Button>
                {deletingNPC === npc.id ? (
                  <div className="rqk-npc-selected-delete-confirm" role="group" aria-label={`Confirm deletion of ${npc.name}`}>
                    <strong>Delete {npc.name}?</strong>
                    <Button type="button" data-testid={`confirm-delete-npc-${npc.id}`}
                      onClick={() => handleDelete(npc.id)} className="btn-danger"><Trash2 size={14} /> Confirm</Button>
                    <Button type="button" onClick={() => setDeletingNPC(null)} className="btn-secondary"><X size={14} /> Cancel</Button>
                  </div>
                ) : (
                  <Button type="button" aria-label={`Delete ${npc.name}`}
                    data-testid={`delete-npc-btn-${npc.id}`}
                    onClick={() => handleDelete(npc.id)} className="btn-secondary">
                    <Trash2 size={15} /> Delete
                  </Button>
                )}
              </div>
              <NpcCompactStatBlock npc={npc} />
            </div>
          )}
        />
      )}
      </div>
    </div>
  );
}

export default NPCsTab;
