import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Save, Wand2, Copy, Loader, ArrowDown, Key, Users, Upload, FileText, Trash2, BookOpen } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CampaignSettingTab({ campaignId }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loadingJoinCode, setLoadingJoinCode] = useState(false);
  
  // World setting state
  const [worldSetting, setWorldSetting] = useState('custom');
  const [worldSettingNotes, setWorldSettingNotes] = useState('');
  const [availableSettings, setAvailableSettings] = useState([]);
  const [savingWorldSetting, setSavingWorldSetting] = useState(false);
  
  // Custom rules state
  const [customRules, setCustomRules] = useState([]);
  const [uploadingRules, setUploadingRules] = useState(false);
  const [manualRulesName, setManualRulesName] = useState('');
  const [manualRulesContent, setManualRulesContent] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    fetchSetting();
    fetchWorldSetting();
    fetchCustomRules();
  }, [campaignId]);

  const fetchSetting = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/setting`);
      setContent(response.data?.content || '');
    } catch (error) {
      toast.error('Failed to load campaign setting');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorldSetting = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/world-setting`);
      setWorldSetting(response.data?.world_setting || 'custom');
      setWorldSettingNotes(response.data?.world_setting_notes || '');
      setAvailableSettings(response.data?.available_settings || []);
    } catch (error) {
      console.error('Failed to load world setting');
    }
  };

  const fetchCustomRules = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/custom-rules`);
      setCustomRules(response.data?.rules || []);
    } catch (error) {
      console.error('Failed to load custom rules');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingRules(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axios.post(`${API}/campaigns/${campaignId}/custom-rules/upload-file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(`Rules from "${file.name}" uploaded! ROOK will now reference these rules.`);
      fetchCustomRules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload rules');
    } finally {
      setUploadingRules(false);
      e.target.value = '';
    }
  };

  const handleManualRulesSubmit = async () => {
    if (!manualRulesName.trim() || !manualRulesContent.trim()) {
      toast.error('Please provide a name and content for the rules');
      return;
    }
    
    setUploadingRules(true);
    try {
      await axios.post(`${API}/campaigns/${campaignId}/custom-rules`, {
        name: manualRulesName,
        content: manualRulesContent,
        source_type: 'manual'
      });
      
      toast.success('Custom rules saved!');
      setManualRulesName('');
      setManualRulesContent('');
      setShowManualInput(false);
      fetchCustomRules();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save rules');
    } finally {
      setUploadingRules(false);
    }
  };

  const handleDeleteRules = async (ruleId, ruleName) => {
    if (!window.confirm(`Delete "${ruleName}"? This cannot be undone.`)) return;
    
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/custom-rules/${ruleId}`);
      toast.success('Rules deleted');
      fetchCustomRules();
    } catch (error) {
      toast.error('Failed to delete rules');
    }
  };

  // Campaign Content (Structured Rulesets) state
  const [campaignContent, setCampaignContent] = useState({ races: [], classes: [], subclasses: [], backgrounds: [], feats: [], rulesets: [] });
  const [uploadingRuleset, setUploadingRuleset] = useState(false);

  const fetchCampaignContent = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/content`);
      setCampaignContent(response.data || { races: [], classes: [], subclasses: [], backgrounds: [], feats: [], rulesets: [] });
    } catch (error) {
      console.error('Failed to load campaign content');
    }
  };

  useEffect(() => {
    fetchCampaignContent();
  }, [campaignId]);

  const handleRulesetJsonUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      e.target.value = '';
      return;
    }

    setUploadingRuleset(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate required fields
      if (!data.ruleset_name) {
        toast.error('JSON must include "ruleset_name" field');
        return;
      }

      // Upload to API
      const response = await axios.post(`${API}/campaigns/${campaignId}/content/bulk-upload`, data);
      
      // Show success message
      toast.success(response.data.message);
      
      // Show what was skipped (if any)
      if (response.data.skipped_summary?.length > 0) {
        toast.info(
          `Skipped ${response.data.skipped_summary.length} duplicate(s): ${response.data.skipped_summary.slice(0, 5).join(', ')}${response.data.skipped_summary.length > 5 ? '...' : ''}`,
          { duration: 8000 }
        );
      }
      
      fetchCampaignContent();
    } catch (error) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format. Please check your file.');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to upload ruleset');
      }
    } finally {
      setUploadingRuleset(false);
      e.target.value = '';
    }
  };

  const handleDeleteRuleset = async (rulesetId, rulesetName) => {
    if (!window.confirm(`Delete ruleset "${rulesetName}" and ALL its content (races, classes, etc.)? This cannot be undone.`)) return;
    
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/content/rulesets/${rulesetId}`);
      toast.success('Ruleset deleted');
      fetchCampaignContent();
    } catch (error) {
      toast.error('Failed to delete ruleset');
    }
  };

  const handleSaveWorldSetting = async () => {
    setSavingWorldSetting(true);
    try {
      await axios.put(`${API}/campaigns/${campaignId}/world-setting`, {
        world_setting: worldSetting,
        world_setting_notes: worldSettingNotes
      });
      toast.success('World setting saved! AI will now use this context.');
    } catch (error) {
      toast.error('Failed to save world setting');
    } finally {
      setSavingWorldSetting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/campaigns/${campaignId}/setting`, { content });
      toast.success('Campaign setting saved!');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
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
        generation_type: 'world',
        campaign_id: campaignId
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

  const fetchJoinCode = async () => {
    setLoadingJoinCode(true);
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/join-code`);
      setJoinCode(response.data.join_code);
    } catch (error) {
      toast.error('Failed to get join code', {
        description: error.response?.data?.detail || 'Please try again'
      });
    } finally {
      setLoadingJoinCode(false);
    }
  };

  if (loading) return <div className="loading-spinner"></div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '26px', 
            color: '#ffffff',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: '800'
          }}>
            Campaign Setting
          </h2>
          <Button 
            data-testid="save-setting-btn"
            onClick={handleSave} 
            className="btn-primary" 
            disabled={saving}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* World Setting Selector - AI Context */}
        <div className="glow-panel" style={{ marginBottom: '24px', borderColor: '#D4A017' }}>
          <h3 style={{ 
            fontSize: '16px', 
            color: '#ffffff', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Wand2 size={18} style={{ color: '#D4A017' }} />
            AI World Context
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            Select a tone label and add your own notes. ROOK will only use saved campaign details, uploaded rules, and your prompt as lore.
          </p>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#E0E0E0' }}>
              World Setting
            </label>
            <select
              data-testid="world-setting-select"
              value={worldSetting}
              onChange={(e) => setWorldSetting(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1A1A1A',
                border: '1px solid #404040',
                borderRadius: '8px',
                color: '#E0E0E0',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {availableSettings.map(setting => (
                <option key={setting.id} value={setting.id}>
                  {setting.name} - {setting.description}
                </option>
              ))}
              {availableSettings.length === 0 && (
                <>
                  <option value="high_fantasy">High Fantasy - Classic D&D style, kingdoms, dragons</option>
                  <option value="magipunk_noir">Magipunk/Noir - Magic meets industry, intrigue</option>
                  <option value="classic_fantasy">Classic Sword & Sorcery - Gritty, old-school</option>
                  <option value="epic_fantasy">Epic Fantasy - Grand narratives, prophecies</option>
                  <option value="gothic_horror">Gothic Horror - Dark and dread, cursed lands</option>
                  <option value="fantasy_space">Fantasy Space - Magical ships between worlds</option>
                  <option value="planar_adventure">Planar Adventures - Multiple planes, portals</option>
                  <option value="custom">Custom Setting - Your own homebrew world</option>
                </>
              )}
            </select>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#E0E0E0' }}>
              Additional Context for AI (Optional)
            </label>
            <textarea
              data-testid="world-setting-notes"
              value={worldSettingNotes}
              onChange={(e) => setWorldSettingNotes(e.target.value)}
              placeholder="Add specific details about your campaign that ROOK should know...&#10;&#10;Example: This campaign takes place in 1492 DR, focused on the Sword Coast. The party is based in Neverwinter and works for Lord Dagult Neverember."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: '#1A1A1A',
                border: '1px solid #404040',
                borderRadius: '8px',
                color: '#E0E0E0',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>
          
          <Button
            data-testid="save-world-setting-btn"
            onClick={handleSaveWorldSetting}
            disabled={savingWorldSetting}
            style={{
              width: '100%',
              background: '#D4A017',
              border: 'none',
              padding: '10px',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            {savingWorldSetting ? 'Saving...' : 'Save AI Context'}
          </Button>
        </div>

        {/* Custom Rules Upload Section */}
        <div className="glow-panel" style={{ marginBottom: '24px', borderColor: '#22C55E' }}>
          <h3 style={{ 
            fontSize: '16px', 
            color: '#ffffff', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BookOpen size={18} style={{ color: '#22C55E' }} />
            Custom Rules
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
            Upload your own rulebooks (PDF, TXT, MD). ROOK will reference these when generating content. 
            <strong style={{ color: '#22C55E' }}> You're responsible for ensuring you have rights to use uploaded content.</strong>
          </p>
          
          {/* Upload buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <label style={{
              padding: '10px 16px',
              background: '#22C55E',
              color: 'white',
              borderRadius: '8px',
              cursor: uploadingRules ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: uploadingRules ? 0.5 : 1
            }}>
              <Upload size={16} />
              {uploadingRules ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploadingRules}
                style={{ display: 'none' }}
              />
            </label>
            
            <button
              onClick={() => setShowManualInput(!showManualInput)}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid #22C55E',
                color: '#22C55E',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileText size={16} />
              Paste Text
            </button>
          </div>
          
          {/* Manual text input */}
          {showManualInput && (
            <div style={{ 
              background: '#1A1A1A', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: '1px solid #333'
            }}>
              <input
                type="text"
                placeholder="Rule name (e.g., 'PHB 2014 - Chapter 9')"
                value={manualRulesName}
                onChange={(e) => setManualRulesName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#262626',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  color: '#E0E0E0',
                  marginBottom: '10px',
                  fontSize: '14px'
                }}
              />
              <textarea
                placeholder="Paste your rules content here..."
                value={manualRulesContent}
                onChange={(e) => setManualRulesContent(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '150px',
                  padding: '10px',
                  background: '#262626',
                  border: '1px solid #404040',
                  borderRadius: '6px',
                  color: '#E0E0E0',
                  marginBottom: '10px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
              <Button
                onClick={handleManualRulesSubmit}
                disabled={uploadingRules}
                style={{
                  width: '100%',
                  background: '#22C55E',
                  border: 'none'
                }}
              >
                {uploadingRules ? 'Saving...' : 'Save Rules'}
              </Button>
            </div>
          )}
          
          {/* List of uploaded rules */}
          {customRules.length > 0 && (
            <div>
              <h4 style={{ fontSize: '13px', color: '#808080', marginBottom: '10px' }}>
                Uploaded Rules ({customRules.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customRules.map(rule => (
                  <div 
                    key={rule.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      background: '#1A1A1A',
                      borderRadius: '6px',
                      border: '1px solid #333'
                    }}
                  >
                    <div>
                      <span style={{ color: '#E0E0E0', fontSize: '14px' }}>{rule.name}</span>
                      <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
                        ({Math.round(rule.char_count / 1000)}K chars)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteRules(rule.id, rule.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Character Creation Content (JSON Rulesets) */}
        <div className="glow-panel" style={{ marginBottom: '24px', borderColor: '#D4A017' }}>
          <h3 style={{ 
            fontSize: '16px', 
            color: '#ffffff', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BookOpen size={18} style={{ color: '#D4A017' }} />
            Character Creation Content
          </h3>
          
          {/* Guidance Section */}
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              <strong style={{ color: '#D4A017' }}>How it works:</strong> Upload JSON rulesets containing custom races, classes, subclasses, backgrounds, and feats.
              Players in your campaign will see these options when creating characters.
            </p>
            
            <details style={{ marginTop: '12px' }}>
              <summary style={{ 
                color: '#D4A017',
                fontSize: '13px', 
                cursor: 'pointer',
                fontWeight: '600'
              }}>
                Important Notes & JSON Format
              </summary>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#D4A017' }}>Multiple Rulesets Stack:</strong> Each upload creates a separate ruleset.
                  If you upload a second file, it adds to (not replaces) existing content. Delete old rulesets to remove their content.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#D4A017' }}>Avoid Duplicates:</strong> If multiple rulesets contain the same race/class name,
                  players will see duplicates in the character creator. Use unique names or delete old rulesets first.
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#D4A017' }}>Copyright Notice:</strong> Only upload content you have rights to use.
                  You are responsible for ensuring your uploads don't infringe on copyrights.
                </p>
                <div style={{ 
                  background: '#0A0A0A', 
                  padding: '12px', 
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  marginTop: '12px',
                  overflowX: 'auto'
                }}>
                  <code style={{ color: '#94a3b8' }}>
{`{
  "ruleset_name": "My Custom Ruleset",
  "ruleset_description": "Optional description",
  "races": [
    {
      "name": "Custom Race",
      "ability_bonuses": {"strength": 2, "charisma": 1},
      "traits": ["Darkvision", "Fire Resistance"],
      "description": "A powerful custom race"
    }
  ],
  "classes": [
    {
      "name": "Custom Class",
      "hit_die": "d10",
      "primary_ability": "Strength",
      "saving_throws": ["Strength", "Constitution"],
      "description": "A mighty warrior class"
    }
  ],
  "subclasses": [],
  "backgrounds": [],
  "feats": []
}`}
                  </code>
                </div>
              </div>
            </details>
          </div>
          
          {/* Upload JSON button */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              padding: '12px 20px',
              background: '#D4A017',
              color: 'black',
              borderRadius: '8px',
              cursor: uploadingRuleset ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              opacity: uploadingRuleset ? 0.5 : 1
            }}>
              <Upload size={18} />
              {uploadingRuleset ? 'Uploading...' : 'Upload Ruleset JSON'}
              <input
                type="file"
                accept=".json"
                onChange={handleRulesetJsonUpload}
                disabled={uploadingRuleset}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          {/* Display uploaded rulesets and content counts */}
          {campaignContent.rulesets?.length > 0 && (
            <div>
              <h4 style={{ fontSize: '13px', color: '#808080', marginBottom: '10px' }}>
                Uploaded Rulesets ({campaignContent.rulesets.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {campaignContent.rulesets.map(rs => {
                  // Count items in this ruleset
                  const raceCount = campaignContent.races?.filter(r => r.ruleset_id === rs.id).length || 0;
                  const classCount = campaignContent.classes?.filter(c => c.ruleset_id === rs.id).length || 0;
                  const subclassCount = campaignContent.subclasses?.filter(s => s.ruleset_id === rs.id).length || 0;
                  const bgCount = campaignContent.backgrounds?.filter(b => b.ruleset_id === rs.id).length || 0;
                  const featCount = campaignContent.feats?.filter(f => f.ruleset_id === rs.id).length || 0;
                  const totalItems = raceCount + classCount + subclassCount + bgCount + featCount;
                  
                  return (
                    <div 
                      key={rs.id}
                      style={{
                        padding: '12px',
                        background: '#1A1A1A',
                        borderRadius: '8px',
                        border: '1px solid #F59E0B33'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: '#D4A017', fontSize: '14px', fontWeight: '800' }}>{rs.name}</span>
                          {rs.description && (
                            <p style={{ color: '#666', fontSize: '12px', margin: '4px 0 0 0' }}>{rs.description}</p>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', fontSize: '11px', color: '#666' }}>
                            {raceCount > 0 && <span>{raceCount} race{raceCount !== 1 ? 's' : ''}</span>}
                            {classCount > 0 && <span>{classCount} class{classCount !== 1 ? 'es' : ''}</span>}
                            {subclassCount > 0 && <span>{subclassCount} subclass{subclassCount !== 1 ? 'es' : ''}</span>}
                            {bgCount > 0 && <span>{bgCount} background{bgCount !== 1 ? 's' : ''}</span>}
                            {featCount > 0 && <span>{featCount} feat{featCount !== 1 ? 's' : ''}</span>}
                            {totalItems === 0 && <span style={{ color: '#D4A017' }}>Empty ruleset</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRuleset(rs.id, rs.name)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Delete ruleset and all its content"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Content summary */}
          {campaignContent.has_custom_content && (
            <div style={{ 
              background: '#1A1A1A', 
              padding: '12px', 
              borderRadius: '8px',
              border: '1px solid #333'
            }}>
              <h4 style={{ fontSize: '13px', color: '#808080', marginBottom: '8px' }}>
                Available for Character Creation
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px' }}>
                {campaignContent.races?.length > 0 && (
                  <span style={{ color: '#E0E0E0' }}>
                    <strong style={{ color: '#D4A017' }}>{campaignContent.races.length}</strong> Races
                  </span>
                )}
                {campaignContent.classes?.length > 0 && (
                  <span style={{ color: '#E0E0E0' }}>
                    <strong style={{ color: '#D4A017' }}>{campaignContent.classes.length}</strong> Classes
                  </span>
                )}
                {campaignContent.subclasses?.length > 0 && (
                  <span style={{ color: '#E0E0E0' }}>
                    <strong style={{ color: '#D4A017' }}>{campaignContent.subclasses.length}</strong> Subclasses
                  </span>
                )}
                {campaignContent.backgrounds?.length > 0 && (
                  <span style={{ color: '#E0E0E0' }}>
                    <strong style={{ color: '#D4A017' }}>{campaignContent.backgrounds.length}</strong> Backgrounds
                  </span>
                )}
                {campaignContent.feats?.length > 0 && (
                  <span style={{ color: '#E0E0E0' }}>
                    <strong style={{ color: '#D4A017' }}>{campaignContent.feats.length}</strong> Feats
                  </span>
                )}
              </div>
              <div style={{ marginTop: '12px' }}>
                <a 
                  href={`/characters/new?campaignId=${campaignId}`}
                  style={{
                    color: '#F59E0B',
                    fontSize: '13px',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  → Create a character using this content
                </a>
              </div>
            </div>
          )}
          
          {!campaignContent.has_custom_content && (
            <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
              No custom content uploaded yet. Upload a JSON ruleset to give your players custom character options.
            </p>
          )}
        </div>

        <div className="glow-panel">
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '16px', fontStyle: 'italic' }}>
            Describe your campaign's world, setting, themes, and overall premise. This is your campaign's foundation.
          </p>
          <textarea
            data-testid="setting-content-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="textarea-glow"
            style={{ minHeight: '400px', fontSize: '15px', lineHeight: '1.8' }}
            placeholder="Describe your campaign world...&#10;&#10;Example:&#10;- What is the world called?&#10;- What's the current state of the realm?&#10;- What are the major conflicts or threats?&#10;- What makes this setting unique?"
          />
        </div>
      </div>

      {/* ROOK Panel */}
      <div style={{ position: 'sticky', top: '120px', height: 'fit-content' }}>
        <div className="glow-panel" style={{ borderColor: '#D4A017' }}>
          <h3 style={{ 
            fontSize: '18px', 
            color: '#ffffff', 
            marginBottom: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: '700'
          }}>
            <Wand2 size={20} style={{ color: '#D4A017' }} />
            ROOK
          </h3>
          <p style={{ fontSize: '13px', color: '#B3B3B3', marginBottom: '16px', lineHeight: '1.5' }}>
            Generate world-building ideas, setting descriptions, conflicts, and lore. Copy to your setting or use for inspiration.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '13px',
              color: '#D4A017',
              fontWeight: '600'
            }}>
              What do you need?
            </label>
            <textarea
              data-testid="ai-setting-prompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="textarea-glow"
              style={{ minHeight: '100px', fontSize: '13px', borderColor: '#D4A017' }}
              placeholder="Example: Create a high-fantasy world where magic is fading and ancient technologies are being rediscovered"
            />
          </div>
          <Button
            data-testid="generate-setting-btn"
            onClick={handleAIGenerate}
            disabled={aiGenerating}
            className="btn-primary"
            style={{ 
              width: '100%', 
              marginBottom: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              background: '#D4A017',
              border: 'none'
            }}
          >
            {aiGenerating ? (
              <>
                <Loader size={16} className="loading-spinner" />
                Summoning...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate Ideas
              </>
            )}
          </Button>
          {aiResult && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', color: '#D4A017', fontWeight: '800' }}>Result</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button
                    data-testid="insert-setting-result-btn"
                    onClick={() => {
                      setContent(prev => prev ? `${prev}\n\n${aiResult}` : aiResult);
                      toast.success('Inserted into setting!');
                    }}
                    className="btn-outline"
                    style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', gap: '4px', borderColor: '#F59E0B', color: '#F59E0B' }}
                  >
                    <ArrowDown size={12} />
                    Insert
                  </Button>
                  <Button
                    data-testid="copy-setting-result-btn"
                    onClick={() => copyToClipboard(aiResult)}
                    className="btn-icon"
                    style={{ padding: '6px' }}
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>
              <div style={{
                background: 'rgba(10, 10, 20, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '14px',
                maxHeight: '400px',
                overflow: 'auto',
                fontSize: '13px',
                color: '#ffffff',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}>
                {aiResult}
              </div>
            </div>
          )}
        </div>

        {/* Player Join Code Panel */}
        <div className="glow-panel" style={{ borderColor: '#F59E0B', marginTop: '20px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            color: '#ffffff', 
            marginBottom: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: '700'
          }}>
            <Users size={20} style={{ color: '#F59E0B' }} />
            Player Join Code
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
            Share this code with players so they can link their characters to your campaign.
          </p>

          {joinCode ? (
            <div>
              <div style={{
                padding: '20px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '3px solid #F59E0B',
                borderRadius: '16px',
                textAlign: 'center',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                  <Key size={24} color="#F59E0B" />
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '800',
                  color: '#F59E0B',
                  letterSpacing: '8px',
                  fontFamily: 'monospace'
                }}>
                  {joinCode}
                </div>
              </div>
              <Button
                onClick={() => {
                  copyToClipboard(joinCode);
                  toast.success('Join code copied!', {
                    description: 'Share this with your players'
                  });
                }}
                className="btn-primary"
                style={{ 
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #D4A017 0%, #F5C542 100%)'
                }}
              >
                <Copy size={16} />
                Copy Join Code
              </Button>
            </div>
          ) : (
            <Button
              onClick={fetchJoinCode}
              disabled={loadingJoinCode}
              className="btn-primary"
              style={{ 
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #D4A017 0%, #F5C542 100%)'
              }}
            >
              {loadingJoinCode ? (
                <>
                  <Loader size={16} className="loading-spinner" />
                  Loading...
                </>
              ) : (
                <>
                  <Key size={16} />
                  Get Join Code
                </>
              )}
            </Button>
          )}

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(74, 125, 255, 0.1)',
            border: '1px solid #4a7dff',
            borderRadius: '8px'
          }}>
            <p style={{ color: '#4a7dff', fontSize: '12px', lineHeight: '1.5' }}>
              💡 Players use this code in their character sheet to join your campaign.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignSettingTab;
