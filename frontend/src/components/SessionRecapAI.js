import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, FileText, Clock, Users, Swords, MapPin, 
  RefreshCw, Copy, Download, ChevronDown, ChevronUp
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
  border: 'rgba(212, 175, 55, 0.15)'
};

/**
 * AI-powered Session Recap Generator
 * Takes session notes and generates a formatted summary
 */
function SessionRecapAI({ campaignId, sessionNotes = '', onSaveRecap }) {
  const [notes, setNotes] = useState(sessionNotes);
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recapStyle, setRecapStyle] = useState('narrative'); // 'narrative', 'bullet', 'detailed'
  const [includeSections, setIncludeSections] = useState({
    summary: true,
    keyEvents: true,
    npcsEncountered: true,
    locationsVisited: true,
    combatHighlights: true,
    lootObtained: true,
    questProgress: true,
    nextSessionHooks: true
  });

  const generateRecap = async () => {
    if (!notes.trim()) {
      toast.error('Please enter session notes first');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/session-recap`, {
        campaign_id: campaignId,
        notes: notes,
        style: recapStyle,
        sections: Object.entries(includeSections)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => key)
      });

      setRecap(response.data);
      toast.success('Session recap generated!');
    } catch (error) {
      // Fallback to local generation if API fails
      const fallbackRecap = generateLocalRecap(notes, recapStyle, includeSections);
      setRecap(fallbackRecap);
      toast.success('Session recap generated (offline mode)');
    } finally {
      setLoading(false);
    }
  };

  // Local recap generation as fallback
  const generateLocalRecap = (rawNotes, style, sections) => {
    const lines = rawNotes.split('\n').filter(l => l.trim());
    const now = new Date();
    
    // Extract potential key elements from notes
    const npcs = lines.filter(l => l.toLowerCase().includes('npc') || l.includes('met') || l.includes('spoke'));
    const locations = lines.filter(l => l.toLowerCase().includes('travel') || l.includes('arrived') || l.includes('location'));
    const combat = lines.filter(l => l.toLowerCase().includes('fight') || l.includes('attack') || l.includes('combat') || l.includes('battle'));
    const loot = lines.filter(l => l.toLowerCase().includes('loot') || l.includes('gold') || l.includes('item') || l.includes('found'));
    
    let content = '';
    
    if (style === 'narrative') {
      content = `# Session Recap\n\n`;
      content += `*Generated on ${now.toLocaleDateString()}*\n\n`;
      content += `## Summary\n${lines.slice(0, 3).join(' ') || 'The party continued their adventure...'}\n\n`;
      
      if (sections.keyEvents && lines.length > 3) {
        content += `## Key Events\n`;
        lines.slice(0, 5).forEach(line => {
          content += `- ${line}\n`;
        });
        content += '\n';
      }
      
      if (sections.npcsEncountered && npcs.length > 0) {
        content += `## NPCs Encountered\n`;
        npcs.forEach(npc => content += `- ${npc}\n`);
        content += '\n';
      }
      
      if (sections.combatHighlights && combat.length > 0) {
        content += `## Combat Highlights\n`;
        combat.forEach(c => content += `- ${c}\n`);
        content += '\n';
      }
      
      if (sections.lootObtained && loot.length > 0) {
        content += `## Loot Obtained\n`;
        loot.forEach(l => content += `- ${l}\n`);
        content += '\n';
      }
      
      if (sections.nextSessionHooks) {
        content += `## Next Session Hooks\n`;
        content += `- Continue from current situation\n`;
        content += `- Follow up on unresolved threads\n`;
      }
    } else if (style === 'bullet') {
      content = `**Session Recap - ${now.toLocaleDateString()}**\n\n`;
      lines.forEach(line => {
        content += `• ${line}\n`;
      });
    } else {
      content = `# Detailed Session Log\n\n`;
      content += `**Date:** ${now.toLocaleDateString()}\n`;
      content += `**Duration:** ~4 hours\n\n`;
      content += `---\n\n`;
      content += `## Full Notes\n\n`;
      content += rawNotes;
    }
    
    return {
      content,
      generated_at: now.toISOString(),
      style,
      word_count: content.split(' ').length
    };
  };

  const copyToClipboard = () => {
    if (recap?.content) {
      navigator.clipboard.writeText(recap.content);
      toast.success('Recap copied to clipboard!');
    }
  };

  const saveRecap = () => {
    if (recap && onSaveRecap) {
      onSaveRecap(recap);
      toast.success('Recap saved!');
    }
  };

  return (
    <div style={{
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '20px' 
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: theme.subtle,
          border: `1px solid ${theme.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Sparkles size={20} color={theme.primary} />
        </div>
        <div>
          <h3 style={{ 
            color: theme.primary, 
            fontSize: '18px', 
            fontWeight: '400',
            margin: 0,
            fontFamily: "Inter, sans-serif"
          }}>
            AI SESSION RECAP
          </h3>
          <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
            Generate a summary from your session notes
          </p>
        </div>
      </div>

      {/* Notes Input */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          color: theme.textSecondary, 
          fontSize: '12px', 
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Session Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Paste or type your session notes here...&#10;&#10;Example:&#10;- Party arrived at the Rusty Anchor tavern&#10;- Met mysterious stranger named Vex&#10;- Fight broke out with local thugs&#10;- Found map to ancient ruins"
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '16px',
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            color: theme.text,
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Style Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          color: theme.textSecondary, 
          fontSize: '12px', 
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Recap Style
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'narrative', label: 'Narrative', icon: FileText },
            { id: 'bullet', label: 'Bullet Points', icon: FileText },
            { id: 'detailed', label: 'Detailed Log', icon: FileText }
          ].map(style => (
            <button
              key={style.id}
              onClick={() => setRecapStyle(style.id)}
              style={{
                flex: 1,
                padding: '12px',
                background: recapStyle === style.id ? theme.subtle : theme.bg,
                border: `1px solid ${recapStyle === style.id ? theme.primary : theme.border}`,
                color: recapStyle === style.id ? theme.primary : theme.textSecondary,
                fontSize: '13px',
                fontWeight: '400',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <style.icon size={14} />
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          color: theme.muted,
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '16px',
          padding: 0
        }}
      >
        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        Advanced Options
      </button>

      {showAdvanced && (
        <div style={{
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          padding: '16px',
          marginBottom: '20px'
        }}>
          <p style={{ color: theme.muted, fontSize: '12px', marginBottom: '12px' }}>
            Include sections:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {[
              { key: 'summary', label: 'Summary', icon: FileText },
              { key: 'keyEvents', label: 'Key Events', icon: Clock },
              { key: 'npcsEncountered', label: 'NPCs', icon: Users },
              { key: 'locationsVisited', label: 'Locations', icon: MapPin },
              { key: 'combatHighlights', label: 'Combat', icon: Swords },
              { key: 'lootObtained', label: 'Loot', icon: Sparkles },
              { key: 'questProgress', label: 'Quest Progress', icon: FileText },
              { key: 'nextSessionHooks', label: 'Next Hooks', icon: RefreshCw }
            ].map(section => (
              <label
                key={section.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  background: includeSections[section.key] ? theme.subtle : 'transparent',
                  border: `1px solid ${includeSections[section.key] ? theme.primary : theme.border}`,
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: includeSections[section.key] ? theme.primary : theme.textSecondary
                }}
              >
                <input
                  type="checkbox"
                  checked={includeSections[section.key]}
                  onChange={(e) => setIncludeSections({
                    ...includeSections,
                    [section.key]: e.target.checked
                  })}
                  style={{ display: 'none' }}
                />
                <section.icon size={12} />
                {section.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={generateRecap}
        disabled={loading || !notes.trim()}
        style={{
          width: '100%',
          padding: '14px',
          background: loading ? theme.muted : theme.primary,
          border: 'none',
          color: '#fff',
          fontWeight: '400',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: loading ? 'none' : theme.glow
        }}
      >
        {loading ? (
          <>
            <RefreshCw size={18} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Generate Recap
          </>
        )}
      </Button>

      {/* Generated Recap */}
      {recap && (
        <div style={{ marginTop: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h4 style={{ color: theme.text, fontSize: '14px', fontWeight: '400', margin: 0 }}>
              Generated Recap
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                onClick={copyToClipboard}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.textSecondary,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Copy size={14} />
                Copy
              </Button>
              {onSaveRecap && (
                <Button
                  onClick={saveRecap}
                  style={{
                    padding: '8px 12px',
                    background: theme.subtle,
                    border: `1px solid ${theme.primary}`,
                    color: theme.primary,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} />
                  Save
                </Button>
              )}
            </div>
          </div>
          
          <div style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            padding: '20px',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            <pre style={{
              color: theme.text,
              fontSize: '13px',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              margin: 0
            }}>
              {recap.content}
            </pre>
          </div>
          
          <p style={{ 
            color: theme.muted, 
            fontSize: '11px', 
            marginTop: '8px',
            textAlign: 'right'
          }}>
            {recap.word_count} words • Generated {new Date(recap.generated_at).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default SessionRecapAI;
