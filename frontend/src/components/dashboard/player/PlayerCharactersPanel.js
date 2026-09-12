import { ChevronRight, Heart, Shield, Upload } from 'lucide-react';
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

export default function PlayerCharactersPanel({ characters, onCreateCharacter, onImportCharacter, onOpenCharacter }) {
  if (characters.length === 0) {
    return (
      <div className="player-dashboard-card-grid">
        <PlayerNoContentPanel
          title="No characters yet"
          message="Build a new character here, or import an existing sheet if you already have one."
          buttonLabel="Create Character"
          onButtonClick={onCreateCharacter}
          secondaryButtonLabel="Import Character"
          onSecondaryButtonClick={onImportCharacter}
        />
      </div>
    );
  }

  return (
    <div className="player-dashboard-character-section">
      <div className="player-dashboard-character-tools">
        <span>{characters.length} character{characters.length === 1 ? '' : 's'} ready</span>
        <Button onClick={onImportCharacter} className="btn-outline player-dashboard-action-button">
          <Upload size={15} /> Import Character
        </Button>
      </div>

      <div className="player-dashboard-card-grid">
        {characters.map((character) => {
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
    </div>
  );
}
