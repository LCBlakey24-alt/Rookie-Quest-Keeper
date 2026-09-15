import React, { useEffect, useMemo, useState } from 'react';
import { Check, Circle, Flag, Pin, RefreshCw, SkipForward } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './PlayerQuestsPanel.css';

function nice(value = '') {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function progressFor(quest) {
  const objectives = Array.isArray(quest?.objectives) ? quest.objectives : [];
  const resolved = objectives.filter(item => item.status === 'completed' || item.status === 'skipped').length;
  return { objectives, resolved, total: objectives.length };
}

export default function PlayerQuestsPanel({ campaignId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/player/campaign/${campaignId}/quests`);
      setQuests(Array.isArray(response.data) ? response.data : []);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Could not load shared quests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [campaignId]);

  const groups = useMemo(() => {
    const open = quests.filter(quest => !['completed', 'failed'].includes(quest.status));
    const resolved = quests.filter(quest => ['completed', 'failed'].includes(quest.status));
    return { open, resolved };
  }, [quests]);

  if (loading && quests.length === 0) {
    return <section className="player-quests-panel"><p className="player-quests-empty">Loading shared quests…</p></section>;
  }

  return (
    <section className="player-quests-panel" aria-label="Shared campaign quests">
      <header className="player-quests-header">
        <div>
          <span>Campaign objectives</span>
          <h2>Quests</h2>
          <p>These are the objectives your GM has chosen to share with the party.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="player-quests-refresh">
          <RefreshCw size={15} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && <div role="status" className="player-quests-warning">{error} Previously loaded quests remain visible where available.</div>}

      {quests.length === 0 && !error ? <div className="player-quests-empty">
        <Flag size={22} aria-hidden="true" />
        <strong>No quests have been shared yet.</strong>
        <span>When your GM reveals an objective, it will appear here.</span>
      </div> : null}

      {groups.open.length > 0 && <QuestGroup title="Current quests" quests={groups.open} />}
      {groups.resolved.length > 0 && <QuestGroup title="Resolved quests" quests={groups.resolved} />}
    </section>
  );
}

function QuestGroup({ title, quests }) {
  return (
    <section className="player-quests-group">
      <h3>{title}</h3>
      <div className="player-quests-list">
        {quests.map(quest => <QuestCard key={quest.id} quest={quest} />)}
      </div>
    </section>
  );
}

function QuestCard({ quest }) {
  const { objectives, resolved, total } = progressFor(quest);
  return (
    <article className="player-quest-card">
      <div className="player-quest-card__top">
        <div>
          <div className="player-quest-card__title-row">
            <h4>{quest.title || 'Untitled quest'}</h4>
            {quest.is_pinned && <Pin size={14} aria-label="Pinned quest" />}
          </div>
          <span className={`player-quest-status is-${quest.status || 'available'}`}>{nice(quest.status || 'available')}</span>
        </div>
        {total > 0 && <strong>{resolved}/{total}</strong>}
      </div>

      {quest.summary && <p className="player-quest-summary">{quest.summary}</p>}
      {quest.hook && <p className="player-quest-hook">{quest.hook}</p>}

      {objectives.length > 0 && <div className="player-quest-objectives" aria-label={`${quest.title} objectives`}>
        {objectives.map(objective => (
          <div key={objective.id || objective.title} className={`player-quest-objective is-${objective.status || 'upcoming'}`}>
            <span className="player-quest-objective__icon" aria-hidden="true">
              {objective.status === 'completed' ? <Check size={14} /> : objective.status === 'skipped' ? <SkipForward size={14} /> : <Circle size={14} />}
            </span>
            <span>{objective.title || 'Untitled objective'}</span>
            {objective.optional && <small>Optional</small>}
          </div>
        ))}
      </div>}
    </article>
  );
}
