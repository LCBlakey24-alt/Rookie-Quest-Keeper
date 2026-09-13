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
            <Link2 size={21} color="#7CCBFF" />
            Join Campaign
          </DialogTitle>
        </DialogHeader>

        <div style={{ marginTop: 12 }}>
          <p style={bodyTextStyle}>
            Enter the 6-character join code provided by your Game Master to link <strong style={strongStyle}>{characterName || 'your character'}</strong> to their campaign.
          </p>

          <div style={{ marginBottom: 12 }}>
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
              <Key size={18} color="#7CCBFF" style={keyIconStyle} />
            </div>
            <p style={helpTextStyle}>The code is case-insensitive and exactly 6 characters.</p>
          </div>

          <div style={tipBoxStyle}>
            <p style={tipTextStyle}>
              Ask your GM for the campaign join code. They can generate one from the campaign list on their dashboard.
            </p>
          </div>

          <div style={actionsStyle}>
            <Button onClick={() => onOpenChange(false)} className="btn-outline" style={secondaryButtonStyle}>Cancel</Button>
            <Button onClick={handleJoin} disabled={joining || cleanCode.length !== 6} className="btn-primary" style={primaryButtonStyle}>
              {joining ? <><Loader className="spin" size={17} /> Joining...</> : <><Check size={17} /> Join Campaign</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const modalStyle = {
  width: 'min(500px, calc(100vw - 20px))',
  maxWidth: 500,
  background: '#0C2234',
  backgroundColor: '#0C2234',
  backgroundImage: 'none',
  border: '1px solid rgba(255,45,170,0.28)',
  borderRadius: 7,
  color: '#FFFFFF',
  boxShadow: 'none',
  fontFamily: fontStack,
};

const titleStyle = {
  margin: 0,
  fontSize: 22,
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontWeight: 900,
  fontFamily: fontStack,
};

const bodyTextStyle = {
  color: '#FFFFFF',
  fontSize: 13,
  marginBottom: 12,
  lineHeight: 1.45,
  fontFamily: fontStack,
};

const strongStyle = { color: '#FFFFFF', fontWeight: 900 };

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontFamily: fontStack,
};

const codeInputStyle = {
  minHeight: 48,
  fontSize: 22,
  fontWeight: 900,
  textAlign: 'center',
  letterSpacing: 4,
  paddingLeft: 42,
  borderRadius: 5,
  background: '#081B2A',
  backgroundImage: 'none',
  color: '#FFFFFF',
  border: '1px solid rgba(255,45,170,0.18)',
  boxShadow: 'none',
  fontFamily: fontStack,
};

const keyIconStyle = {
  position: 'absolute',
  left: 13,
  top: '50%',
  transform: 'translateY(-50%)'
};

const helpTextStyle = {
  color: '#FFFFFF',
  fontSize: 10,
  marginTop: 6,
  fontFamily: fontStack,
};

const tipBoxStyle = {
  padding: 9,
  background: '#102B40',
  backgroundImage: 'none',
  border: '1px solid rgba(255,45,170,0.18)',
  borderLeft: '1px solid #FF2DAA',
  borderRadius: 5,
  marginBottom: 12,
};

const tipTextStyle = {
  color: '#FFFFFF',
  fontSize: 11,
  lineHeight: 1.4,
  margin: 0,
  fontFamily: fontStack,
};

const actionsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 6,
};

const secondaryButtonStyle = {
  minHeight: 42,
  border: '1px solid rgba(255,45,170,0.18)',
  borderRadius: 5,
  background: '#102B40',
  color: '#FFFFFF',
  fontWeight: 850,
  boxShadow: 'none',
  fontFamily: fontStack,
};

const primaryButtonStyle = {
  minHeight: 42,
  border: '1px solid #FF2DAA',
  borderRadius: 5,
  background: '#102B40',
  color: '#FFFFFF',
  fontWeight: 900,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  boxShadow: 'none',
  fontFamily: fontStack,
};

export default JoinCampaignModal;