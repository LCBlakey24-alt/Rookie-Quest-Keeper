import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

function NotesTab({ campaignId }) {
  const [tabs, setTabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTab, setEditingTab] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', order: 0 });
  const [selectedTab, setSelectedTab] = useState(null);

  useEffect(() => {
    fetchTabs();
  }, [campaignId]);

  const fetchTabs = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/tabs`);
      setTabs(response.data);
      if (response.data.length > 0 && !selectedTab) {
        setSelectedTab(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTab) {
        await axios.put(`${API}/campaigns/${campaignId}/tabs/${editingTab.id}`, formData);
        toast.success('Note updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/tabs`, formData);
        toast.success('Note added!');
      }
      fetchTabs();
      resetForm();
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleEdit = (tab) => {
    setEditingTab(tab);
    setFormData({ title: tab.title, content: tab.content, order: tab.order });
    setShowDialog(true);
  };

  const handleDelete = async (tabId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/tabs/${tabId}`);
      toast.success('Note deleted');
      if (selectedTab?.id === tabId) {
        setSelectedTab(null);
      }
      fetchTabs();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', order: 0 });
    setEditingTab(null);
    setShowDialog(false);
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>Notes & Lore</h2>
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-note-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
              <Plus size={18} />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="modal" style={{ maxWidth: '700px' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
                {editingTab ? 'Edit Note' : 'Add Note'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Title</label>
                <Input
                  data-testid="note-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="e.g., Locations, NPCs, Quests, Lore"
                  required
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Content</label>
                <textarea
                  data-testid="note-content-input"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="textarea"
                  style={{ minHeight: '300px' }}
                  placeholder="Write your campaign notes, lore, locations, quests, etc..."
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button type="button" className="btn-secondary" onClick={resetForm}>Cancel</Button>
                <Button data-testid="note-submit-btn" type="submit" className="btn-primary">{editingTab ? 'Update' : 'Add'} Note</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tabs.length === 0 ? (
        <Card className="parchment-dark" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#8b7355' }}>No notes yet. Add your campaign notes, lore, locations, and quests!</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
          {/* Notes List */}
          <div>
            {tabs.map(tab => (
              <Card
                key={tab.id}
                data-testid={`note-item-${tab.id}`}
                onClick={() => setSelectedTab(tab)}
                className="card"
                style={{
                  cursor: 'pointer',
                  marginBottom: '12px',
                  background: selectedTab?.id === tab.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(45, 36, 22, 0.9)',
                  border: selectedTab?.id === tab.id ? '1px solid #d4af37' : '1px solid #5a4a2f'
                }}
              >
                <CardContent style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <FileText size={18} style={{ color: '#d4af37', marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <h3 className="medieval-heading" style={{ fontSize: '16px', color: '#d4af37', marginBottom: '8px' }}>
                        {tab.title}
                      </h3>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          data-testid={`edit-note-btn-${tab.id}`}
                          onClick={(e) => { e.stopPropagation(); handleEdit(tab); }}
                          className="btn-icon"
                          style={{ padding: '4px' }}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          data-testid={`delete-note-btn-${tab.id}`}
                          onClick={(e) => { e.stopPropagation(); handleDelete(tab.id); }}
                          className="btn-icon"
                          style={{ padding: '4px', color: '#dc143c' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Note Content */}
          <Card className="parchment-dark" style={{ minHeight: '500px' }}>
            {selectedTab ? (
              <CardContent style={{ padding: '32px' }}>
                <h2 className="medieval-heading" style={{ fontSize: '32px', color: '#d4af37', marginBottom: '24px' }}>
                  {selectedTab.title}
                </h2>
                <div style={{
                  color: '#e8dcc4',
                  fontSize: '16px',
                  lineHeight: '1.8',
                  whiteSpace: 'pre-wrap'
                }}>
                  {selectedTab.content || 'No content yet.'}
                </div>
              </CardContent>
            ) : (
              <CardContent style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ color: '#8b7355' }}>Select a note to view its content</p>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default NotesTab;
