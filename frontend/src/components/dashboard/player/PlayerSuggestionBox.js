import React, { useMemo, useState } from 'react';
import { Lightbulb, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import '@/styles/playerSuggestionBox.css';

const REQUEST_TYPES = [
  { id: 'feature', label: 'New feature', category: 'feature', area: 'player-feature' },
  { id: 'class', label: 'Class / subclass / species', category: 'feature', area: 'rules-content' },
  { id: 'creator', label: 'Character creation', category: 'improvement', area: 'character-creation' },
  { id: 'sheet', label: 'Character sheet', category: 'improvement', area: 'character-sheet' },
  { id: 'campaign', label: 'Player campaign tools', category: 'feature', area: 'player-campaign' },
  { id: 'homebrew', label: 'Homebrew / content', category: 'feature', area: 'homebrew-content' },
  { id: 'bug', label: 'Something broken', category: 'bug', area: 'player-side' },
  { id: 'other', label: 'Something else', category: 'improvement', area: 'player-suggestion' },
];

export default function PlayerSuggestionBox() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState('feature');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const requestType = useMemo(
    () => REQUEST_TYPES.find((option) => option.id === type) || REQUEST_TYPES[0],
    [type],
  );

  const reset = () => {
    setType('feature');
    setTitle('');
    setMessage('');
    setOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (cleanTitle.length < 3) {
      toast.error('Add a short title for your suggestion');
      return;
    }
    if (cleanMessage.length < 10) {
      toast.error('Tell us a little more about what you would like');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post('/feedback', {
        category: requestType.category,
        area: requestType.area,
        title: cleanTitle,
        message: cleanMessage,
        page_path: window.location.pathname,
        priority: requestType.category === 'bug' ? 'normal' : 'low',
      });
      toast.success('Suggestion sent to the RQK admin queue');
      reset();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not send your suggestion');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="player-suggestion-box" aria-label="Suggest a feature or improvement">
      <div className="player-suggestion-box__intro">
        <div className="player-suggestion-box__icon"><Lightbulb size={18} aria-hidden="true" /></div>
        <div>
          <span>Help shape Rookie Quest Keeper</span>
          <strong>Got an idea for the player side?</strong>
          <p>Request a feature, class or subclass, creator improvement, campaign tool, or anything else you would genuinely use.</p>
        </div>
        <button
          type="button"
          className="player-suggestion-box__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? <><X size={15} /> Close</> : <><Lightbulb size={15} /> Suggest something</>}
        </button>
      </div>

      {open && (
        <form className="player-suggestion-box__form" onSubmit={submit}>
          <label>
            <span>What kind of suggestion is it?</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              {REQUEST_TYPES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>

          <label>
            <span>Short title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Add Circle of Stars Druid support"
              maxLength={120}
            />
          </label>

          <label>
            <span>What would you like us to add or improve?</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What should it do, where would you use it, and what would make it useful?"
              maxLength={2000}
            />
          </label>

          <div className="player-suggestion-box__actions">
            <small>This goes straight into the admin development backlog.</small>
            <button type="submit" disabled={saving}>
              <Send size={15} aria-hidden="true" /> {saving ? 'Sending…' : 'Send suggestion'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
