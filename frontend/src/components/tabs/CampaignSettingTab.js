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
          placeholder="Describe your campaign world...\n\nExample:\n- What is the world called?\n- What's the current state of the realm?\n- What are the major conflicts or threats?\n- What makes this setting unique?"
        />
      </Card>
    </div>
  );
}

export default CampaignSettingTab;