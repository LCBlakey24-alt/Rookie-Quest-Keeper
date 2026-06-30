import { Button } from '@/components/ui/button';

export default function PlayerNoContentPanel({ title, message, buttonLabel, onButtonClick }) {
  return (
    <div className="player-dashboard-empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
      <Button onClick={onButtonClick} className="btn-primary player-dashboard-action-button">
        {buttonLabel}
      </Button>
    </div>
  );
}
