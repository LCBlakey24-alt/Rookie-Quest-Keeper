import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Save, Wand2, Copy, Loader, ArrowDown } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CampaignSettingTab({ campaignId }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState('');

  useEffect(() => {
    fetchSetting();
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ 
            fontSize: '26px', 
            color: '#ffffff',
            fontFamily: 'Montserrat, sans-serif',
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

      {/* AI Assistant Panel */}
      <div style={{ position: 'sticky', top: '120px', height: 'fit-content' }}>
        <div className="glow-panel" style={{ borderColor: '#22c55e' }}>
          <h3 style={{ 
            fontSize: '18px', 
            color: '#ffffff', 
            marginBottom: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '700'
          }}>
            <Sparkles size={20} style={{ color: '#22c55e' }} />
            AI Assistant
          </h3>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
            Generate world-building ideas, setting descriptions, conflicts, and lore with AI.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '13px',
              color: '#67e8f9',
              fontWeight: '600'
            }}>
              What do you need?
            </label>
            <textarea
              data-testid="ai-setting-prompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="textarea-glow"
              style={{ minHeight: '100px', fontSize: '13px' }}
              placeholder="Example: Create a high-fantasy world where magic is fading and ancient technologies are being rediscovered"
            />
          </div>
          <Button
            data-testid="generate-setting-btn"
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
                <label style={{ fontSize: '13px', color: '#67e8f9', fontWeight: '600' }}>Result</label>
                <Button
                  data-testid="copy-setting-result-btn"
                  onClick={() => copyToClipboard(aiResult)}
                  className="btn-icon"
                  style={{ padding: '6px' }}
                >
                  <Copy size={14} />
                </Button>
              </div>
              <div style={{
                background: 'rgba(10, 10, 40, 0.6)',
                border: '2px solid #1e40af',
                borderRadius: '10px',
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
      </div>
    </div>
  );
}

export default CampaignSettingTab;
