import React, { useEffect, useState } from 'react';
import './LiveActiveQuests.css';
import { ArrowRight, BookOpen, Pin } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { activeQuestSummaries, hasOpenQuests } from '@/components/gm/liveActiveQuests';

/**
 * The quests in play, on Live Play's Run screen: what to do next on each,
 * how far along it is, and what it is linked to. "Run quest" opens the
 * quest runner already focused on that quest. Read-only: nothing here
 * changes a quest.
 */
export default function LiveActiveQuests({ campaignId, onOpenQuests }) {
  const [state, setState] = useState({ status: 'loading', quests: [] });

  useEffect(() => {
    if (!campaignId) return undefined;
    let cancelled = false;
    apiClient.get(`/campaigns/${campaignId}/quests`)
      .then((response) => {
        if (cancelled) return;
        const rows = Array.isArray(response.data) ? response.data : (response.data?.quests || []);
        setState({ status: 'ready', quests: rows });
      })
      .catch(() => { if (!cancelled) setState({ status: 'failed', quests: [] }); });
    return () => { cancelled = true; };
  }, [campaignId]);

  if (state.status !== 'ready') return null;
  const active = activeQuestSummaries(state.quests);
  if (!active.length && !hasOpenQuests(state.quests)) return null;

  const focus = (questId) => {
    try { localStorage.setItem(`gm.liveQuestFocus.${campaignId}`, questId); } catch { /* storage blocked */ }
    onOpenQuests?.();
  };

  return (
    <section className="rqk-live-quests" aria-labelledby="rqk-live-quests-title" data-testid="live-active-quests">
      <div className="rqk-live-quests__head">
        <p className="rqk-live-quests__eyebrow"><BookOpen size={14} aria-hidden="true" /> In play</p>
        <h3 id="rqk-live-quests-title">{active.length ? 'Active quests' : 'No quest is active'}</h3>
      </div>
      {active.length ? (
        <ul className="rqk-live-quests__list">
          {active.map((quest) => (
            <li key={quest.id} className="rqk-live-quests__item">
              <div className="rqk-live-quests__copy">
                <strong>{quest.pinned && <Pin size={13} aria-label="Pinned" />} {quest.title}</strong>
                {quest.next && <span className="rqk-live-quests__next">Next: {quest.next}</span>}
                <span className="rqk-live-quests__meta">{[quest.progress, ...quest.links].join(' · ')}</span>
              </div>
              <button type="button" className="rqk-live-quests__run" onClick={() => focus(quest.id)} data-testid={`live-run-quest-${quest.id}`}>
                Run quest <ArrowRight size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rqk-live-quests__empty">
          Mark a quest active or pin it to keep it here.{' '}
          <button type="button" className="rqk-live-quests__link" onClick={() => onOpenQuests?.()}>Open quests</button>
        </p>
      )}
    </section>
  );
}
