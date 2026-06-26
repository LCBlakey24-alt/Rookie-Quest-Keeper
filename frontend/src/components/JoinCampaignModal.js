import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Loader, Check, Key } from 'lucide-react';
import apiClient from '@/lib/apiClient';

function JoinCampaignModal({ characterId, characterName, open, onOpenChange, onSuccess }) {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const handleJoin = async () => {
    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Invalid join code', {
        description: 'Please enter a 6-character code'
      });
      return;
    }

    setJoining(true);
    try {
      const response = await apiClient.post('/campaign-invites/join', {
        join_code: cleanCode,
        character_id: characterId
      });

      const campaign = response.data?.campaign || response.data;
      toast.success('Successfully joined campaign!', {
        description: `${characterName || 'Your character'} is now part of ${campaign?.name || 'the campaign'}`,
        duration: 5000
      });

      if (onSuccess) onSuccess(campaign);
      setJoinCode('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to join campaign', {
        description: error?.formattedDetail || error?.response?.data?.detail || 'Invalid code or campaign not found'
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal" style={modalStyle}>
        <DialogHeader>
          <DialogTitle style={titleStyle}>
            <Link2 size={22} color="#d00000" />
            Join Campaign
          </DialogTitle>
        </DialogHeader>

        <div style={{ marginTop: 18 }}>
          <p style={bodyTextStyle}>
            Enter the 6-character join code provided by your Game Master to link <strong style={strongStyle}>{characterName || 'your character'}</strong> to their campaign.
          </p>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Campaign Join Code</label>
            <div style={{ position: 'relative' }}>
              <Input
                value={cleanCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="ABC123"
                className="input"
                style={codeInputStyle}
                maxLength={6}
                autoFocus
              />
              <Key size={20} color="rgba(255,255,255,0.68)" style={keyIconStyle} />
            </div>
            <p style={helpTextStyle}>The code is case-insensitive and exactly 6 characters.</p>
          </div>

          <div style={tipBoxStyle}>
            <p style={tipTextStyle}>
              Ask your GM for the campaign join code. They can generate one from the campaign list on their dashboard.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button onClick={() => onOpenChange(false)} className="btn-outline" style={secondaryButtonStyle}>Cancel</Button>
            <Button onClick={handleJoin} disabled={joining || cleanCode.length !== 6} className="btn-primary" style={primaryButtonStyle}>
              {joining ? <><Loader className="spin" size={18} /> Joining...</> : <><Check size={18} /> Join Campaign</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const fontStack = 'var(--rq-body-font, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const modalStyle = {
  maxWidth: 500,
  background: '#242424',
  backgroundColor: '#242424',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 0,
  color: '#ffffff',
  boxShadow: 'none',
  fontFamily: fontStack,
};

const titleStyle = {
  fontSize: 24,
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontWeight: 950,
  fontFamily: fontStack,
};

const bodyTextStyle = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 14,
  marginBottom: 18,
  lineHeight: 1.5,
  fontFamily: fontStack,
};

const strongStyle = { color: '#ffffff', fontWeight: 950 };

const labelStyle = {
  display: 'block',
  marginBottom: 8,
  color: 'rgba(255,255,255,0.68)',
  fontSize: 12,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontFamily: fontStack,
};

const codeInputStyle = {
  fontSize: 24,
  fontWeight: 950,
  textAlign: 'center',
  letterSpacing: 4,
  paddingLeft: 48,
  borderRadius: 0,
  background: '#3a3a3a',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.18)',
  fontFamily: fontStack,
};

const keyIconStyle = {
  position: 'absolute',
  left: 16,
  top: '50%',
  transform: 'translateY(-50%)'
};

const helpTextStyle = {
  color: 'rgba(255,255,255,0.58)',
  fontSize: 12,
  marginTop: 8,
  fontFamily: fontStack,
};

const tipBoxStyle = {
  padding: 12,
  background: '#3a3a3a',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 0,
  marginBottom: 18,
};

const tipTextStyle = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 13,
  lineHeight: 1.45,
  margin: 0,
  fontFamily: fontStack,
};

const secondaryButtonStyle = {
  border: 0,
  borderRadius: 0,
  background: '#3a3a3a',
  color: '#ffffff',
  fontWeight: 900,
  fontFamily: fontStack,
};

const primaryButtonStyle = {
  border: 0,
  borderRadius: 0,
  background: '#d00000',
  color: '#ffffff',
  fontWeight: 950,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: fontStack,
};

export default JoinCampaignModal;
