import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Sparkles, Loader, Wand2, Check, Church, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function GodsTab({ campaignId }) {
  const [gods, setGods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGod, setEditingGod] = useState(null);
  const [deletingGod, setDeletingGod] = useState(null); // For delete confirmation
  const [searchTerm, setSearchTerm] = useState(''); // For search
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    description: '',
    symbol: '',
    alignment: '',
    notes: ''
  });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => {
    fetchGods();
  }, [campaignId]);

  const fetchGods = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/gods`);
      setGods(response.data);
    } catch (error) {
      toast.error('Failed to load gods', {
        description: error.response?.data?.detail || 'Check your connection and try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGod) {
        await axios.put(`${API}/campaigns/${campaignId}/gods/${editingGod.id}`, formData);
        toast.success(`${formData.name} updated successfully`, {
          description: 'Changes saved to your pantheon'
        });
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/gods`, formData);
        toast.success(`${formData.name} added to pantheon`, {
          description: 'Your deity is now available in your campaign',
          action: {
            label: 'View',
            onClick: () => setShowDialog(false)
          }
        });
      }
      fetchGods();
      resetForm();
    } catch (error) {
      toast.error(editingGod ? 'Failed to update god' : 'Failed to create god', {
        description: error.response?.data?.detail || 'Please try again'
      });
    }
  };

  const handleEdit = (god) => {
    setEditingGod(god);
    setFormData({
      name: god.name,
      domain: god.domain,
      description: god.description,
      symbol: god.symbol,
      alignment: god.alignment,
      notes: god.notes
    });
    setShowDialog(true);
  };

  // Improved delete with inline confirmation
  const handleDelete = async (godId) => {
    if (deletingGod === godId) {
      // User confirmed, actually delete
      try {
        const god = gods.find(g => g.id === godId);
        await axios.delete(`${API}/campaigns/${campaignId}/gods/${godId}`);
        toast.success(`${god.name} removed from pantheon`, {
          description: 'The deity has been deleted'
        });
        fetchGods();
      } catch (error) {
        toast.error('Failed to delete god', {
          description: error.response?.data?.detail || 'Please try again'
        });
      } finally {
        setDeletingGod(null);
      }
    } else {
      // First click - show confirmation
      setDeletingGod(godId);
      // Auto-cancel after 5 seconds if no action
      setTimeout(() => setDeletingGod(null), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      domain: '',
      description: '',
      symbol: '',
      alignment: '',
      notes: ''
    });
    setEditingGod(null);
    setShowDialog(false);
  };

  // ROOK - Auto-generate and save
  const handleUnseenServant = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the deity', {
        description: 'Enter a brief description to generate your god'
      });
      return;
    }
    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const response = await axios.post(`${API}/rook/generate`, {
        prompt: aiPrompt,
        entity_type: 'god',
        campaign_id: campaignId
      });
      
      if (response.data.success) {
        toast.success(`✨ ${response.data.entity_name} manifested in your pantheon!`, {
          description: 'AI-generated deity added successfully',
          duration: 5000
        });
        setLastGenerated(response.data);
        setAiPrompt('');
        fetchGods(); // Refresh the list
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'The ROOK failed to manifest the deity';
      toast.error('AI generation failed', {
        description: errorMsg
      });
    } finally {
      setAiGenerating(false);
    }
  };

  // Filter gods by search term
  const filteredGods = gods.filter(god => 
    god.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    god.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    god.alignment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Loading skeleton
  if (loading) {
    return (
      <div>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff', marginBottom: '24px' }}>Pantheon</h2>
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  // Empty state
  if (gods.length === 0) {
    return (
      <div>
        <EmptyState
          icon={Church}
          title="No Gods Yet"
          description="Create your first deity to populate your pantheon. Add gods manually or use the ROOK AI to generate them automatically."
          actionLabel="Create Your First God"
          onAction={() => setShowDialog(true)}
          color="#a855f7"
        />
        
        {/* Keep the dialog for creating */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogContent className="modal" style={{ maxWidth: '600px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Add God
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                  <Input
                    data-testid="god-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Domain</label>
                  <Input
                    data-testid="god-domain-input"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="input"
                    placeholder="War, Knowledge, Life..."
                  />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                <textarea
                  data-testid="god-description-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Symbol</label>
                  <Input
                    data-testid="god-symbol-input"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="input"
                    placeholder="Sun, Hammer, etc."
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Alignment</label>
                  <Input
                    data-testid="god-alignment-input"
                    value={formData.alignment}
                    onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
                    className="input"
                    placeholder="Lawful Good, etc."
                  />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                <textarea
                  data-testid="god-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Worship practices, temples, clergy..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" onClick={resetForm} className="btn-outline">
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingGod ? 'Update God' : 'Add God'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      {/* Main Content */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff' }}>
            Pantheon <span style={{ fontSize: '18px', color: '#94a3b8' }}>({filteredGods.length})</span>
          </h2>
          <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-god-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                <Plus size={18} />
                Add God
              </Button>
            </DialogTrigger>
            <DialogContent className="modal" style={{ maxWidth: '600px' }}>
              <DialogHeader>
                <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                  {editingGod ? 'Edit God' : 'Add God'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Name</label>
                    <Input
                      data-testid="god-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Domain</label>
                    <Input
                      data-testid="god-domain-input"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="input"
                      placeholder="War, Knowledge, Life..."
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                  <textarea
                    data-testid="god-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="textarea"
                    style={{ minHeight: '80px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Symbol</label>
                    <Input
                      data-testid="god-symbol-input"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      className="input"
                      placeholder="Sun, Hammer, etc."
                    />
                  </div>
                  <div>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Alignment</label>
                    <Input
                      data-testid="god-alignment-input"
                      value={formData.alignment}
                      onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
                      className="input"
                      placeholder="Lawful Good, etc."
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                  <textarea
                    data-testid="god-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="textarea"
                    style={{ minHeight: '80px' }}
                    placeholder="Worship practices, temples, clergy..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button type="button" onClick={resetForm} className="btn-outline">
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-primary">
                    {editingGod ? 'Update God' : 'Add God'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        {gods.length > 3 && (
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
                placeholder="Search gods by name, domain, or alignment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>
        )}

        {/* No results from search */}
        {filteredGods.length === 0 && searchTerm && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>No gods found matching "{searchTerm}"</p>
            <Button 
              onClick={() => setSearchTerm('')}
              className="btn-outline"
              style={{ marginTop: '12px' }}
            >
              Clear Search
            </Button>
          </div>
        )}

        {/* Gods List */}
        <div className="gods-list">
          {filteredGods.map((god) => (
            <Card key={god.id} className="clickable-box glow-card" style={{ marginBottom: '16px' }}>
              <CardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <Church size={24} color="#a855f7" />
                      <h3 className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', margin: 0 }}>
                        {god.name}
                      </h3>
                    </div>
                    {god.domain && (
                      <p className="gold-text" style={{ fontSize: '14px', marginBottom: '8px' }}>
                        Domain: {god.domain}
                      </p>
                    )}
                    {god.description && (
                      <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '8px', lineHeight: '1.6' }}>
                        {god.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px' }}>
                      {god.symbol && (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                          <strong style={{ color: '#67e8f9' }}>Symbol:</strong> {god.symbol}
                        </span>
                      )}
                      {god.alignment && (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                          <strong style={{ color: '#67e8f9' }}>Alignment:</strong> {god.alignment}
                        </span>
                      )}
                    </div>
                    {god.notes && (
                      <p style={{ 
                        marginTop: '12px', 
                        color: '#94a3b8', 
                        fontSize: '13px', 
                        fontStyle: 'italic',
                        borderLeft: '3px solid #a855f7',
                        paddingLeft: '12px'
                      }}>
                        {god.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px', flexShrink: 0 }}>
                    <Button
                      data-testid={`edit-god-${god.id}`}
                      onClick={() => handleEdit(god)}
                      className="btn-icon"
                      title="Edit god"
                    >
                      <Edit size={16} />
                    </Button>
                    
                    {/* Delete with confirmation */}
                    {deletingGod === god.id ? (
                      <div style={{ 
                        display: 'flex', 
                        gap: '4px', 
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid #ef4444'
                      }}>
                        <span style={{ fontSize: '12px', color: '#fff', whiteSpace: 'nowrap' }}>Delete?</span>
                        <Button
                          data-testid={`confirm-delete-god-${god.id}`}
                          onClick={() => handleDelete(god.id)}
                          className="btn-icon"
                          style={{ background: '#ef4444', minHeight: '32px', minWidth: '32px' }}
                          title="Confirm delete"
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          onClick={() => setDeletingGod(null)}
                          className="btn-icon"
                          style={{ minHeight: '32px', minWidth: '32px' }}
                          title="Cancel"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        data-testid={`delete-god-${god.id}`}
                        onClick={() => handleDelete(god.id)}
                        className="btn-icon"
                        title="Delete god"
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ROOK Sidebar */}
      <div>
        <Card className="glow-card" style={{ position: 'sticky', top: '100px' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7' }}>
              <Wand2 size={24} />
              ROOK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
              Describe a deity and the ROOK will manifest it in your pantheon automatically.
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>
                Deity Description
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A god of storms and thunder, chaotic neutral, wielding lightning bolts..."
                className="textarea"
                style={{ minHeight: '120px', fontSize: '13px' }}
                disabled={aiGenerating}
              />
            </div>

            <Button
              onClick={handleUnseenServant}
              disabled={aiGenerating || !aiPrompt.trim()}
              className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {aiGenerating ? (
                <>
                  <Loader className="spin" size={18} />
                  Manifesting...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate God
                </>
              )}
            </Button>

            {lastGenerated && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid #22c55e',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Check size={16} color="#22c55e" />
                  <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: '700' }}>
                    Successfully Created!
                  </span>
                </div>
                <p style={{ color: '#e2e8f0', fontSize: '12px' }}>
                  {lastGenerated.entity_name} has been added to your pantheon
                </p>
              </div>
            )}

            <div style={{ 
              marginTop: '20px', 
              padding: '12px',
              background: 'rgba(168, 85, 247, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.2)'
            }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
                💡 <strong style={{ color: '#a855f7' }}>Tip:</strong> Be specific about domain, alignment, and symbols for better results.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default GodsTab;
