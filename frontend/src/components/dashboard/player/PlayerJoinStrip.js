import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PlayerJoinStrip({
  characters,
  selectedCharacterId,
  onSelectedCharacterChange,
  onJoinCampaign,
}) {
  if (characters.length === 0) return null;

  return (
    <section className="player-dashboard-board player-join-strip" aria-label="Join a campaign">
      <label htmlFor="player-join-character">Join a campaign as</label>
      <select
        id="player-join-character"
        value={selectedCharacterId}
        onChange={(event) => onSelectedCharacterChange(event.target.value)}
        aria-label="Select character for campaign join"
      >
        {characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.name || 'Unnamed Character'}
          </option>
        ))}
      </select>

      <Button onClick={onJoinCampaign} className="btn-outline player-dashboard-action-button">
        <Link2 size={16} />
        Enter Join Code
      </Button>
    </section>
  );
}
