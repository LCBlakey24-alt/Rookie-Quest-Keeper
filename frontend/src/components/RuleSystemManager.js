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
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// GM Theme - Red (Tron Aries)
const theme = {
  primary: '#F59E0B',
  hover: '#D97706',
  subtle: 'rgba(225, 29, 72, 0.15)',
  glow: '0 0 20px rgba(225, 29, 72, 0.3)',
  bg: '#0B0F19',
  card: '#111827',
  panel: '#111827',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(212, 175, 55, 0.15)',
  success: '#22C55E',
  warning: '#F59E0B'
};

const CONTENT_TYPES = [
  { id: 'classes', label: 'Classes', icon: Users, color: '#06B6D4' },
  { id: 'subclasses', label: 'Subclasses', icon: Users, color: '#6366F1' },
  { id: 'races', label: 'Races/Species', icon: Users, color: '#8B5CF6' },
  { id: 'spells', label: 'Spells', icon: Sparkles, color: '#EC4899' },
  { id: 'items', label: 'Items', icon: Package, color: '#F59E0B' },
  { id: 'feats', label: 'Feats', icon: Shield, color: '#22C55E' },
  { id: 'monsters', label: 'Monsters', icon: Swords, color: '#D97706' },
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
          name: "Blood Hunter",
          description: "Warriors who use forbidden blood magic to hunt monsters",
          hit_die: 10,
          primary_ability: "Strength or Dexterity",
          saving_throw_proficiencies: ["Dexterity", "Intelligence"],
          armor_proficiencies: ["Light", "Medium", "Shields"],
          weapon_proficiencies: ["Simple", "Martial"],
          spellcasting_ability: null,
          subclass_level: 3,
          multiclass_requirements: { "Strength": 13, "Intelligence": 13 },
          features: [
            { "name": "Hunter's Bane", "level": 1, "description": "Advantage on tracking and identifying creatures" },
            { "name": "Blood Maledict", "level": 1, "description": "Curse enemies using your own blood" }
          ]
        }
      ],
      subclasses: [
        {
          name: "Order of the Ghostslayer",
          parent_class: "Blood Hunter",
          unlock_level: 3,
          description: "Blood hunters specialized in fighting undead",
          features: [
            { "name": "Rite of the Dawn", "level": 3, "description": "Your rite damage becomes radiant against undead" },
            { "name": "Curse Specialist", "level": 7, "description": "Extra uses of Blood Maledict" }
          ]
        }
      ],
      races: [
        {
          name: "Dhampir",
          description: "Half-vampires with a thirst for blood",
          size: "Medium",
          speed: 35,
          ability_score_increases: { "Choose": "+2 to one, +1 to another" },
          traits: [
            { "name": "Ancestral Legacy", "description": "Gain skills based on origin" },
            { "name": "Darkvision", "description": "60 feet of darkvision" },
            { "name": "Deathless Nature", "description": "You don't need to breathe" },
            { "name": "Spider Climb", "description": "Climb at your walking speed" },
            { "name": "Vampiric Bite", "description": "Constitution-based bite attack that heals you" }
          ],
          languages: ["Common", "One of your choice"],
          darkvision: 60
        }
      ],
      spells: [
        {
          name: "Blood Curse of Binding",
          level: 2,
          school: "Necromancy",
          casting_time: "1 bonus action",
          range: "30 feet",
          components: "V, S",
          duration: "Concentration, up to 1 minute",
          description: "You curse a creature's blood to hold them in place. The target must make a Strength saving throw or be restrained.",
          classes: ["Blood Hunter"],
          concentration: true
        }
      ],
      items: [
        {
          name: "Blood Vial",
          type: "Wondrous Item",
          rarity: "Uncommon",
          attunement: false,
          description: "A specially crafted vial that can preserve blood for ritual use. Blood stored in this vial remains fresh for 7 days.",
          properties: ["Can store up to 3 blood samples"],
          weight: 0.5,
          cost: "50 gp"
        }
      ],
      feats: [
        {
          name: "Grim Harvest",
          description: "You have learned to draw power from the death of your enemies",
          prerequisites: "Constitution 13 or higher",
          benefits: [
            "When you reduce a creature to 0 hit points, you gain temporary hit points equal to your Constitution modifier",
            "You have advantage on death saving throws"
          ]
        }
      ],
      monsters: [
        {
          name: "Blood Elemental",
          size: "Large",
          type: "Elemental",
          armor_class: 14,
          hit_points: "102 (12d10 + 36)",
          speed: "30 ft.",
          challenge_rating: 5,
          xp: 1800,
          abilities: { "STR": 18, "DEX": 14, "CON": 16, "INT": 6, "WIS": 10, "CHA": 6 },
          damage_resistances: ["bludgeoning", "piercing", "slashing"],
          damage_immunities: ["poison"],
          condition_immunities: ["exhaustion", "paralyzed", "poisoned"],
          senses: "darkvision 60 ft., passive Perception 10",
          actions: [
            { "name": "Multiattack", "description": "The elemental makes two slam attacks" },
            { "name": "Slam", "description": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage plus 7 (2d6) necrotic damage." },
            { "name": "Blood Drain (Recharge 5-6)", "description": "The elemental targets one creature within 5 feet. The target must make a DC 14 Constitution saving throw, taking 21 (6d6) necrotic damage on a failed save." }
          ]
        }
      ],
      features: [
        {
          name: "Blood Maledict",
          class_name: "Blood Hunter",
          level: 1,
          description: "You can invoke a blood curse on a creature you can see within 30 feet. You have a number of uses equal to your Intelligence modifier.",
          subclass_name: null
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
            <h3 style={{ color: theme.primary, fontSize: '18px', fontWeight: '400', margin: 0 }}>
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
                        fontWeight: '400'
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

            {/* Upload Instructions */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h4 style={{ color: '#60a5fa', margin: '0 0 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} /> How to Upload Your Content
              </h4>
              <div style={{ color: theme.textSecondary, fontSize: '13px', lineHeight: '1.6' }}>
                <p style={{ margin: '0 0 8px' }}><strong>JSON Format:</strong> Upload an array of objects or a single object.</p>
                
                {uploadType === 'classes' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code>, <code>hit_die</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: description, primary_ability, saving_throws, features</p>
                  </div>
                )}
                {uploadType === 'subclasses' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code>, <code>parent_class</code>, <code>unlock_level</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: description, features, spells</p>
                  </div>
                )}
                {uploadType === 'races' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: ability_bonuses, size, speed, traits, languages</p>
                  </div>
                )}
                {uploadType === 'spells' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code>, <code>level</code>, <code>school</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: casting_time, range, components, duration, description, classes</p>
                  </div>
                )}
                {uploadType === 'feats' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: description, prerequisite, benefits</p>
                  </div>
                )}
                {uploadType === 'items' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code>, <code>type</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: description, rarity, attunement, properties, damage, cost</p>
                  </div>
                )}
                {uploadType === 'monsters' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code>, <code>type</code>, <code>challenge_rating</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: size, alignment, armor_class, hit_points, abilities, actions</p>
                  </div>
                )}
                {uploadType === 'features' && (
                  <div style={{ background: theme.bg, padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                    <p style={{ margin: '0 0 4px', color: '#f59e0b' }}>Required: <code>name</code>, <code>class_name</code>, <code>level</code></p>
                    <p style={{ margin: 0, color: theme.muted }}>Optional: description, subclass_name</p>
                  </div>
                )}
                
                <p style={{ margin: '12px 0 0', fontSize: '12px', color: theme.muted }}>
                  Tip: Click "Load Sample" below to see an example JSON format for {uploadType}.
                </p>
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
