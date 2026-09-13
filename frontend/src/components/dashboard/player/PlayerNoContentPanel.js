import { Button } from '@/components/ui/button';

export default function PlayerNoContentPanel({
  title,
  message,
  buttonLabel,
  onButtonClick,
  secondaryButtonLabel,
  onSecondaryButtonClick,
}) {
  return (
    <div className="player-dashboard-empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="player-dashboard-empty-actions">
        <Button onClick={onButtonClick} className="btn-primary player-dashboard-action-button">
          {buttonLabel}
        </Button>
        {secondaryButtonLabel && onSecondaryButtonClick && (
          <Button onClick={onSecondaryButtonClick} className="btn-outline player-dashboard-action-button">
            {secondaryButtonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
