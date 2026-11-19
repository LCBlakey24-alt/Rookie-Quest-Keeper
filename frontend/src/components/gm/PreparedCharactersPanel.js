import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';
import './PreparedCharactersPanel.css';

const summary = (character) => [character.race, character.character_class, character.level ? `level ${character.level}` : '']
  .filter(Boolean).join(' · ');

/**
 * Characters the GM makes ready for players: build them with Create
 * Character, offer them here, and a player who joins with the code can
 * claim one onto their own account.
 */
export default function PreparedCharactersPanel({ campaignId }) {
  const [offered, setOffered] = useState([]);
  const [available, setAvailable] = useState([]);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId) return;
    const [offeredResult, ownResult] = await Promise.allSettled([
      apiClient.get(`/campaigns/${campaignId}/prepared-characters`),
      apiClient.get('/characters'),
    ]);
    if (offeredResult.status === 'fulfilled') setOffered(offeredResult.value?.data?.characters || []);
    if (ownResult.status === 'fulfilled') {
      const own = Array.isArray(ownResult.value?.data) ? ownResult.value.data : [];
      // Only characters that are free: not playing anywhere, not already offered.
      setAvailable(own.filter((character) => !character.campaign_id && !character.prepared_for_campaign_id));
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const offer = async () => {
    if (!pick || busy) return;
    setBusy(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/prepared-characters`, { character_id: pick });
      setOffered(response.data?.characters || []);
      setAvailable((prev) => prev.filter((character) => character.id !== pick));
      setPick('');
      toast.success('Character ready for a player', { description: 'Players who join with your code can claim it.' });
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not offer that character');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (character) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await apiClient.delete(`/campaigns/${campaignId}/prepared-characters/${character.id}`);
      setOffered(response.data?.characters || []);
      load();
      toast.success(`${character.name} is no longer on offer`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not withdraw that character');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rq-prepared" data-testid="prepared-characters-panel" aria-labelledby="rq-prepared-title">
      <h4 id="rq-prepared-title"><Sparkles size={14} aria-hidden="true" /> Characters ready for players</h4>
      <p className="rq-prepared__help">Make characters for your table. Players who join with your code pick one, and it moves onto their account.</p>
      {offered.length > 0 ? (
        <ul className="rq-prepared__list">
          {offered.map((character) => (
            <li key={character.id}>
              <span><strong>{character.name}</strong><small>{summary(character) || 'Waiting for a player'}</small></span>
              <button type="button" onClick={() => withdraw(character)} disabled={busy} aria-label={`Stop offering ${character.name}`}>
                <X size={14} aria-hidden="true" /> Withdraw
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rq-prepared__empty">None waiting yet.</p>
      )}
      <div className="rq-prepared__add">
        {available.length > 0 && (
          <>
            <label htmlFor={`rq-prepared-pick-${campaignId}`} className="rq-prepared__sr">Character to offer</label>
            <select id={`rq-prepared-pick-${campaignId}`} value={pick} onChange={(event) => setPick(event.target.value)} data-testid="prepared-pick">
              <option value="">Choose one of your characters…</option>
              {available.map((character) => <option key={character.id} value={character.id}>{character.name || 'Unnamed character'}</option>)}
            </select>
            <button type="button" onClick={offer} disabled={!pick || busy} data-testid="prepared-offer">
              <Plus size={14} aria-hidden="true" /> Offer to players
            </button>
          </>
        )}
        <Link to="/characters/new" className="rq-prepared__create">Create a character</Link>
      </div>
    </section>
  );
}
