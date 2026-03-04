import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link2, Loader, Check, Key } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function JoinCampaignModal({ characterId, characterName, open, onOpenChange, onSuccess }) {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!joinCode || joinCode.trim().length !== 6) {
      toast.error('Invalid join code', {
        description: 'Please enter a 6-character code'
      });
      return;
    }

    setJoining(true);
    try {
      const response = await axios.post(`${API}/campaigns/join`, {
        join_code: joinCode.toUpperCase().trim(),
        character_id: characterId
      });

      toast.success('Successfully joined campaign!', {
        description: `${characterName} is now part of ${response.data.campaign.name}`,
        duration: 5000
      });

      if (onSuccess) onSuccess(response.data.campaign);
      setJoinCode('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to join campaign', {
        description: error.response?.data?.detail || 'Invalid code or campaign not found'
      });
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="modal" style={{ maxWidth: '500px' }}>
        <DialogHeader>
          <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link2 size={24} color="#22c55e" />
            Join Campaign
          </DialogTitle>
        </DialogHeader>

        <div style={{ marginTop: '24px' }}>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
            Enter the 6-character join code provided by your Game Master to link <strong style={{ color: '#67e8f9' }}>{characterName}</strong> to their campaign.
          </p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#67e8f9', fontSize: '14px', fontWeight: '600' }}>
              Campaign Join Code
            </label>
            <div style={{ position: 'relative' }}>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                className="input"
                style={{ 
                  fontSize: '24px', 
                  fontWeight: '800', 
                  textAlign: 'center',
                  letterSpacing: '4px',
                  paddingLeft: '48px'
                }}
                maxLength={6}
                autoFocus
              />
              <Key 
                size={20} 
                color="#94a3b8" 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)' 
                }} 
              />
            </div>
            <p style={{ color: '#64748b', fontSize: '12px', marginTop: '8px' }}>
              The code is case-insensitive and exactly 6 characters
            </p>
          </div>

          <div style={{
            padding: '16px',
            background: 'rgba(74, 125, 255, 0.1)',
            border: '1px solid #4a7dff',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <p style={{ color: '#4a7dff', fontSize: '13px', lineHeight: '1.6' }}>
              💡 <strong>Tip:</strong> Ask your GM for the campaign join code. They can find it in their campaign settings.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => onOpenChange(false)}
              className="btn-outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={joining || joinCode.trim().length !== 6}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {joining ? (
                <>
                  <Loader className="spin" size={18} />
                  Joining...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Join Campaign
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default JoinCampaignModal;
