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
        return (
          <Card key={campaign.id} className="player-dashboard-card player-dashboard-campaign-card">
            <CardContent className="player-dashboard-card-content">
              <div className="player-dashboard-campaign-copy">
                <p className="player-dashboard-eyebrow">{campaign.member_role ? 'Joined Campaign' : 'Campaign'}</p>
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
              <Button onClick={() => onOpenCampaign(campaign)} className="btn-outline player-dashboard-action-button">
                Open Campaign <ChevronRight size={16} />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
