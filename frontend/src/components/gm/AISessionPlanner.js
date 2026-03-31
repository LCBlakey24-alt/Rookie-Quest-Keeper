import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Sparkles, FileText, BookOpen, Loader, ChevronDown, ChevronUp, Clock, Wand2, Theater, ScrollText } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AISessionPlanner = ({ theme, campaignId }) => {
  const [mode, setMode] = useState('outline');
  const [generating, setGenerating] = useState(false);

  // Outline state
  const [focus, setFocus] = useState('balanced');
  const [tone, setTone] = useState('classic fantasy');
  const [gmNotes, setGmNotes] = useState('');
  const [outlines, setOutlines] = useState([]);

  // Replay state
  const [style, setStyle] = useState('narrative');
  const [sessionNumber, setSessionNumber] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [replays, setReplays] = useState([]);

  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchOutlines();
    fetchReplays();
  }, [campaignId]);

  const fetchOutlines = async () => {
    try {
      const res = await axios.get(`${API}/ai/session-outlines/${campaignId}`);
      setOutlines(res.data.outlines || []);
    } catch { /* silent */ }
  };

  const fetchReplays = async () => {
    try {
      const res = await axios.get(`${API}/ai/session-replays/${campaignId}`);
      setReplays(res.data.replays || []);
    } catch { /* silent */ }
  };

  const generateOutline = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai/session-outline/${campaignId}`, {
        focus, tone, gm_notes: gmNotes
      });
      setOutlines(prev => [res.data, ...prev]);
      setExpandedId(res.data.id);
      toast.success('Session outline generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate outline');
    } finally {
      setGenerating(false);
    }
  };

  const generateReplay = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai/session-replay/${campaignId}`, {
        style, session_number: sessionNumber, extra_context: extraContext
      });
      setReplays(prev => [res.data, ...prev]);
      setExpandedId(res.data.id);
      toast.success('Session replay generated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate replay');
    } finally {
      setGenerating(false);
    }
  };

  const selectStyle = { background: theme.bg.elevated, border: `1px solid ${theme.border}`, color: theme.text.primary, borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer', width: '100%' };
  const inputStyle = { ...selectStyle, resize: 'vertical', fontFamily: 'inherit' };
  const items = mode === 'outline' ? outlines : replays;

  return (
    <div data-testid="ai-session-planner" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[
          { id: 'outline', icon: FileText, label: 'Session Outline' },
          { id: 'replay', icon: ScrollText, label: 'Session Replay' }
        ].map(m => (
          <button
            key={m.id}
            data-testid={`planner-mode-${m.id}`}
            onClick={() => setMode(m.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: mode === m.id ? theme.accent.primary : theme.bg.elevated,
              color: mode === m.id ? '#fff' : theme.text.secondary,
              border: `1px solid ${mode === m.id ? theme.accent.primary : theme.border}`,
              transition: 'all 0.2s',
            }}
          >
            <m.icon size={15} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Config Panel */}
      <div style={{ background: theme.bg.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'outline' ? (
          <>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px', display: 'block' }}>FOCUS</label>
                <select data-testid="outline-focus" value={focus} onChange={e => setFocus(e.target.value)} style={selectStyle}>
                  <option value="balanced">Balanced</option>
                  <option value="combat-heavy">Combat Heavy</option>
                  <option value="roleplay-heavy">Roleplay Heavy</option>
                  <option value="exploration">Exploration</option>
                  <option value="mystery">Mystery / Investigation</option>
                  <option value="political">Political Intrigue</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px', display: 'block' }}>TONE</label>
                <select data-testid="outline-tone" value={tone} onChange={e => setTone(e.target.value)} style={selectStyle}>
                  <option value="classic fantasy">Classic Fantasy</option>
                  <option value="dark and gritty">Dark & Gritty</option>
                  <option value="lighthearted">Lighthearted</option>
                  <option value="horror">Horror</option>
                  <option value="epic heroic">Epic / Heroic</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px', display: 'block' }}>GM NOTES (optional)</label>
              <textarea
                data-testid="outline-gm-notes"
                value={gmNotes} onChange={e => setGmNotes(e.target.value)}
                placeholder="E.g., Party needs to reach the ruins by session end, introduce the BBEG's lieutenant..."
                rows={3} style={inputStyle}
              />
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px', display: 'block' }}>STYLE</label>
                <select data-testid="replay-style" value={style} onChange={e => setStyle(e.target.value)} style={selectStyle}>
                  <option value="narrative">Epic Narrative</option>
                  <option value="chronicle">Historical Chronicle</option>
                  <option value="comedic">Comedic Retelling</option>
                  <option value="dark">Dark Fantasy</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px', display: 'block' }}>SESSION #</label>
                <input
                  data-testid="replay-session-number"
                  type="text" value={sessionNumber} onChange={e => setSessionNumber(e.target.value)}
                  placeholder="e.g. 12" style={selectStyle}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: theme.text.muted, marginBottom: '4px', display: 'block' }}>EXTRA CONTEXT (optional)</label>
              <textarea
                data-testid="replay-extra-context"
                value={extraContext} onChange={e => setExtraContext(e.target.value)}
                placeholder="Key moments to highlight, funny quotes, epic dice rolls..."
                rows={3} style={inputStyle}
              />
            </div>
          </>
        )}

        <button
          data-testid="generate-ai-btn"
          onClick={mode === 'outline' ? generateOutline : generateReplay}
          disabled={generating}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px', borderRadius: '10px', cursor: generating ? 'wait' : 'pointer',
            background: generating ? theme.bg.elevated : `linear-gradient(135deg, ${theme.accent.secondary}, ${theme.accent.primary})`,
            color: '#fff', border: 'none', fontSize: '14px', fontWeight: 700,
            opacity: generating ? 0.7 : 1, transition: 'all 0.2s',
          }}
        >
          {generating ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
          {generating ? 'Generating...' : mode === 'outline' ? 'Generate Session Outline' : 'Generate Session Replay'}
        </button>
      </div>

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: theme.text.muted, fontSize: '13px' }}>
            {mode === 'outline'
              ? 'No session outlines yet. Generate your first one above!'
              : 'No session replays yet. Generate your first one above!'}
          </div>
        )}
        {items.map(item => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              data-testid={`planner-item-${item.id}`}
              style={{
                background: theme.bg.surface, border: `1px solid ${isExpanded ? theme.accent.primary : theme.border}`,
                borderRadius: '10px', overflow: 'hidden', transition: 'border-color 0.2s',
              }}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: theme.text.primary,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {mode === 'outline' ? <FileText size={14} color={theme.accent.primary} /> : <ScrollText size={14} color={theme.accent.primary} />}
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {mode === 'outline' ? `Outline — ${item.focus || 'Balanced'}` : `Replay${item.session_number ? ` #${item.session_number}` : ''} — ${item.style || 'Narrative'}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: theme.text.muted }}>
                    <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                    {new Date(item.generated_at).toLocaleDateString()}
                  </span>
                  {isExpanded ? <ChevronUp size={14} color={theme.text.muted} /> : <ChevronDown size={14} color={theme.text.muted} />}
                </div>
              </button>
              {isExpanded && (
                <div style={{
                  padding: '0 16px 16px', fontSize: '13px', color: theme.text.secondary,
                  lineHeight: 1.7, whiteSpace: 'pre-wrap', borderTop: `1px solid ${theme.border}`,
                  maxHeight: '500px', overflowY: 'auto',
                }}>
                  <div style={{ paddingTop: '12px' }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content || '') }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

function renderMarkdown(text) {
  return text
    .replace(/### (.*)/g, '<h4 style="color:#F8F8FF;margin:12px 0 6px;font-size:14px">$1</h4>')
    .replace(/## (.*)/g, '<h3 style="color:#F8F8FF;margin:16px 0 8px;font-size:15px;font-weight:700">$1</h3>')
    .replace(/# (.*)/g, '<h2 style="color:#F8F8FF;margin:20px 0 10px;font-size:17px;font-weight:800">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#F8F8FF">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
    .replace(/\n/g, '<br/>');
}

export default AISessionPlanner;
