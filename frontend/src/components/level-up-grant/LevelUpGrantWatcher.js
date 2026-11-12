import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import apiClient from '@/lib/apiClient';
import LevelUpCelebration from './LevelUpCelebration';

export const LEVEL_UP_POLL_MS = 60000;

/**
 * Watches for level ups the GM has granted to the signed-in player's
 * characters. Checks when the app opens, about once a minute while the tab
 * is visible, and whenever the player comes back to the tab, so a grant
 * shows within a minute when they are online and on their next visit when
 * they are not. Each grant plays the celebration once: it is marked seen
 * as soon as it shows, so another device does not replay it.
 */
export default function LevelUpGrantWatcher() {
  const navigate = useNavigate();
  const [grant, setGrant] = useState(null);
  const showing = useRef(null);

  const check = useCallback(async () => {
    if (showing.current || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
    try {
      const response = await apiClient.get('/characters/level-up-grants/mine');
      const next = (Array.isArray(response?.data) ? response.data : []).find((entry) => !entry.seen);
      if (!next || showing.current) return;
      showing.current = next.grant_id;
      setGrant(next);
      apiClient.post(`/characters/${next.character_id}/level-up-grant/seen`, { grant_id: next.grant_id }).catch(() => {});
    } catch {
      /* offline or signed out: try again on the next check */
    }
  }, []);

  useEffect(() => {
    check();
    const timer = window.setInterval(check, LEVEL_UP_POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  const close = () => {
    showing.current = null;
    setGrant(null);
  };

  if (!grant) return null;
  return (
    <LevelUpCelebration
      grant={grant}
      title="Level up ready!"
      primaryLabel={`Roll for level ${grant.to_level}`}
      onLater={close}
      onLevelUp={() => {
        const id = grant.character_id;
        close();
        navigate(`/characters/${id}?levelup=1`);
      }}
    />
  );
}
