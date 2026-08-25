import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Copy, FileUp, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import '@/styles/libraryPages.css';
import './MyCharactersPage.css';

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

function characterSubclass(character) {
  const raw = character?.subclass || character?.subclass_name || character?.class_subclass || character?.archetype || '';
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  return raw?.name || raw?.title || '';
}

function characterLine(character) {
  const race = character?.race || character?.species || 'Unknown origin';
  return `${race} • ${classSummary(character)}`.replace(/\s+/g, ' ').trim();
}

function characterRules(character) {
  const raw = character?.ruleset_id || character?.edition || character?.rules_edition || '';
  if (String(raw).includes('2024')) return '2024 rules';
  if (String(raw).includes('2014')) return '2014 rules';
  return 'Playable sheet';
}

function formatDate(value) {
  if (!value) return 'Not updated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [duplicatingId, setDuplicatingId] = useState('');

  const sortedCharacters = useMemo(() => [...characters].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  )), [characters]);

  const loadCharacters = async ({ notifyFailure = true } = {}) => {
    try {
      const response = await apiClient.get('/characters');
      const records = Array.isArray(response.data) ? response.data : response.data?.characters || [];
      setCharacters(records.filter((item) => item && typeof item === 'object'));
      return { ok: true };
    } catch (error) {
      if (notifyFailure) {
        toast.error(error?.formattedDetail || error?.response?.data?.detail || 'Failed to load characters');
      }
      return { ok: false, error };
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
      const result = await loadCharacters();
      if (result.ok) toast.success('Characters refreshed');
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
        <section className="loading-screen library-page-branded-loading" role="status" aria-live="polite" aria-busy="true">
          <div className="loading-card">
            <div className="loading-spinner" aria-hidden="true" />
            <h1 className="loading-title">Opening characters…</h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="library-page characters-library-page characters-library-page--simple">
      <section className="library-page-hero characters-library-hero">
        <div>
          <p className="library-page-eyebrow">Characters</p>
          <h1>My Characters</h1>
          <p>{sortedCharacters.length} saved character{sortedCharacters.length === 1 ? '' : 's'}</p>
        </div>

        <div className="characters-library-actions" aria-label="Character actions">
          <Link to="/characters/new" className="library-page-button library-page-button-primary">
            <Plus size={16} />
            Create
          </Link>
          <Link to="/characters/import" className="library-page-button-secondary">
            <FileUp size={16} />
            Import
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="library-page-button-secondary library-page-loading-button"
            aria-busy={refreshing ? 'true' : 'false'}
          >
            <RefreshCw size={16} className={refreshing ? 'library-page-spin-icon' : undefined} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      {sortedCharacters.length === 0 ? (
        <section className="library-page-empty">
          <h2>No characters yet</h2>
          <p>Create your first character or import an existing one.</p>
          <div className="library-page-actions">
            <Link to="/characters/new" className="library-page-button library-page-button-primary">Create Character</Link>
            <Link to="/characters/import" className="library-page-button-secondary">Import</Link>
          </div>
        </section>
      ) : (
        <section className="library-card-grid characters-card-grid" aria-label="Saved characters">
          {sortedCharacters.map((character) => {
            const id = recordId(character);
            const subclass = characterSubclass(character);
            const duplicating = duplicatingId === id;
            const deleting = deletingId === id;
            return (
              <article key={id || characterTitle(character)} className="library-card character-library-card character-library-card--simple">
                <div className="character-card-main">
                  <div className="character-card-identity-row">
                    <h2>{characterTitle(character)}</h2>
                    <span className="character-card-level-badge">Level {character?.level || 1}</span>
                  </div>

                  <p className="character-card-primary-line">{characterLine(character)}</p>
                  {subclass && <p className="character-card-subclass-line">{subclass}</p>}

                  <p className="character-card-meta-line">
                    {characterRules(character)} • Updated {formatDate(character?.updated_at || character?.created_at)}
                  </p>
                </div>

                <div className="character-card-actions character-card-actions--simple">
                  <Link to={`/characters/${id}`} className="library-page-button library-page-button-primary character-card-open">
                    Open Sheet <ChevronRight size={16} />
                  </Link>
                  <Link to={`/characters/${id}/edit`} className="library-page-button-secondary character-card-edit">
                    <Pencil size={15} /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => duplicateCharacter(character)}
                    disabled={duplicating}
                    className="library-page-button-secondary character-card-icon-action library-page-loading-button"
                    aria-label={`Duplicate ${characterTitle(character)}`}
                    aria-busy={duplicating ? 'true' : 'false'}
                    title="Duplicate"
                  >
                    {duplicating ? <RefreshCw size={15} className="library-page-spin-icon" /> : <Copy size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCharacter(character)}
                    disabled={deleting}
                    className="library-page-button-secondary library-page-button-danger character-card-icon-action library-page-loading-button"
                    aria-label={`Delete ${characterTitle(character)}`}
                    aria-busy={deleting ? 'true' : 'false'}
                    title="Delete"
                  >
                    {deleting ? <RefreshCw size={15} className="library-page-spin-icon" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
