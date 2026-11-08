import apiClient from '@/lib/apiClient';
import { currentDisplayAccount, publishDisplayState, reconcileRejectedDisplayState } from '@/lib/liveDisplayBus';

/**
 * Publish a display state locally first, then report whether the campaign API
 * accepted the same state for other devices. This is intentionally separate
 * from publishCampaignDisplayState, whose tolerant return contract is relied
 * on by Combat/offline flows.
 */
export async function publishCampaignDisplayStateWithStatus(campaignId, state) {
  const publishingAccount = currentDisplayAccount();
  publishDisplayState(campaignId, state, publishingAccount);

  try {
    const response = await apiClient.put(`/campaigns/${campaignId}/display-state`, state);
    const remoteState = response?.data || state;
    if (!publishingAccount || currentDisplayAccount() !== publishingAccount) {
      return { state, remoteSynced: false, staleAccount: true };
    }
    publishDisplayState(campaignId, remoteState, publishingAccount);
    return { state: remoteState, remoteSynced: true };
  } catch (error) {
    if (Number(error?.response?.status) === 409) {
      const reconciledState = await reconcileRejectedDisplayState(campaignId, publishingAccount);
      return { state: reconciledState || state, remoteSynced: false, conflict: true, error };
    }
    return { state, remoteSynced: false, error };
  }
}

export default publishCampaignDisplayStateWithStatus;
