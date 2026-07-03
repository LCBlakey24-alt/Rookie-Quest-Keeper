import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Copy, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import '@/styles/libraryPages.css';

function recordId(record) {
  return record?.id || record?._id || record?.character_id || record?.characterId || '';
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function classSummary(character) {
  const classLevels = character?.class_levels && typeof character.class_levels === 'object'
    ? Object.entries(character.class_levels).filter(([, level]) => Number(level) > 0)
    : [];
  if (classLevels.length > 0) return classLevels.map(([name]) => name).join(' / ');
  return character?.character_class || character?.class_name || character?.class || 'Adventurer';
}

function characterLine(character) {
  const race = character?.race || character?.species || 'Unknown origin';
  return `${race} • ${classSummary(character)}`.replace(/\s+/g, ' ').trim();
}

function characterLevel(character) {
  return `Level ${character?.level || 1}`;
}

function duplicatePayload(source) {
  return {
    name: `Copy of ${characterTitle(source)}`,
    race: source.race || source.species || 'Human',
    subrace: source.subrace || '',
    character_class: source.character_class || source.class_name || source.class || 'Fighter',
    subclass: source.subclass || '',
    background: source.background || '',
    level: Number(source.level || 1),
    edition: source.edition || source.rules_edition || (String(source.ruleset_id || '').includes('2024') ? '2024' : '2014'),
    ruleset_id: source.ruleset_id || (String(source.edition || source.rules_edition || '').includes('2024') ? 'dnd5e_2024' : 'dnd5e_2014'),
    strength: Number(source.strength || 10),
    dexterity: Number(source.dexterity || 10),
    constitution: Number(source.constitution || 10),
    intelligence: Number(source.intelligence || 10),
    wisdom: Number(source.wisdom || 10),
    charisma: Number(source.charisma || 10),
    armor_class: Number(source.armor_class || 10),
    speed: Number(source.speed || 30),
    max_hit_points: Number(source.max_hit_points || 10),
    current_hit_points: Number(source.current_hit_points || source.max_hit_points || 10),
    temporary_hit_points: Number(source.temporary_hit_points || source.temp_hp || 0),
    temp_hp: Number(source.temp_hp || source.temporary_hit_points || 0),
    hit_dice: source.hit_dice || undefined,
    hit_dice_remaining: Number(source.hit_dice_remaining ?? source.level ?? 1),
    alignment: source.alignment || 'Neutral',
    personality_traits: source.personality_traits || source.personality_trait || '',
    ideals: source.ideals || source.ideal || '',
    bonds: source.bonds || source.bond || '',
    flaws: source.flaws || source.flaw || '',
    backstory: source.backstory || '',
    portrait_url: source.portrait_url || '',
    skill_proficiencies: source.skill_proficiencies || [],
    saving_throw_proficiencies: source.saving_throw_proficiencies || [],
    weapon_proficiencies: source.weapon_proficiencies || [],
    armor_proficiencies: source.armor_proficiencies || [],
    tool_proficiencies: source.tool_proficiencies || [],
    languages: source.languages || [],
    racial_traits: source.racial_traits || [],
    class_features: source.class_features || [],
    spells_known: source.spells_known || [],
    spells_prepared: source.spells_prepared || [],
    cantrips_known: source.cantrips_known || [],
    spellcasting_ability: source.spellcasting_ability || '',
    spell_save_dc: Number(source.spell_save_dc || 0),
    spell_attack_bonus: Number(source.spell_attack_bonus || 0),
    spell_slots: source.spell_slots || {},
    spell_slots_remaining: source.spell_slots_remaining || source.spell_slots || {},
    spell_preparation_loadout: source.spell_preparation_loadout || '',
    feats: source.feats || [],
    equipment_choice: source.equipment_choice || '',
    fighting_style: source.fighting_style || '',
    starting_equipment: source.starting_equipment || [],
    equipment: source.equipment || [],
    inventory: source.inventory || [],
    equipped: source.equipped || {},
    currency: source.currency || {},
    gold: Number(source.gold || source.currency?.gold || 0),
    conditions: [],
    inspiration: false,
    concentrating_on: '',
  };
}

export default function MyCharactersPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [duplicatingId, setDuplicatingId] = useState('');

  const sortedCharacters = useMemo(() => [...characters].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )), [characters]);

  const loadCharacters = async () => {
    try {
      const response = await apiClient.get('/characters');
      const records = Array.isArray(response.data) ? response.data : response.data?.characters || [];
      setCharacters(records.filter((item) => item && typeof item === 'object'));
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadCharacters();
      toast.success('Characters refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const duplicateCharacter = async (character) => {
    const id = recordId(character);
    if (!id) return;

    try {
      setDuplicatingId(id);
      const response = await apiClient.get(`/characters/${id}`);
      const source = response.data?.character || response.data || character;
      await apiClient.post('/characters', duplicatePayload(source));
      toast.success('Character duplicated');
      await loadCharacters();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to duplicate character');
    } finally {
      setDuplicatingId('');
    }
  };

  const deleteCharacter = async (character) => {
    const id = recordId(character);
    const name = characterTitle(character);
    if (!id) return;

    const confirmed = window.confirm(`Delete character "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await apiClient.delete(`/characters/${id}`);
      toast.success('Character deleted');
      await loadCharacters();
    } catch (error) {
      toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to delete character');
    } finally {
      setDeletingId('');
    }
  };

  if (loading) {
    return (
      <main className="library-page library-page-loading">
        <section className="loading-screen" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden="true" />
          <p className="loading-title">Opening My Characters...</p>
          <p className="loading-tip">Loading your created characters.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="library-page characters-library-page">
      <section className="library-page-hero characters-library-hero">
        <h1>My Characters</h1>
        <p>Manage your heroes, level them up, and jump back into play.</p>
      </section>

      <section className="library-page-action-row" aria-label="Character library actions">
        <div className="library-page-action-main">
          <Link to="/characters/new" className="library-page-button library-page-button-primary">
            <Plus size={16} />
            Create Character
          </Link>
        </div>
        <div className="library-page-action-secondary">
          <button type="button" onClick={refresh} disabled={refreshing} className="library-page-button-secondary">
            <RefreshCw size={16} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="library-page-toolbar" aria-label="Character library status">
        <p className="library-page-count">
          {sortedCharacters.length} character{sortedCharacters.length === 1 ? '' : 's'} saved
        </p>
      </section>

      {sortedCharacters.length === 0 ? (
        <section className="library-page-empty">
          <h2>No characters yet</h2>
          <p>Your next hero is waiting to be written into the story.</p>
          <div className="library-page-actions">
            <Link to="/characters/new" className="library-page-button library-page-button-primary">Create Character</Link>
          </div>
        </section>
      ) : (
        <section className="library-page-grid" aria-label="Saved characters">
          {sortedCharacters.map((character, index) => {
            const id = recordId(character);
            const deleting = deletingId === id;
            const duplicating = duplicatingId === id;

            return (
              <article key={id || `character-${index}`} className="library-page-card character-library-card">
                <div className="character-library-card-copy">
                  <h2>{characterTitle(character)}</h2>
                  <p>{characterLine(character)}</p>
                  <p>{characterLevel(character)}</p>
                </div>
                <div className="library-page-actions character-library-card-actions">
                  <button type="button" onClick={() => id && navigate(`/characters/${id}`)} disabled={!id} className="library-page-card-open">
                    Open Sheet <ChevronRight size={16} />
                  </button>
                  <div className="library-page-card-secondary-actions">
                    <button type="button" onClick={() => id && navigate(`/characters/${id}/edit`)} disabled={!id}>
                      <Pencil size={15} /> Edit
                    </button>
                    <button type="button" onClick={() => duplicateCharacter(character)} disabled={!id || duplicating}>
                      <Copy size={15} /> {duplicating ? 'Duplicating...' : 'Duplicate'}
                    </button>
                    <button type="button" onClick={() => deleteCharacter(character)} disabled={!id || deleting} className="library-page-danger-button">
                      <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
