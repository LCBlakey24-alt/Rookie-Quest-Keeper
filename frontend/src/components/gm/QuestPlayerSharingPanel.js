import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import './QuestPlayerSharingPanel.css';

export default function QuestPlayerSharingPanel({ campaignId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  const sharedCount = useMemo(
    () => quests.filter(quest => quest.shared_with_players).length,
    [quests],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/campaigns/${campaignId}/quests`);
      setQuests(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not load quest sharing');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSharing = async quest => {
    const next = !quest.shared_with_players;
    setSavingId(quest.id);
    try {
      const response = await apiClient.put(`/campaigns/${campaignId}/quests/${quest.id}`, {
        shared_with_players: next,
      });
      setQuests(previous => previous.map(item => item.id === quest.id ? response.data : item));
      toast.success(next ? 'Quest shared with players' : 'Quest hidden from players');
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not update quest sharing');
    } finally {
      setSavingId('');
    }
  };

  return (
    <section className="rqk-quest-sharing" aria-label="Quest player sharing">
      <div className="rqk-quest-sharing__heading">
        <div>
          <span>Player visibility</span>
          <strong><Users size={16} aria-hidden="true" /> Shared quests</strong>
          <p>Only quests switched on here appear on the player campaign page. GM notes and linked prep never leave the GM view.</p>
        </div>
        <div className="rqk-quest-sharing__heading-actions">
          <b>{sharedCount}/{quests.length} shared</b>
          <button type="button" onClick={load} disabled={loading} className="rqk-quest-sharing__refresh">
            <RefreshCw size={14} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh list'}
          </button>
        </div>
      </div>

      {loading && quests.length === 0 ? <p className="rqk-quest-sharing__empty">Loading sharing controls…</p>
        : quests.length === 0 ? <p className="rqk-quest-sharing__empty">Create a quest first, then choose whether players can see it.</p>
          : <div className="rqk-quest-sharing__list">
            {quests.map(quest => (
              <button
                key={quest.id}
                type="button"
                className={quest.shared_with_players ? 'rqk-quest-sharing__row is-shared' : 'rqk-quest-sharing__row'}
                onClick={() => toggleSharing(quest)}
                disabled={savingId === quest.id}
                aria-pressed={Boolean(quest.shared_with_players)}
              >
                <span className="rqk-quest-sharing__icon" aria-hidden="true">
                  {quest.shared_with_players ? <Eye size={16} /> : <EyeOff size={16} />}
                </span>
                <span className="rqk-quest-sharing__copy">
                  <strong>{quest.title || 'Untitled quest'}</strong>
                  <small>{quest.shared_with_players ? 'Visible to players' : 'GM only'}</small>
                </span>
                <span className="rqk-quest-sharing__action">{savingId === quest.id ? 'Saving…' : quest.shared_with_players ? 'Hide' : 'Share'}</span>
              </button>
            ))}
          </div>}
    </section>
  );
}
