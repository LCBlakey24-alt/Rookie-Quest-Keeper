import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Edit, Trash2, Upload, Download, Skull, Save, Wand2, Loader, Sparkles } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

const CREATURE_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon', 'elemental',
  'fey', 'fiend', 'giant', 'humanoid', 'monstrosity', 'ooze', 'plant', 'undead'
];

const CREATURE_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
];

function CustomCreatureManager({ campaignId, onSelectCreature, isOpen, onClose, embedded = false }) {
  const [creatures, setCreatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCreature, setEditingCreature] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cr: '1',
    hp: 10,
    ac: 10,
    type: 'humanoid',
    size: 'Medium',
    speed: '30 ft.',
    abilities: '',
    description: ''
  });
  
  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [justCreated, setJustCreated] = useState(null); // Track AI-created creature for highlighting

  useEffect(() => {
    if ((isOpen || embedded) && campaignId) {
      fetchCreatures();
    }
  }, [isOpen, embedded, campaignId]);

  const fetchCreatures = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/custom-creatures`);
      setCreatures(response.data);
    } catch (error) {
      console.error('Failed to fetch creatures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a creature name');
      return;
    }

    try {
      if (editingCreature) {
        await axios.put(`${API}/campaigns/${campaignId}/custom-creatures/${editingCreature.id}`, formData);
        toast.success('Creature updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/custom-creatures`, formData);
        toast.success('Custom creature created!');
      }
      resetForm();
      fetchCreatures();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save creature');
    }
  };

  const handleDelete = async (creatureId) => {
    if (!window.confirm('Delete this creature?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/custom-creatures/${creatureId}`);
      toast.success('Creature deleted');
      fetchCreatures();
    } catch (error) {
      toast.error('Failed to delete creature');
    }
  };

  const handleEdit = (creature) => {
    setEditingCreature(creature);
    setFormData({
      name: creature.name,
      cr: creature.cr,
      hp: creature.hp,
      ac: creature.ac,
      type: creature.type,
      size: creature.size,
      speed: creature.speed,
      abilities: creature.abilities || '',
      description: creature.description || ''
    });
    setShowForm(true);
  };

  // AI Generation with ROOK
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe the creature you want to create');
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/rook/generate`, {
        prompt: aiPrompt,
        entity_type: 'creature',
        campaign_id: campaignId
      });

      if (response.data.success) {
        toast.success(`Created ${response.data.entity_name}!`);
        setJustCreated(response.data.entity_id);
        setAiPrompt('');
        fetchCreatures();
        
        // Clear highlight after 5 seconds
        setTimeout(() => setJustCreated(null), 5000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to generate creature';
      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const creatures = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const creature = {
            name: values[headers.indexOf('name')] || `Creature ${i}`,
            cr: values[headers.indexOf('cr')] || '1',
            hp: parseInt(values[headers.indexOf('hp')]) || 10,
            ac: parseInt(values[headers.indexOf('ac')]) || 10,
            type: values[headers.indexOf('type')] || 'humanoid',
            size: values[headers.indexOf('size')] || 'Medium',
            speed: values[headers.indexOf('speed')] || '30 ft.',
            abilities: values[headers.indexOf('abilities')] || '',
            description: values[headers.indexOf('description')] || ''
          };
          creatures.push(creature);
        }

        if (creatures.length > 0) {
          await axios.post(`${API}/campaigns/${campaignId}/custom-creatures/import`, creatures);
          toast.success(`Imported ${creatures.length} creatures!`);
          fetchCreatures();
        }
      } catch (error) {
        toast.error('Failed to import CSV. Check format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    const headers = 'name,cr,hp,ac,type,size,speed,abilities,description';
    const rows = creatures.map(c => 
      `"${c.name}","${c.cr}",${c.hp},${c.ac},"${c.type}","${c.size}","${c.speed}","${c.abilities || ''}","${c.description || ''}"`
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-creatures.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cr: '1',
      hp: 10,
      ac: 10,
      type: 'humanoid',
      size: 'Medium',
      speed: '30 ft.',
      abilities: '',
      description: ''
    });
    setEditingCreature(null);
    setShowForm(false);
  };

  const handleAddToEncounter = (creature) => {
    if (onSelectCreature) {
      onSelectCreature({
        name: creature.name,
        cr: creature.cr,
        hp: creature.hp,
        ac: creature.ac,
        type: creature.type,
        abilities: creature.abilities,
        isCustom: true
      });
      toast.success(`Added ${creature.name} to encounter!`);
    }
  };

  if (!isOpen && !embedded) return null;

  // Content component (shared between modal and embedded modes)
  const content = (
    <>
      {/* Header - only show close button in modal mode */}
      {!embedded && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ 
              color: '#fff', 
              fontSize: '24px', 
              fontFamily: "Eros Book, sans-serif",
              fontWeight: '400',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Skull size={24} color="#ef4444" />
              Custom Creatures
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
              Create your own monsters or import from CSV
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer'
            }}
          >
            <X size={24} color="#fff" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary"
          data-testid="create-creature-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Create Creature
        </Button>
        <label>
          <input
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            style={{ display: 'none' }}
            data-testid="import-csv-input"
          />
          <Button
            as="span"
            className="btn-outline"
            data-testid="import-csv-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
          >
            <Upload size={18} /> Import CSV
          </Button>
        </label>
        {creatures.length > 0 && (
          <Button
            onClick={handleExportCSV}
            className="btn-outline"
            data-testid="export-csv-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={18} /> Export CSV
          </Button>
        )}
      </div>

      {/* CSV Format Help */}
      <div style={{
        background: 'rgba(74, 125, 255, 0.1)',
        border: '1px solid rgba(74, 125, 255, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '20px',
        fontSize: '13px',
        color: '#94a3b8'
      }}>
        <strong style={{ color: '#4a7dff' }}>CSV Format:</strong> name, cr, hp, ac, type, size, speed, abilities, description
        <br />
        <span style={{ color: '#64748b' }}>Example: "Goblin Chief","2",45,15,"humanoid","Small","30 ft.","Multiattack","A goblin leader"</span>
      </div>

      {/* ROOK AI Generator */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '2px solid #a855f7',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Wand2 size={24} color="#a855f7" />
          <h3 style={{ color: '#a855f7', fontSize: '18px', fontWeight: '400', fontFamily: "Eros Book, sans-serif" }}>
            ROOK
          </h3>
          <Sparkles size={16} color="#a855f7" style={{ opacity: 0.7 }} />
        </div>
        <p style={{ color: '#c4b5fd', fontSize: '13px', marginBottom: '16px' }}>
          Describe a creature concept and let the AI generate a complete stat block for you!
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Example: A corrupted forest guardian made of twisted vines and thorns, CR 4, with poison attacks..."
            data-testid="ai-creature-prompt"
            style={{
              flex: '1 1 300px',
              minHeight: '80px',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '2px solid #6b21a8',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
          <Button
            onClick={handleAIGenerate}
            disabled={generating || !aiPrompt.trim()}
            data-testid="generate-creature-btn"
            style={{
              background: generating ? '#6b21a8' : 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '12px',
              color: '#fff',
              fontWeight: '400',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: generating ? 'wait' : 'pointer',
              opacity: (!aiPrompt.trim() || generating) ? 0.6 : 1,
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            {generating ? (
              <>
                <Loader size={18} className="animate-spin" /> Conjuring...
              </>
            ) : (
              <>
                <Wand2 size={18} /> Generate Creature
              </>
            )}
          </Button>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#9333ea', fontSize: '11px', fontWeight: '400' }}>Try:</span>
          {['Undead dragon wyrmling', 'Goblin shaman with fire magic', 'Giant ice spider', 'Corrupted treant'].map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setAiPrompt(suggestion)}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid #9333ea',
                borderRadius: '20px',
                padding: '4px 10px',
                color: '#c4b5fd',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '2px solid #374151',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '18px' }}>
            {editingCreature ? 'Edit Creature' : 'New Creature'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Creature name"
                  data-testid="creature-name-input"
                  required
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>CR</label>
                <select
                  value={formData.cr}
                  onChange={(e) => setFormData({ ...formData, cr: e.target.value })}
                  data-testid="creature-cr-select"
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#1e293b', border: '1px solid #374151', color: '#fff' }}
                >
                  {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>HP</label>
                <Input
                  type="number"
                  value={formData.hp}
                  onChange={(e) => setFormData({ ...formData, hp: parseInt(e.target.value) || 0 })}
                  data-testid="creature-hp-input"
                  min="1"
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>AC</label>
                <Input
                  type="number"
                  value={formData.ac}
                  onChange={(e) => setFormData({ ...formData, ac: parseInt(e.target.value) || 0 })}
                  data-testid="creature-ac-input"
                  min="1"
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  data-testid="creature-type-select"
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#1e293b', border: '1px solid #374151', color: '#fff' }}
                >
                  {CREATURE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Size</label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  data-testid="creature-size-select"
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#1e293b', border: '1px solid #374151', color: '#fff' }}
                >
                  {CREATURE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Speed</label>
                <Input
                  value={formData.speed}
                  onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                  placeholder="30 ft."
                  data-testid="creature-speed-input"
                />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Abilities/Actions</label>
              <textarea
                value={formData.abilities}
                onChange={(e) => setFormData({ ...formData, abilities: e.target.value })}
                placeholder="Multiattack, Bite (2d6+4), etc."
                data-testid="creature-abilities-input"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #374151', color: '#fff', minHeight: '60px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of this creature..."
                data-testid="creature-description-input"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #374151', color: '#fff', minHeight: '60px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" className="btn-primary" data-testid="save-creature-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Save size={18} /> {editingCreature ? 'Update' : 'Create'}
              </Button>
              <Button type="button" onClick={resetForm} className="btn-outline" data-testid="cancel-creature-btn">Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Creatures List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
      ) : creatures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }} data-testid="no-creatures-message">
          <Skull size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <p>No custom creatures yet</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>Create your own or import from CSV!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }} data-testid="creatures-list">
          {creatures.map(creature => (
            <div
              key={creature.id}
              data-testid={`creature-card-${creature.id}`}
              style={{
                background: justCreated === creature.id 
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: justCreated === creature.id ? '2px solid #a855f7' : '2px solid #374151',
                borderRadius: '12px',
                padding: '16px',
                transition: 'all 0.3s',
                boxShadow: justCreated === creature.id ? '0 0 20px rgba(168, 85, 247, 0.4)' : 'none',
                animation: justCreated === creature.id ? 'pulse 2s ease-in-out infinite' : 'none'
              }}
            >
              {justCreated === creature.id && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                  color: '#a855f7',
                  fontSize: '11px',
                  fontWeight: '400'
                }}>
                  <Sparkles size={12} /> Just Created by ROOK
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4 style={{ color: '#fff', fontSize: '16px', fontWeight: '400' }}>{creature.name}</h4>
                <span style={{
                  background: '#ef444420',
                  color: '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '400'
                }}>
                  CR {creature.cr}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '13px', color: '#94a3b8' }}>
                <span>HP: <span style={{ color: '#22c55e' }}>{creature.hp}</span></span>
                <span>AC: <span style={{ color: '#4a7dff' }}>{creature.ac}</span></span>
                <span>{creature.size} {creature.type}</span>
              </div>
              {creature.abilities && (
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  {creature.abilities.substring(0, 100)}{creature.abilities.length > 100 ? '...' : ''}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                {onSelectCreature && (
                  <Button
                    onClick={() => handleAddToEncounter(creature)}
                    className="btn-primary"
                    data-testid={`add-creature-${creature.id}`}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }}
                  >
                    <Plus size={14} /> Add to Encounter
                  </Button>
                )}
                <Button
                  onClick={() => handleEdit(creature)}
                  className="btn-outline"
                  data-testid={`edit-creature-${creature.id}`}
                  style={{ padding: '6px 10px' }}
                >
                  <Edit size={14} />
                </Button>
                <Button
                  onClick={() => handleDelete(creature.id)}
                  className="btn-danger"
                  data-testid={`delete-creature-${creature.id}`}
                  style={{ padding: '6px 10px' }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // If embedded mode, render directly without modal wrapper
  if (embedded) {
    return <div data-testid="custom-creature-manager">{content}</div>;
  }

  // Modal mode
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a0a2e 0%, #1e1e4a 100%)',
        border: '2px solid #4a7dff',
        borderRadius: '20px',
        padding: '24px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
      }} data-testid="custom-creature-manager">
        {content}
      </div>
    </div>
  );
}

export default CustomCreatureManager;
