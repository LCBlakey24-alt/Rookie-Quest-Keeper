/**
 * Players who have linked a character but are still waiting to be approved.
 *
 * Campaigns default to join_mode "gm_approval", so a player who joins with
 * a code sits at status "pending" until the GM accepts them. The live party
 * deliberately lists only approved members -- an unapproved stranger should
 * not be droppable into combat -- but that left a GM whose players had all
 * joined looking at "No linked player characters yet" with nothing to act
 * on and no clue that three characters were waiting.
 *
 * So the empty state asks this question and says what to do about it. This
 * never adds anyone to the party; it only explains why the party is empty.
 */

const PENDING = 'pending';

export function pendingMembersFrom(members) {
  if (!Array.isArray(members)) return [];
  return members.filter((member) => String(member?.status || '').toLowerCase() === PENDING);
}

export function describePendingMembers(pending) {
  const names = pendingMembersFrom(pending)
    .map((member) => String(member?.character_name || member?.username || '').trim())
    .filter(Boolean);

  if (!names.length) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Ask the GM-only members endpoint who is waiting.
 *
 * Returns an empty list rather than throwing: this only powers an
 * explanatory message, so a failure here must never break Live Play or
 * replace a working screen with an error.
 */
export async function loadPendingCampaignMembers(apiClient, campaignId) {
  if (!apiClient || !campaignId) return [];
  try {
    const response = await apiClient.get(`/campaign-invites/${campaignId}/members`);
    return pendingMembersFrom(response?.data);
  } catch (error) {
    return [];
  }
}
