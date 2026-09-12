import { ChevronRight, Heart, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PlayerNoContentPanel from './PlayerNoContentPanel';
import '@/styles/playerDashboardCharacterCards.css';

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== '');
}

function characterVitals(character = {}) {
  const currentHp = firstValue(character.current_hit_points, character.current_hp, character.stats?.current_hp);
  const maxHp = firstValue(character.max_hit_points, character.max_hp, character.stats?.max_hp);
  const armorClass = firstValue(character.armor_class, character.ac, character.stats?.armor_class, character.stats?.ac);
  return { currentHp, maxHp, armorClass };
}

export default function PlayerCharactersPanel({ characters, onCreateCharacter, onOpenCharacter }) {
  return (
    <div className="player-dashboard-card-grid">
      {characters.length === 0 ? (
        <PlayerNoContentPanel
          title="No characters yet"
          message="Create a character to get started, or import an existing sheet from My Characters."
          buttonLabel="Create Character"
          onButtonClick={onCreateCharacter}
        />
      ) : characters.map((character) => {
        const portrait = character.portrait_url || character.avatar_url || character.image_url || '';
        const { currentHp, maxHp, armorClass } = characterVitals(character);
        const hasHp = currentHp !== undefined || maxHp !== undefined;

        return (
          <Card key={character.id} className="player-dashboard-card player-dashboard-character-card">
            <CardContent className="player-dashboard-card-content">
              <div className="player-dashboard-character-main">
                {portrait && <img className="player-dashboard-character-avatar" src={portrait} alt="" />}
                <div className="player-dashboard-character-copy">
                  <p className="player-dashboard-eyebrow">Character</p>
                  <h2>{character.name || 'Unnamed Character'}</h2>
                  <p>
                    Level {character.level || 1} {character.race || ''} {character.character_class || 'Adventurer'}
                  </p>
                  {(hasHp || armorClass !== undefined) && (
                    <div className="player-dashboard-vitals" aria-label="Character vitals">
                      {hasHp && (
                        <span className="player-dashboard-vital">
                          <Heart size={14} /> HP {currentHp ?? '—'}{maxHp !== undefined ? ` / ${maxHp}` : ''}
                        </span>
                      )}
                      {armorClass !== undefined && (
                        <span className="player-dashboard-vital">
                          <Shield size={14} /> AC {armorClass}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={() => onOpenCharacter(character)} className="btn-outline player-dashboard-action-button">
                Open Sheet <ChevronRight size={16} />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
