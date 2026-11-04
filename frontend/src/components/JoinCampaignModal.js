import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Loader, Check } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './JoinCampaignModal.css';

function JoinCampaignModal({ characterId, characterName, open, onOpenChange, onSuccess }) {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const handleJoin = async (event) => {
    event.preventDefault();
    if (joining) return;
    if (cleanCode.length !== 6) {
      toast.error('Invalid join code', { description: 'Please enter a 6-character code' });
      return;
    }
    setJoining(true);
    try {
      const response = await apiClient.post('/campaign-invites/join', {
        join_code: cleanCode, character_id: characterId,
      });
      const campaign = response.data?.campaign || response.data;
      const memberStatus = String(response.data?.status || '').toLowerCase();
      if (memberStatus === 'pending') {
        toast.info('Submitted for GM approval', {
          description: `${characterName || 'Your character'} will join ${campaign?.name || 'the campaign'} once the GM approves the request.`,
          duration: 5000,
        });
      } else {
        toast.success('Successfully joined campaign!', {
          description: `${characterName || 'Your character'} is now part of ${campaign?.name || 'the campaign'}`,
          duration: 5000,
        });
      }
      onSuccess?.(campaign, memberStatus);
      setJoinCode('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to join campaign', {
        description: error?.formattedDetail || error?.response?.data?.detail || 'Invalid code or campaign not found',
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rqk-join-dialog">
        <DialogHeader>
          <DialogTitle className="rqk-join-title"><Link2 size={21} aria-hidden="true" /> Join Campaign</DialogTitle>
          <DialogDescription className="rqk-join-description">
            Enter the six-character code from your Game Master to join with <strong>{characterName || 'your character'}</strong>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="rqk-join-form">
          <label htmlFor="rqk-join-code">Campaign join code</label>
          <Input id="rqk-join-code" value={cleanCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="ABC123" autoComplete="off" autoCapitalize="characters"
            spellCheck={false} maxLength={6} autoFocus
            aria-describedby="rqk-join-help" className="rqk-join-code" />
          <p id="rqk-join-help" className="rqk-join-help">Codes are case-insensitive. Ask your GM for a code if you do not have one.</p>
          <div className="rqk-join-actions">
            <Button type="button" onClick={() => onOpenChange(false)} disabled={joining} className="rqk-join-button">Cancel</Button>
            <Button type="submit" disabled={joining || cleanCode.length !== 6} className="rqk-join-button rqk-join-submit">
              {joining ? <><Loader className="spin" size={17} aria-hidden="true" /> Joining…</> : <><Check size={17} aria-hidden="true" /> Join Campaign</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default JoinCampaignModal;
