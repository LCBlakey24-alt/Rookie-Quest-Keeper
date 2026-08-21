import apiClient from '@/lib/apiClient';
import { publishDisplayState } from '@/lib/liveDisplayBus';

/**
 * Publish a display state locally first, then report whether the campaign API
 * accepted the same state for other devices. This is intentionally separate
 * from publishCampaignDisplayState, whose tolerant return contract is relied
 * on by Combat/offline flows.
 */
export async function publishCampaignDisplayStateWithStatus(campaignId, state) {
  publishDisplayState(campaignId, state);

  try {
    const response = await apiClient.put(`/campaigns/${campaignId}/display-state`, state);
    const remoteState = response?.data || state;
    publishDisplayState(campaignId, remoteState);
    return { state: remoteState, remoteSynced: true };
  } catch (error) {
    return { state, remoteSynced: false, error };
  }
}

export default publishCampaignDisplayStateWithStatus;
