import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save, Sparkles, Copy, Loader } from 'lucide-react';

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
    <div className="campaign-management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>Campaign Setting</h2>
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

      <Card className="parchment-dark" style={{ padding: '32px' }}>
        <p style={{ fontSize: '14px', color: '#8b7355', marginBottom: '16px', fontStyle: 'italic' }}>
          Describe your campaign's world, setting, themes, and overall premise. This is your campaign's foundation.
        </p>
        <textarea
          data-testid="setting-content-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="textarea"
          style={{ minHeight: '400px', fontSize: '16px', lineHeight: '1.8' }}
          placeholder="Describe your campaign world...&#10;&#10;Example:&#10;- What is the world called?&#10;- What's the current state of the realm?&#10;- What are the major conflicts or threats?&#10;- What makes this setting unique?"
        />
      </Card>
    </div>

      {/* AI Assistant Panel */}
      <div className="ai-assistant-panel" style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '2px solid #d4af37' }}>
          <div style={{ padding: '20px' }}>
            <h3 className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} />
              AI Assistant
            </h3>
            <p style={{ fontSize: '13px', color: '#8b7355', marginBottom: '16px', lineHeight: '1.5' }}>
              Generate world-building ideas, setting descriptions, conflicts, and lore with AI.
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                What do you need?
              </label>
              <textarea
                data-testid="ai-setting-prompt"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="textarea"
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
                  <label className="gold-text" style={{ fontSize: '14px' }}>Result</label>
                  <Button
                    data-testid="copy-setting-result-btn"
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
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CampaignSettingTab;