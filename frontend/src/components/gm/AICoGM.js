import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import { Sparkles, Send, X, Loader, Minimize2, Maximize2, Copy, Trash2 } from 'lucide-react';

const TAB_CONTEXTS = {
  combat: {
    label: 'Combat Advisor',
    color: '#D4A017',
    hints: ['Suggest tactical moves', 'Generate an encounter', 'What should the enemies do?', 'Describe this attack cinematically'],
    system: 'You are a combat advisor for a D&D 5e game. Help the GM run exciting combat encounters. Suggest enemy tactics, describe dramatic attack sequences, calculate damage, and keep combat flowing. Be concise and action-oriented.'
  },
  location: {
    label: 'Location Guide',
    color: '#D4A017',
    hints: ['Describe this area', 'What do the players see?', 'Generate ambient details', 'What random event happens here?'],
    system: 'You are a vivid world narrator for a D&D 5e game. Describe locations with rich sensory detail - sights, sounds, smells. Generate atmospheric descriptions, random events, and environmental storytelling. Paint pictures with words.'
  },
  npcs: {
    label: 'NPC Voice',
    color: '#D4A017',
    hints: ['Generate NPC dialogue', 'How would this NPC react?', 'Give me a voice for this character', 'What secret is this NPC hiding?'],
    system: 'You are an NPC dialogue specialist for a D&D 5e game. Generate distinctive voices, mannerisms, and dialogue for NPCs. Each NPC should feel unique with personality quirks, speech patterns, and hidden motivations.'
  },
  network: {
    label: 'Intrigue Weaver',
    color: '#D4A017',
    hints: ['Suggest a political plot', 'How are these NPCs connected?', 'Generate a betrayal twist', 'What faction conflict is brewing?'],
    system: 'You are a political intrigue specialist for a D&D 5e game. Weave complex webs of NPC relationships, faction politics, betrayals, and power struggles. Create compelling drama between characters.'
  },
  monsters: {
    label: 'Bestiary Expert',
    color: '#D4A017',
    hints: ['How should I run this monster?', 'Describe its lair', 'What are its weaknesses?', 'Generate a unique variant'],
    system: 'You are a monster tactics expert for D&D 5e using only SRD/OGL content. Advise on how monsters fight, their lair actions, legendary actions, and weaknesses. Make each creature feel dangerous and unique.'
  },
  story: {
    label: 'Story Architect',
    color: '#D4A017',
    hints: ['What happens next in this arc?', 'Generate a plot twist', 'How do I raise the stakes?', 'Suggest a story milestone'],
    system: 'You are a narrative architect for a D&D 5e campaign. Help develop story arcs, plot twists, rising tension, and satisfying payoffs. Create compelling narrative beats that make players feel like heroes.'
  },
  tables: {
    label: 'Random Oracle',
    color: '#D4A017',
    hints: ['Roll a random encounter', 'Generate a random event', 'What treasure do they find?', 'Random NPC motivation'],
    system: 'You are a random encounter and table generator for D&D 5e. Generate creative random encounters, events, treasure hauls, and surprising twists. Make the unexpected feel natural and exciting.'
  },
  loot: {
    label: 'Treasure Master',
    color: '#D4A017',
    hints: ['Generate level-appropriate loot', 'Describe a magic item', 'What is in this treasure chest?', 'Create a cursed item'],
    system: 'You are a treasure and magic item specialist for D&D 5e using SRD content only. Generate appropriate loot for the party level, describe magic items vividly, and create interesting item effects and curses.'
  },
  notes: {
    label: 'Session Scribe',
    color: '#D4A017',
    hints: ['Summarize tonight\'s session', 'What were the key moments?', 'Generate a session recap', 'What loose threads remain?'],
    system: 'You are a session note-taker and summarizer for D&D 5e. Help organize session notes, create narrative recaps, identify key plot threads, and track important decisions the party has made.'
  }
};

const DEFAULT_CONTEXT = {
  label: 'ROOK AI',
  color: '#D4A017',
  hints: ['Help me plan tonight\'s session', 'Generate an adventure hook', 'What should happen next?', 'Surprise me with something cool'],
  system: 'You are ROOK, an AI co-GM assistant for a D&D 5e tabletop RPG game. Help the Game Master with encounter ideas, NPC dialogue, world building, and story development. Use only SRD/OGL content. Be creative, concise, and dramatic.'
};

export default function AICoGM({ theme, campaignId, activeTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const ctx = TAB_CONTEXTS[activeTab] || DEFAULT_CONTEXT;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await apiClient.post('/rook/chat', {
        message: msg,
        campaign_id: campaignId,
        context: `Active Live Play tab: ${activeTab}. ${ctx.system}`
      });

      const aiMsg = { role: 'assistant', content: response.data.response || response.data.message || 'No response', timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errMsg = error.response?.data?.detail || 'AI unavailable';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errMsg}`, timestamp: Date.now(), isError: true }]);
    } finally { setLoading(false); }
  };

  const clearChat = () => { setMessages([]); toast.info('Chat cleared'); };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  if (!isOpen) {
    return (
      <button data-testid="ai-cogm-toggle" onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px',
          borderRadius: '50%', background: 'linear-gradient(135deg, #D4A017, #F5C542)',
          border: '2px solid rgba(212,160,23,0.5)', cursor: 'pointer', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(212,160,23,0.25)', transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Sparkles size={24} color="#0A1628" />
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div onClick={() => setIsMinimized(false)} style={{
        position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px',
        background: theme.bg.panel, border: `1px solid ${ctx.color}`, borderRadius: '12px',
        cursor: 'pointer', zIndex: 2000, display: 'flex', alignItems: 'center', gap: '10px',
        boxShadow: `0 4px 20px ${ctx.color}30`
      }}>
        <Sparkles size={18} color={ctx.color} />
        <span style={{ color: theme.text.primary, fontSize: '13px', fontWeight: '600' }}>{ctx.label}</span>
        {messages.length > 0 && <span style={{ background: ctx.color, color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>{messages.length}</span>}
      </div>
    );
  }

  return (
    <div data-testid="ai-cogm-panel" style={{
      position: 'fixed', bottom: '24px', right: '24px', width: '400px', height: '520px',
      background: theme.bg.panel, border: `1px solid ${ctx.color}40`, borderRadius: '16px',
      zIndex: 2000, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 30px ${ctx.color}20`,
      backdropFilter: 'blur(20px)'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${theme.border}`, background: `${ctx.color}10`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} color={ctx.color} />
          <div>
            <div style={{ color: theme.text.primary, fontSize: '14px', fontWeight: '600' }}>{ctx.label}</div>
            <div style={{ color: theme.text.muted, fontSize: '11px' }}>Context: {activeTab}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={clearChat} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
          <button onClick={() => setIsMinimized(true)} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', padding: '4px' }}><Minimize2 size={14} /></button>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer', padding: '4px' }}><X size={16} /></button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <Sparkles size={32} color={ctx.color} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <p style={{ color: theme.text.secondary, fontSize: '13px', marginBottom: '16px' }}>
              I'm your AI co-GM, adapted to your current tab. Ask me anything!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ctx.hints.map((hint, i) => (
                <button key={i} onClick={() => sendMessage(hint)}
                  data-testid={`ai-hint-${i}`}
                  style={{
                    padding: '8px 12px', background: `${ctx.color}10`, border: `1px solid ${ctx.color}30`,
                    borderRadius: '8px', color: theme.text.secondary, cursor: 'pointer', fontSize: '12px',
                    textAlign: 'left', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${ctx.color}20`; e.currentTarget.style.borderColor = ctx.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${ctx.color}10`; e.currentTarget.style.borderColor = `${ctx.color}30`; }}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: '10px',
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: '12px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #D4A017, #D4A017)'
                : msg.isError ? 'rgba(239,68,68,0.15)' : theme.bg.elevated,
              border: msg.role === 'user' ? 'none' : `1px solid ${msg.isError ? '#EF4444' : theme.border}`,
              color: theme.text.primary, fontSize: '13px', lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && !msg.isError && (
              <button onClick={() => copyMessage(msg.content)} style={{
                background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer',
                padding: '4px', marginTop: '2px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Copy size={10} /> Copy
              </button>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', color: ctx.color }}>
            <Loader size={14} className="animate-spin" />
            <span style={{ fontSize: '12px' }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px', borderTop: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={`Ask ${ctx.label}...`}
            data-testid="ai-cogm-input"
            style={{
              flex: 1, padding: '10px 14px', background: theme.bg.elevated,
              border: `1px solid ${theme.border}`, borderRadius: '10px',
              color: theme.text.primary, fontSize: '13px'
            }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            data-testid="ai-cogm-send"
            style={{
              padding: '10px 14px', background: input.trim() ? `linear-gradient(135deg, #D4A017, ${ctx.color})` : theme.bg.elevated,
              border: 'none', borderRadius: '10px', cursor: input.trim() ? 'pointer' : 'default',
              color: '#fff', display: 'flex', alignItems: 'center'
            }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
