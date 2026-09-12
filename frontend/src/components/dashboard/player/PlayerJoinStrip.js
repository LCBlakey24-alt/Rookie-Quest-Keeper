import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function characterJoinLabel(character) {
  const name = character?.name || 'Unnamed Character';
  const level = Number(character?.level || 1);
  const className = character?.character_class || character?.class || 'Adventurer';
  return `${name} — Lv ${level} ${className}`;
}

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
            {characterJoinLabel(character)}
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
