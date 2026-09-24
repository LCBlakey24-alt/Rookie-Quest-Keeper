import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PlayerNoContentPanel from './PlayerNoContentPanel';
import '@/styles/playerDashboardCampaignCards.css';

function campaignMeta(campaign = {}) {
  const system = [campaign.system, campaign.rules_edition].filter(Boolean).join(' · ');
  return [
    campaign.world_name || campaign.setting_name || '',
    system,
    campaign.from_character ? `Playing as ${campaign.from_character}` : '',
  ].filter(Boolean);
}

function membershipStatus(campaign = {}) {
  return String(campaign.member_status || campaign.campaign_join_status || 'active').toLowerCase();
}

function membershipLabel(status) {
  if (status === 'pending') return 'Pending GM Approval';
  if (status === 'retired') return 'Retired Character';
  if (status === 'dead') return 'Character Marked Dead';
  if (status === 'removed') return 'Removed from Campaign';
  return 'Joined Campaign';
}

export default function PlayerCampaignsPanel({ campaigns, onJoinCampaign, onOpenCampaign }) {
  return (
    <div className="player-dashboard-card-grid">
      {campaigns.length === 0 ? (
        <PlayerNoContentPanel
          title="No linked campaigns"
          message="Use a join code from your GM to link a character to a campaign."
          buttonLabel="Join Campaign"
          onButtonClick={onJoinCampaign}
        />
      ) : campaigns.map((campaign) => {
        const metadata = campaignMeta(campaign);
        const status = membershipStatus(campaign);
        const canOpen = !campaign.member_role || status === 'active';
        return (
          <Card key={campaign.id} className="player-dashboard-card player-dashboard-campaign-card">
            <CardContent className="player-dashboard-card-content">
              <div className="player-dashboard-campaign-copy">
                <p className="player-dashboard-eyebrow">{campaign.member_role ? membershipLabel(status) : 'Campaign'}</p>
                <h2>{campaign.name || 'Linked Campaign'}</h2>
                {metadata.length > 0 && (
                  <div className="player-dashboard-campaign-meta" aria-label="Campaign details">
                    {metadata.map((item) => <span key={item}>{item}</span>)}
                  </div>
                )}
                <p className="player-dashboard-campaign-description">
                  {campaign.description || (campaign.from_character
                    ? `Linked via ${campaign.from_character || 'your character'}`
                    : 'Campaign linked to your player account.')}
                </p>
              </div>
              <Button
                onClick={() => canOpen && onOpenCampaign(campaign)}
                disabled={!canOpen}
                className="btn-outline player-dashboard-action-button"
                title={!canOpen && status === 'pending' ? 'Waiting for GM approval' : undefined}
              >
                {canOpen ? 'Open Campaign' : status === 'pending' ? 'Awaiting Approval' : 'Campaign Unavailable'} <ChevronRight size={16} />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
