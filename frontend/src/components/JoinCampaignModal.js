import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Check, Link2, Loader, Sparkles } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './JoinCampaignModal.css';

const describe = (character) => [character.race, character.character_class, character.level ? `level ${character.level}` : '']
  .filter(Boolean).join(' · ');

/**
 * Join a campaign with a GM's code, in two steps:
 *   1. the code;
 *   2. who to play: a character the GM has already made for the table
 *      (claiming it moves it onto your account), or one of your own.
 * A player with no characters yet can still join by claiming one.
 */
function JoinCampaignModal({ characterId, characterName, characters, open, onOpenChange, onSuccess }) {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [choice, setChoice] = useState('');
  const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const ownCharacters = useMemo(() => {
    const list = Array.isArray(characters) ? characters : [];
    if (list.length) return list.map((item) => ({ id: item.id, name: item.name || item.character_name || 'Adventurer' }));
    return characterId ? [{ id: characterId, name: characterName || 'Your character' }] : [];
  }, [characters, characterId, characterName]);

  useEffect(() => {
    if (!open) { setPreview(null); setChoice(''); setJoinCode(''); }
  }, [open]);

  const lookUp = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (cleanCode.length !== 6) {
      toast.error('Invalid join code', { description: 'Please enter a 6-character code' });
      return;
    }
    setBusy(true);
    try {
      const response = await apiClient.post('/campaign-invites/preview', { join_code: cleanCode });
      const data = response.data || {};
      if (data.is_gm) {
        toast.info('That is your own campaign', { description: 'Share this code with your players.' });
        return;
      }
      const prepared = Array.isArray(data.prepared_characters) ? data.prepared_characters : [];
      setPreview({ campaign: data.campaign || {}, prepared });
      const preferredOwn = characterId && ownCharacters.some((item) => item.id === characterId) ? characterId : '';
      setChoice(preferredOwn ? `own:${preferredOwn}` : prepared[0] ? `prepared:${prepared[0].id}` : ownCharacters[0] ? `own:${ownCharacters[0].id}` : '');
    } catch (error) {
      toast.error('Could not find that campaign', {
        description: error?.formattedDetail || error?.response?.data?.detail || 'Check the code with your GM.',
      });
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    if (busy || !choice) return;
    const [kind, id] = choice.split(/:(.+)/);
    const body = kind === 'prepared' ? { join_code: cleanCode, prepared_character_id: id } : { join_code: cleanCode, character_id: id };
    const chosenName = kind === 'prepared'
      ? preview?.prepared.find((item) => item.id === id)?.name
      : ownCharacters.find((item) => item.id === id)?.name;
    setBusy(true);
    try {
      const response = await apiClient.post('/campaign-invites/join', body);
      const campaign = response.data?.campaign || response.data;
      const memberStatus = String(response.data?.status || '').toLowerCase();
      const who = chosenName || 'Your character';
      if (memberStatus === 'pending') {
        toast.info('Submitted for GM approval', {
          description: `${who} will join ${campaign?.name || 'the campaign'} once the GM approves the request.`,
          duration: 5000,
        });
      } else {
        toast.success(kind === 'prepared' ? 'Character claimed!' : 'Successfully joined campaign!', {
          description: kind === 'prepared'
            ? `${who} is now on your account and in ${campaign?.name || 'the campaign'}.`
            : `${who} is now part of ${campaign?.name || 'the campaign'}`,
          duration: 5000,
        });
      }
      onSuccess?.(campaign, memberStatus);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to join campaign', {
        description: error?.formattedDetail || error?.response?.data?.detail || 'Invalid code or campaign not found',
      });
    } finally {
      setBusy(false);
    }
  };

  const nothingToPick = preview && !preview.prepared.length && !ownCharacters.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rqk-join-dialog">
        <DialogHeader>
          <DialogTitle className="rqk-join-title"><Link2 size={21} aria-hidden="true" /> {preview ? preview.campaign.name || 'Join Campaign' : 'Join Campaign'}</DialogTitle>
          <DialogDescription className="rqk-join-description">
            {preview ? 'Choose who you will play.' : 'Enter the six-character code from your Game Master.'}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <form onSubmit={lookUp} className="rqk-join-form">
            <label htmlFor="rqk-join-code">Campaign join code</label>
            <Input id="rqk-join-code" value={cleanCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="ABC123" autoComplete="off" autoCapitalize="characters"
              spellCheck={false} maxLength={6} autoFocus
              aria-describedby="rqk-join-help" className="rqk-join-code" />
            <p id="rqk-join-help" className="rqk-join-help">Codes are case-insensitive. Ask your GM for a code if you do not have one.</p>
            <div className="rqk-join-actions">
              <Button type="button" onClick={() => onOpenChange(false)} disabled={busy} className="rqk-join-button">Cancel</Button>
              <Button type="submit" disabled={busy || cleanCode.length !== 6} className="rqk-join-button rqk-join-submit">
                {busy ? <><Loader className="spin" size={17} aria-hidden="true" /> Checking…</> : <><Check size={17} aria-hidden="true" /> Continue</>}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rqk-join-form">
            {preview.prepared.length > 0 && (
              <fieldset className="rqk-join-group">
                <legend><Sparkles size={15} aria-hidden="true" /> Made for this table by your GM</legend>
                {preview.prepared.map((item) => (
                  <label key={item.id} className="rqk-join-option">
                    <input type="radio" name="rqk-join-choice" value={`prepared:${item.id}`} checked={choice === `prepared:${item.id}`} onChange={() => setChoice(`prepared:${item.id}`)} />
                    <span><strong>{item.name}</strong><small>{describe(item) || 'Ready to play'} · claim it as yours</small></span>
                  </label>
                ))}
              </fieldset>
            )}
            {ownCharacters.length > 0 && (
              <fieldset className="rqk-join-group">
                <legend>Your characters</legend>
                {ownCharacters.map((item) => (
                  <label key={item.id} className="rqk-join-option">
                    <input type="radio" name="rqk-join-choice" value={`own:${item.id}`} checked={choice === `own:${item.id}`} onChange={() => setChoice(`own:${item.id}`)} />
                    <span><strong>{item.name}</strong></span>
                  </label>
                ))}
              </fieldset>
            )}
            {nothingToPick && (
              <p className="rqk-join-help" role="status">Your GM has no characters waiting yet, and you have none of your own. Create one, then come back with this code.</p>
            )}
            <div className="rqk-join-actions">
              <Button type="button" onClick={() => setPreview(null)} disabled={busy} className="rqk-join-button"><ArrowLeft size={16} aria-hidden="true" /> Back</Button>
              {nothingToPick ? (
                <Button type="button" onClick={() => { onOpenChange(false); navigate('/characters/new'); }} className="rqk-join-button rqk-join-submit">Create Character</Button>
              ) : (
                <Button type="button" onClick={join} disabled={busy || !choice} className="rqk-join-button rqk-join-submit">
                  {busy ? <><Loader className="spin" size={17} aria-hidden="true" /> Joining…</> : <><Check size={17} aria-hidden="true" /> {choice.startsWith('prepared:') ? 'Claim and Join' : 'Join Campaign'}</>}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default JoinCampaignModal;
