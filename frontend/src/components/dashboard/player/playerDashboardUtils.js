export const tabs = [
  { id: 'characters', label: 'Characters', testId: 'tab-characters' },
  { id: 'campaigns', label: 'Campaigns', testId: 'tab-campaigns' },
  { id: 'notes', label: 'Notes', testId: 'tab-notes' },
  { id: 'handouts', label: 'Received', testId: 'tab-handouts' },
];
export function combineLinkedCampaigns(campaigns, characters) { const campaignMap = new Map(); campaigns.forEach(c => { if (c?.id) campaignMap.set(c.id, c); }); characters.forEach(character => { const id = character.campaign_id || character.campaignId; if (!id || campaignMap.has(id)) return; campaignMap.set(id, { id, name: character.campaign_name || 'Linked Campaign', description: character.campaign_description || '', from_character: character.name }); }); return Array.from(campaignMap.values()); }
export function summarizeHandouts(handouts) { return { total: handouts.length, unread: handouts.filter(h => !h.read).length, saved: handouts.filter(h => h.saved).length }; }
