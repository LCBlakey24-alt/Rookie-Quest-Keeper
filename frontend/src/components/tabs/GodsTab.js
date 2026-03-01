import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Sparkles, Loader, Wand2, Check } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function GodsTab({ campaignId }) {
  const [gods, setGods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGod, setEditingGod] = useState(null);
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
      toast.error('Failed to load gods');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGod) {
        await axios.put(`${API}/campaigns/${campaignId}/gods/${editingGod.id}`, formData);
        toast.success('God updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/gods`, formData);
        toast.success('God added!');
      }
      fetchGods();
      resetForm();
    } catch (error) {
      toast.error('Failed to save god');
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

  const handleDelete = async (godId) => {
    if (!window.confirm('Delete this god?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/gods/${godId}`);
      toast.success('God deleted');
      fetchGods();
    } catch (error) {
      toast.error('Failed to delete god');
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

  // Unseen Servant - Auto-generate and save
  const handleUnseenServant = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the deity you want');
      return;
    }
    setAiGenerating(true);
    setLastGenerated(null);
    try {
      const response = await axios.post(`${API}/unseen-servant/generate`, {
        prompt: aiPrompt,
        entity_type: 'god',
        campaign_id: campaignId
      });
      
      if (response.data.success) {
        toast.success(`✨ ${response.data.entity_name} has been added to your pantheon!`);
        setLastGenerated(response.data);
        setAiPrompt('');
        fetchGods(); // Refresh the list
      }
    } catch (error) {
      toast.error('The Unseen Servant failed to manifest the deity');
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      {/* Main Content */}
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff' }}>Pantheon</h2>
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
              <div style={{ marginBottom: '24px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Notes</label>
                <textarea
                  data-testid="god-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="textarea"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button data-testid="god-submit-btn" type="submit" className="btn-primary">{editingGod ? 'Update' : 'Add'} God</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {gods.length === 0 ? (
        <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#bae6fd' }}>No gods added yet. Create your pantheon!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {gods.map(god => (
            <Card 
              key={god.id} 
              data-testid={`god-card-${god.id}`} 
              className="card"
              style={{
                animation: lastGenerated?.entity_id === god.id ? 'glow-pulse 2s ease-out' : 'none',
                border: lastGenerated?.entity_id === god.id ? '2px solid #22c55e' : undefined
              }}
            >
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {god.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {god.name}
                      {lastGenerated?.entity_id === god.id && (
                        <span style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Just created
                        </span>
                      )}
                    </CardTitle>
                    {god.domain && (
                      <p style={{ fontSize: '14px', color: '#a855f7' }}>{god.domain}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button data-testid={`edit-god-btn-${god.id}`} onClick={() => handleEdit(god)} className="btn-secondary" style={{ padding: '8px' }}>
                      <Edit size={14} />
                    </Button>
                    <Button data-testid={`delete-god-btn-${god.id}`} onClick={() => handleDelete(god.id)} className="btn-danger" style={{ padding: '8px' }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {god.description && (
                  <p style={{ fontSize: '14px', color: '#ffffff', marginBottom: '12px', lineHeight: '1.5' }}>{god.description}</p>
                )}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {god.symbol && (
                    <div style={{ padding: '8px 12px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#a855f7', marginBottom: '2px' }}>Symbol</p>
                      <p style={{ fontSize: '14px', color: '#ffffff' }}>{god.symbol}</p>
                    </div>
                  )}
                  {god.alignment && (
                    <div style={{ padding: '8px 12px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '8px' }}>
                      <p style={{ fontSize: '12px', color: '#818cf8', marginBottom: '2px' }}>Alignment</p>
                      <p style={{ fontSize: '14px', color: '#ffffff' }}>{god.alignment}</p>
                    </div>
                  )}
                </div>
                {god.notes && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', fontStyle: 'italic' }}>{god.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      {/* Unseen Servant Panel */}
      <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '2px solid #a855f7' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wand2 size={20} style={{ color: '#a855f7' }} />
              Unseen Servant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: '13px', color: '#c4b5fd', marginBottom: '16px', lineHeight: '1.5' }}>
              Describe a deity and the Unseen Servant will create and save it to your pantheon automatically.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#a855f7', fontWeight: '600' }}>
                Describe your deity
              </label>
              <textarea
                data-testid="unseen-servant-god-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="textarea"
                style={{ minHeight: '100px', fontSize: '13px', borderColor: '#a855f7' }}
                placeholder="Example: A mysterious god of shadows and secrets, worshipped by rogues and spies"
              />
            </div>
            <Button
              data-testid="summon-god-btn"
              onClick={handleUnseenServant}
              disabled={aiGenerating}
              className="btn-primary"
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
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
                  Summon Deity
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
                  <span style={{ color: '#22c55e', fontWeight: '600', fontSize: '13px' }}>Deity Created!</span>
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

export default GodsTab;
