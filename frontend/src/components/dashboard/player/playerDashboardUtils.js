export function combineLinkedCampaigns(campaigns, characters) {
  const campaignMap = new Map();

  campaigns.forEach((campaign) => {
    if (campaign?.id) campaignMap.set(campaign.id, campaign);
  });

  characters.forEach((character) => {
    const id = character.campaign_id || character.campaignId;
    if (!id || campaignMap.has(id)) return;

    campaignMap.set(id, {
      id,
      name: character.campaign_name || 'Linked Campaign',
      description: character.campaign_description || '',
      from_character: character.name,
    });
  });

  return Array.from(campaignMap.values());
}

export function summarizeHandouts(handouts) {
  return {
    total: handouts.length,
    unread: handouts.filter((handout) => !handout.read).length,
    saved: handouts.filter((handout) => handout.saved).length,
  };
}
