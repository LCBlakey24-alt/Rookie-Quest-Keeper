import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, Copy, Loader, Maximize2, Minimize2, Send, Sparkles, Wand2, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import {
  buildRookSystemContext,
  extractCampaignIdFromPath,
  getRookMicroSuggestions,
  getRookPageMeta,
  getRookStarterPrompts,
} from '@/data/rookAssistantKnowledge';
import '@/styles/rookAssistant.css';

function copyToClipboard(text) {
  if (!navigator?.clipboard || !text) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function RookGlobalAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const pathname = location.pathname;
  const pageMeta = useMemo(() => getRookPageMeta(pathname), [pathname]);
  const starters = useMemo(() => getRookStarterPrompts(pathname), [pathname]);
  const chips = useMemo(() => getRookMicroSuggestions(pathname), [pathname]);
  const campaignId = useMemo(() => extractCampaignIdFromPath(pathname), [pathname]);
  const systemContext = useMemo(() => buildRookSystemContext(pathname), [pathname]);

  useEffect(() => {
    const openRook = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('rook-assistant-open', openRook);
    return () => window.removeEventListener('rook-assistant-open', openRook);
  }, []);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(focusTimer);
  }, [isOpen, isMinimized, pathname]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setCopiedIndex(null);
  }, [pathname]);

  const sendMessage = async (forcedText) => {
    const text = (forcedText || input).trim();
    if (!text || loading) return;

    setInput('');
    setCopiedIndex(null);
    setMessages((current) => [
      ...current,
      { role: 'user', content: text, timestamp: Date.now() },
    ]);
    setLoading(true);

    try {
      const response = await apiClient.post('/rook/chat', {
        message: text,
        campaign_id: campaignId,
        context: systemContext,
      });
      const reply = response.data?.response || response.data?.message || 'Rook did not return a response.';
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: reply, timestamp: Date.now() },
      ]);
    } catch (error) {
      const detail = error?.formattedDetail || error?.response?.data?.detail || 'Rook is unavailable right now. Try again in a moment.';
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: detail, timestamp: Date.now(), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content, index) => {
    copyToClipboard(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="rook-assistant-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open Rook assistant"
        title="Ask Rook"
        data-testid="rook-global-open"
      >
        <span className="rook-assistant-fab__glow" aria-hidden="true" />
        <Sparkles size={22} aria-hidden="true" />
        <span className="rook-assistant-fab__label">Rook</span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        type="button"
        className="rook-assistant-pill"
        onClick={() => setIsMinimized(false)}
        aria-label="Restore Rook assistant"
        data-testid="rook-global-restore"
      >
        <Sparkles size={16} aria-hidden="true" />
        <span>{pageMeta.label}</span>
        {messages.length > 0 && <strong>{messages.length}</strong>}
      </button>
    );
  }

  return (
    <aside className="rook-assistant-panel" aria-label="Rook AI assistant" data-testid="rook-global-panel">
      <header className="rook-assistant-header">
        <div className="rook-assistant-orb" aria-hidden="true">
          <Sparkles size={18} />
        </div>
        <div className="rook-assistant-title">
          <span>ROOK</span>
          <strong>{pageMeta.label}</strong>
          <small>{pageMeta.subtitle}</small>
        </div>
        <div className="rook-assistant-actions">
          <button type="button" onClick={() => setIsMinimized(true)} aria-label="Minimise Rook">
            <Minimize2 size={15} />
          </button>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Close Rook">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="rook-assistant-chip-row" aria-label="Rook can help with">
        {chips.map((chip) => (
          <button key={chip} type="button" onClick={() => sendMessage(chip)} disabled={loading}>
            {chip}
          </button>
        ))}
      </div>

      <main className="rook-assistant-messages">
        {messages.length === 0 && (
          <section className="rook-assistant-empty">
            <div className="rook-assistant-empty__icon"><Wand2 size={24} /></div>
            <h3>Ask Rook anything here.</h3>
            <p>Rook now carries a site-wide brain: player help, GM prep, homebrew checks, name banks, quest hooks, and page-aware guidance.</p>
            <div className="rook-assistant-starters">
              {starters.map((starter) => (
                <button key={starter} type="button" onClick={() => sendMessage(starter)} disabled={loading}>
                  <BookOpen size={13} />
                  {starter}
                </button>
              ))}
            </div>
          </section>
        )}

        {messages.map((message, index) => (
          <article key={`${message.timestamp}-${index}`} className={`rook-assistant-message is-${message.role}${message.isError ? ' is-error' : ''}`}>
            <div className="rook-assistant-message__bubble">
              {message.content}
            </div>
            {message.role === 'assistant' && !message.isError && (
              <button type="button" className="rook-assistant-copy" onClick={() => handleCopy(message.content, index)}>
                <Copy size={11} />
                {copiedIndex === index ? 'Copied' : 'Copy'}
              </button>
            )}
          </article>
        ))}

        {loading && (
          <div className="rook-assistant-thinking">
            <Loader size={15} className="animate-spin" />
            <span>Rook is thinking…</span>
          </div>
        )}
        <div ref={scrollRef} />
      </main>

      <footer className="rook-assistant-compose">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder={`Ask ${pageMeta.label}…`}
          rows={2}
          data-testid="rook-global-input"
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Send message to Rook"
          data-testid="rook-global-send"
        >
          {loading ? <Maximize2 size={16} /> : <Send size={16} />}
        </button>
      </footer>
    </aside>
  );
}
