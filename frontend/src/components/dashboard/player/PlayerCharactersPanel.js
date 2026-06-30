import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PlayerNoContentPanel from './PlayerNoContentPanel';

export default function PlayerCharactersPanel({ characters, onCreateCharacter, onOpenCharacter }) {
  return (
    <div className="player-dashboard-card-grid">
      {characters.length === 0 ? (
        <PlayerNoContentPanel
          title="No characters yet"
          message="Create a character with Full Creator, start quick with Basic Creator, or ask Rook Character Matchmaker to suggest a hero."
          buttonLabel="Create Character"
          onButtonClick={onCreateCharacter}
        />
      ) : characters.map((character) => (
        <Card key={character.id} className="player-dashboard-card">
          <CardContent className="player-dashboard-card-content">
            <div>
              <p className="player-dashboard-eyebrow">Character</p>
              <h2>{character.name || 'Unnamed Character'}</h2>
              <p>
                Level {character.level || 1} {character.race || ''} {character.character_class || 'Adventurer'}
              </p>
            </div>
            <Button onClick={() => onOpenCharacter(character)} className="btn-outline player-dashboard-action-button">
              Open Sheet <ChevronRight size={16} />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
