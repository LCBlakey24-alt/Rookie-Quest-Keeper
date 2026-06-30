import { ArrowLeft, Link2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlayerDashboardHeader({
  refreshing,
  onBack,
  onRefresh,
  onCreateCharacter,
  onJoinCampaign,
}) {
  return (
    <section className="player-dashboard-hero">
      <div className="player-dashboard-hero-copy">
        <Button
          data-testid="back-btn"
          onClick={onBack}
          className="btn-outline player-dashboard-icon-button"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Button>

        <div className="player-dashboard-title-block">
          <p className="player-dashboard-eyebrow">Player Dashboard</p>
          <h1>Your Characters, Campaigns & Notes</h1>
          <p>
            Create a character with Full Creator, Basic Creator, or Rook Character Matchmaker, then join a GM campaign and keep player-facing notes in one place.
          </p>
        </div>
      </div>

      <div className="player-dashboard-actions">
        <Button onClick={onRefresh} className="btn-outline player-dashboard-action-button" disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'player-dashboard-refreshing' : ''} />
          Refresh
        </Button>
        <Button
          data-testid="create-character-btn"
          onClick={onCreateCharacter}
          className="btn-primary player-dashboard-action-button"
        >
          <Plus size={16} />
          Create Character
        </Button>
        <Button
          data-testid="join-campaign-btn"
          onClick={onJoinCampaign}
          className="btn-primary player-dashboard-action-button"
        >
          <Link2 size={16} />
          Join Campaign
        </Button>
      </div>
    </section>
  );
}
