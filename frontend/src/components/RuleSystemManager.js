import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  BookOpen, Upload, Plus, ChevronDown, ChevronRight, Trash2, 
  FileJson, FileText, Download, Settings, Wand2, Users, Swords,
  Shield, Sparkles, Package, Eye, Edit2, Save, X, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// GM Theme - Red (Tron Aries)
const theme = {
  primary: '#E11D48',
  hover: '#F43F5E',
  subtle: 'rgba(225, 29, 72, 0.15)',
  glow: '0 0 20px rgba(225, 29, 72, 0.3)',
  bg: '#0D0D0D',
  card: '#1F1F1F',
  panel: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(255, 255, 255, 0.1)',
  success: '#22C55E',
  warning: '#F59E0B'
};

const CONTENT_TYPES = [
  { id: 'classes', label: 'Classes', icon: Users, color: '#3B82F6' },
  { id: 'subclasses', label: 'Subclasses', icon: Users, color: '#6366F1' },
  { id: 'races', label: 'Races/Species', icon: Users, color: '#8B5CF6' },
  { id: 'spells', label: 'Spells', icon: Sparkles, color: '#EC4899' },
  { id: 'items', label: 'Items', icon: Package, color: '#F59E0B' },
  { id: 'feats', label: 'Feats', icon: Shield, color: '#22C55E' },
  { id: 'monsters', label: 'Monsters', icon: Swords, color: '#EF4444' },
  { id: 'features', label: 'Class Features', icon: Wand2, color: '#14B8A6' },
];

function RuleSystemManager() {
  const [systems, setSystems] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentCounts, setContentCounts] = useState({});
  const [expandedType, setExpandedType] = useState(null);
  const [contentList, setContentList] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadType, setUploadType] = useState('classes');
  const [uploadData, setUploadData] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCreateSystem, setShowCreateSystem] = useState(false);
  const [newSystem, setNewSystem] = useState({ name: '', short_code: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSystems();
  }, []);

  useEffect(() => {
    if (selectedSystem) {
      fetchSystemDetails(selectedSystem.id);
    }
  }, [selectedSystem]);

  const fetchSystems = async () => {
    try {
      const response = await axios.get(`${API}/rule-systems`);
      setSystems(response.data.systems || []);
      if (response.data.systems?.length > 0 && !selectedSystem) {
        setSelectedSystem(response.data.systems[0]);
      }
    } catch (error) {
      console.error('Failed to load rule systems:', error);
      toast.error('Failed to load rule systems');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemDetails = async (systemId) => {
    try {
      const response = await axios.get(`${API}/rule-systems/${systemId}`);
      setContentCounts(response.data.content_counts || {});
    } catch (error) {
      console.error('Failed to load system details:', error);
    }
  };

  const fetchContentList = async (contentType) => {
    if (!selectedSystem) return;
    try {
      const response = await axios.get(`${API}/rule-systems/${selectedSystem.id}/${contentType}`);
      const data = response.data[contentType] || response.data.classes || response.data.races || 
                   response.data.spells || response.data.items || response.data.feats || 
                   response.data.monsters || [];
      setContentList(data);
    } catch (error) {
      console.error(`Failed to load ${contentType}:`, error);
      setContentList([]);
    }
  };

  const handleExpandType = (typeId) => {
    if (expandedType === typeId) {
      setExpandedType(null);
      setContentList([]);
    } else {
      setExpandedType(typeId);
      fetchContentList(typeId);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await axios.post(
        `${API}/rule-systems/${selectedSystem.id}/upload-file?content_type=${uploadType}&overwrite=false`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      if (response.data.success) {
        toast.success(`Uploaded ${response.data.created} items!`);
      } else {
        toast.warning(`Created ${response.data.created}, Errors: ${response.data.errors.length}`);
      }
      
      fetchSystemDetails(selectedSystem.id);
      if (expandedType === uploadType) {
        fetchContentList(uploadType);
      }
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleJsonUpload = async () => {
    if (!uploadData.trim()) {
      toast.error('Please enter JSON data');
      return;
    }

    let data;
    try {
      data = JSON.parse(uploadData);
      if (!Array.isArray(data)) {
        data = [data];
      }
    } catch (e) {
      toast.error('Invalid JSON format');
      return;
    }

    setUploading(true);
    try {
      const response = await axios.post(`${API}/rule-systems/${selectedSystem.id}/upload`, {
        system_id: selectedSystem.id,
        content_type: uploadType,
        data: data,
        overwrite_existing: false
      });

      if (response.data.success) {
        toast.success(`Uploaded ${response.data.created} items!`);
        setUploadData('');
        setShowUpload(false);
      } else {
        toast.warning(`Created ${response.data.created}, Errors: ${response.data.errors.length}`);
      }

      fetchSystemDetails(selectedSystem.id);
      if (expandedType === uploadType) {
        fetchContentList(uploadType);
      }
    } catch (error) {
      toast.error('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleCreateSystem = async () => {
    if (!newSystem.name || !newSystem.short_code) {
      toast.error('Name and short code are required');
      return;
    }

    try {
      const response = await axios.post(`${API}/rule-systems`, newSystem);
      setSystems([...systems, response.data]);
      setSelectedSystem(response.data);
      setShowCreateSystem(false);
      setNewSystem({ name: '', short_code: '', description: '' });
      toast.success('Rule system created!');
    } catch (error) {
      toast.error('Failed to create: ' + (error.response?.data?.detail || error.message));
    }
  };

  const generateSampleJson = (type) => {
    const samples = {
      classes: [
        {
          name: "Fighter",
          description: "A master of martial combat",
          hit_die: 10,
          primary_ability: "Strength or Dexterity",
          saving_throw_proficiencies: ["Strength", "Constitution"],
          armor_proficiencies: ["Light", "Medium", "Heavy", "Shields"],
          weapon_proficiencies: ["Simple", "Martial"],
          spellcasting_ability: null,
          subclass_level: 3,
          multiclass_requirements: { "Strength": 13 }
        }
      ],
      races: [
        {
          name: "Elf",
          description: "Graceful and long-lived",
          size: "Medium",
          speed: 30,
          ability_score_increases: { "Dexterity": 2 },
          traits: [{ "name": "Darkvision", "description": "60 feet of darkvision" }],
          languages: ["Common", "Elvish"],
          darkvision: 60
        }
      ],
      spells: [
        {
          name: "Fireball",
          level: 3,
          school: "Evocation",
          casting_time: "1 action",
          range: "150 feet",
          components: "V, S, M (a tiny ball of bat guano)",
          duration: "Instantaneous",
          description: "A bright streak flashes...",
          classes: ["Wizard", "Sorcerer"],
          concentration: false
        }
      ],
      items: [
        {
          name: "Longsword",
          type: "weapon",
          rarity: "common",
          damage: "1d8",
          damage_type: "slashing",
          properties: ["versatile"],
          weight: 3,
          cost: "15 gp"
        }
      ],
      feats: [
        {
          name: "Alert",
          description: "Always on the lookout for danger",
          prerequisites: "",
          benefits: ["+5 to initiative", "Can't be surprised while conscious"]
        }
      ],
      monsters: [
        {
          name: "Goblin",
          size: "Small",
          type: "humanoid",
          armor_class: 15,
          hit_points: 7,
          challenge_rating: "1/4",
          xp: 50,
          actions: [{ "name": "Scimitar", "description": "Melee Weapon Attack: +4 to hit, 1d6+2 slashing" }]
        }
      ]
    };
    return JSON.stringify(samples[type] || samples.classes, null, 2);
  };

  const filteredContent = contentList.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading rule systems...
      </div>
    );
  }

  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: theme.subtle,
            border: `1px solid ${theme.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} color={theme.primary} />
          </div>
          <div>
            <h3 style={{ color: theme.primary, fontSize: '18px', fontWeight: '700', margin: 0 }}>
              RULE SYSTEM MANAGER
            </h3>
            <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
              Manage game rules, classes, races, spells, and more
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateSystem(true)}
          style={{ background: theme.primary, border: 'none', color: '#fff', padding: '10px 16px' }}
        >
          <Plus size={16} style={{ marginRight: '8px' }} />
          New Rule System
        </Button>
      </div>

      {/* System Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {systems.map(system => (
          <Button
            key={system.id}
            onClick={() => setSelectedSystem(system)}
            style={{
              background: selectedSystem?.id === system.id ? theme.primary : 'transparent',
              border: `1px solid ${selectedSystem?.id === system.id ? theme.primary : theme.border}`,
              color: selectedSystem?.id === system.id ? '#fff' : theme.muted,
              padding: '10px 16px'
            }}
          >
            {system.name}
          </Button>
        ))}
      </div>

      {selectedSystem && (
        <>
          {/* System Info */}
          <div style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ color: theme.text, fontSize: '16px', margin: '0 0 8px' }}>
                  {selectedSystem.name}
                </h4>
                <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
                  {selectedSystem.description || 'No description'}
                </p>
                <p style={{ color: theme.textSecondary, fontSize: '12px', marginTop: '8px' }}>
                  Code: <code style={{ background: theme.card, padding: '2px 6px' }}>{selectedSystem.short_code}</code>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  onClick={() => { setShowUpload(true); setUploadType('classes'); }}
                  style={{
                    background: theme.success,
                    border: 'none',
                    color: '#fff',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={14} />
                  Upload Content
                </Button>
              </div>
            </div>
          </div>

          {/* Content Types Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
            {CONTENT_TYPES.map(type => {
              const count = contentCounts[type.id] || 0;
              const isExpanded = expandedType === type.id;
              const Icon = type.icon;

              return (
                <div key={type.id} style={{
                  background: theme.bg,
                  border: `1px solid ${isExpanded ? type.color : theme.border}`,
                  transition: 'all 0.2s'
                }}>
                  <div
                    onClick={() => handleExpandType(type.id)}
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} color={type.color} />
                      <span style={{ color: theme.text, fontWeight: '500' }}>{type.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: type.color,
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {count}
                      </span>
                      {isExpanded ? <ChevronDown size={16} color={theme.muted} /> : <ChevronRight size={16} color={theme.muted} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${theme.border}`, padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                      {/* Search */}
                      <div style={{ marginBottom: '12px', position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: theme.muted }} />
                        <Input
                          placeholder={`Search ${type.label.toLowerCase()}...`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ paddingLeft: '32px', background: theme.card, border: `1px solid ${theme.border}`, color: theme.text, fontSize: '13px' }}
                        />
                      </div>

                      {/* Content List */}
                      {filteredContent.length === 0 ? (
                        <p style={{ color: theme.muted, fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                          No {type.label.toLowerCase()} found
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {filteredContent.slice(0, 20).map(item => (
                            <div key={item.id} style={{
                              padding: '8px 12px',
                              background: theme.card,
                              border: `1px solid ${theme.border}`,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ color: theme.text, fontSize: '13px' }}>{item.name}</span>
                              <Eye size={14} color={theme.muted} style={{ cursor: 'pointer' }} />
                            </div>
                          ))}
                          {filteredContent.length > 20 && (
                            <p style={{ color: theme.muted, fontSize: '12px', textAlign: 'center' }}>
                              +{filteredContent.length - 20} more...
                            </p>
                          )}
                        </div>
                      )}

                      {/* Quick Upload for this type */}
                      <Button
                        onClick={() => { setShowUpload(true); setUploadType(type.id); }}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          background: 'transparent',
                          border: `1px dashed ${type.color}`,
                          color: type.color,
                          padding: '8px'
                        }}
                      >
                        <Upload size={14} style={{ marginRight: '6px' }} />
                        Upload {type.label}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUpload && selectedSystem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.panel,
            border: `1px solid ${theme.primary}`,
            padding: '24px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: theme.primary, margin: 0 }}>
                Upload Content to {selectedSystem.name}
              </h3>
              <Button onClick={() => setShowUpload(false)} style={{ background: 'transparent', border: 'none', color: theme.muted, padding: '4px' }}>
                <X size={20} />
              </Button>
            </div>

            {/* Content Type Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Content Type
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {CONTENT_TYPES.map(type => (
                  <Button
                    key={type.id}
                    onClick={() => setUploadType(type.id)}
                    style={{
                      background: uploadType === type.id ? type.color : 'transparent',
                      border: `1px solid ${uploadType === type.id ? type.color : theme.border}`,
                      color: uploadType === type.id ? '#fff' : theme.muted,
                      padding: '6px 12px',
                      fontSize: '12px'
                    }}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Upload File (JSON or CSV)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  background: 'transparent',
                  border: `2px dashed ${theme.border}`,
                  color: theme.text,
                  padding: '20px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileJson size={32} color={theme.primary} />
                <span>Click to upload .json or .csv file</span>
                <span style={{ fontSize: '12px', color: theme.muted }}>
                  {uploading ? 'Uploading...' : 'Supports bulk upload of multiple items'}
                </span>
              </Button>
            </div>

            {/* JSON Input */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ color: theme.muted, fontSize: '12px', textTransform: 'uppercase' }}>
                  Or Paste JSON Data
                </label>
                <Button
                  onClick={() => setUploadData(generateSampleJson(uploadType))}
                  style={{ background: 'transparent', border: 'none', color: theme.primary, padding: '4px 8px', fontSize: '12px' }}
                >
                  Load Sample
                </Button>
              </div>
              <textarea
                value={uploadData}
                onChange={(e) => setUploadData(e.target.value)}
                placeholder="Paste JSON array here..."
                style={{
                  width: '100%',
                  height: '200px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: '12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowUpload(false)}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '10px 20px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleJsonUpload}
                disabled={uploading || !uploadData.trim()}
                style={{ background: theme.success, border: 'none', color: '#fff', padding: '10px 20px' }}
              >
                <Upload size={16} style={{ marginRight: '8px' }} />
                {uploading ? 'Uploading...' : 'Upload JSON'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create System Modal */}
      {showCreateSystem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: theme.panel,
            border: `1px solid ${theme.primary}`,
            padding: '24px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ color: theme.primary, margin: '0 0 20px' }}>Create Custom Rule System</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase' }}>
                System Name *
              </label>
              <Input
                value={newSystem.name}
                onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                placeholder="e.g., Custom Sci-Fi, Homebrew Fantasy"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Short Code * (no spaces)
              </label>
              <Input
                value={newSystem.short_code}
                onChange={(e) => setNewSystem({ ...newSystem, short_code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                placeholder="e.g., scifi_v1, homebrew_2024"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: theme.muted, fontSize: '12px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Description
              </label>
              <textarea
                value={newSystem.description}
                onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                placeholder="Describe your custom rule system..."
                style={{
                  width: '100%',
                  height: '80px',
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: '10px',
                  resize: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowCreateSystem(false)}
                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '10px 20px' }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSystem}
                style={{ background: theme.primary, border: 'none', color: '#fff', padding: '10px 20px' }}
              >
                <Save size={16} style={{ marginRight: '8px' }} />
                Create System
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RuleSystemManager;
