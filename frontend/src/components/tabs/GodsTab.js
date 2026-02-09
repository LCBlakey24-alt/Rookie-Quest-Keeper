import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Sparkles, Copy, Loader } from 'lucide-react';

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
  const [aiResult, setAiResult] = useState('');

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

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    setAiGenerating(true);
    try {
      const response = await axios.post(`${API}/ai/generate`, {
        prompt: aiPrompt,
        generation_type: 'world'
      });
      setAiResult(response.data.content);
      toast.success('AI content generated!');
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setAiGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      {/* Main Content */}
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>Gods & Deities</h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-god-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Add God
            </Button>
          </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '600px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
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
                    placeholder="e.g., War, Knowledge"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Symbol</label>
                  <Input
                    data-testid="god-symbol-input"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="input"
                    placeholder="e.g., Sword and Shield"
                  />
                </div>
                <div>
                  <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Alignment</label>
                  <Input
                    data-testid="god-alignment-input"
                    value={formData.alignment}
                    onChange={(e) => setFormData({ ...formData, alignment: e.target.value })}
                    className="input"
                    placeholder="e.g., Lawful Good"
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
                  style={{ minHeight: '100px' }}
                />
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
          <p style={{ color: '#8b7355' }}>No gods added yet. Create your pantheon!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {gods.map(god => (
            <Card key={god.id} data-testid={`god-card-${god.id}`} className="card">
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <Sparkles size={24} style={{ color: '#d4af37', marginTop: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', marginBottom: '4px' }}>
                      {god.name}
                    </CardTitle>
                    <p style={{ fontSize: '14px', color: '#8b7355' }}>
                      {god.domain && `${god.domain}`}
                      {god.domain && god.alignment && ' • '}
                      {god.alignment}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {god.symbol && (
                  <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '6px' }}>
                    <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '4px' }}>Symbol</p>
                    <p style={{ fontSize: '14px', color: '#e8dcc4' }}>{god.symbol}</p>
                  </div>
                )}
                {god.description && (
                  <p style={{ fontSize: '14px', color: '#e8dcc4', marginBottom: '12px', lineHeight: '1.5' }}>{god.description}</p>
                )}
                {god.notes && (
                  <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '12px', fontStyle: 'italic' }}>{god.notes}</p>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Button data-testid={`edit-god-btn-${god.id}`} onClick={() => handleEdit(god)} className="btn-secondary" style={{ flex: 1 }}>
                    <Edit size={14} />
                  </Button>
                  <Button data-testid={`delete-god-btn-${god.id}`} onClick={() => handleDelete(god.id)} className="btn-danger">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      {/* AI Assistant Panel */}
      <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '2px solid #d4af37' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ fontSize: '13px', color: '#8b7355', marginBottom: '16px', lineHeight: '1.5' }}>
              Generate god ideas, domains, descriptions, and lore with AI.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                What do you need?
              </label>
              <textarea
                data-testid="ai-god-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="textarea"
                style={{ minHeight: '100px', fontSize: '13px' }}
                placeholder="Example: Create a god of storms and seas for a nautical campaign"
              />
            </div>
            <Button
              data-testid="generate-god-btn"
              onClick={handleAIGenerate}
              disabled={aiGenerating}
              className="btn-primary"
              style={{ width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {aiGenerating ? (
                <>
                  <Loader size={16} className="loading-spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate
                </>
              )}
            </Button>
            {aiResult && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="gold-text" style={{ fontSize: '14px' }}>Result</label>
                  <Button
                    data-testid="copy-god-result-btn"
                    onClick={() => copyToClipboard(aiResult)}
                    className="btn-icon"
                    style={{ padding: '4px' }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
                <div style={{
                  background: 'rgba(20, 16, 12, 0.6)',
                  border: '1px solid #5a4a2f',
                  borderRadius: '6px',
                  padding: '12px',
                  maxHeight: '400px',
                  overflow: 'auto',
                  fontSize: '13px',
                  color: '#e8dcc4',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {aiResult}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default GodsTab;