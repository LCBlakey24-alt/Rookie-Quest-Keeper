import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

/**
 * Personal campaign imports are a development convenience, never generic
 * onboarding material. Fail closed until the server verifies BOTH the real
 * site-admin session and ownership of the active campaign.
 *
 * This is a UI visibility gate, NOT a confidentiality boundary for files
 * checked into a public repository. True private lore belongs behind
 * authenticated backend data endpoints, not in shipped JavaScript.
 */
export default function usePrivateCampaignPackAccess(campaignId) {
  const [access, setAccess] = useState({ campaignId: null, allowed: false });

  useEffect(() => {
    let disposed = false;
    let request = 0;
    const check = async () => {
      const revision = ++request;
      setAccess({ campaignId: null, allowed: false });
      if (!campaignId) return;
      try {
        const [adminResponse, campaignResponse] = await Promise.all([
          apiClient.get('/admin/check'),
          apiClient.get(`/campaigns/${encodeURIComponent(campaignId)}`),
        ]);
        const verified = adminResponse?.data?.is_admin === true
          && String(campaignResponse?.data?.id || '') === String(campaignId)
          && Boolean(campaignResponse?.data?.dm_user_id);
        if (!disposed && revision === request) {
          setAccess({ campaignId, allowed: verified });
        }
      } catch {
        // Offline, expired token or denied access: the ordinary tools remain.
        // Never display a prior account's private GM shortcuts by default.
        if (!disposed && revision === request) {
          setAccess({ campaignId, allowed: false });
        }
      }
    };
    check();
    const onAuthScopeChanged = () => { check(); };
    window.addEventListener('rqk:auth-scope-changed', onAuthScopeChanged);
    return () => {
      disposed = true;
      request += 1;
      window.removeEventListener('rqk:auth-scope-changed', onAuthScopeChanged);
    };
  }, [campaignId]);

  return access.campaignId === campaignId && access.allowed;
}
