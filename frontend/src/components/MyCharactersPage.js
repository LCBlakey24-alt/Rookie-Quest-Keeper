import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import '@/styles/libraryPages.css';

function recordId(record) {
  return record?.id || record?._id || record?.character_id || record?.characterId || '';
}

function characterTitle(character) {
  return character?.name || character?.character_name || 'Unnamed Character';
}

function characterMeta(character) {
  const level = character?.level || 1;
  const race = character?.race || character?.species || '';
  const className = character?.character_class || character?.class_name || character?.class || 'Adventurer';
  return `Level ${level} ${race} ${className}`.replace(/\s+/g, ' ').trim();
}

export default function MyCharactersPage() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    <main className="library-page">
      <section className="library-page-hero">
        <div>
          <p className="library-page-eyebrow">My Characters</p>
          <h1>Your created characters.</h1>
          <p>Every character you have made, ready to open, edit, or use in a campaign.</p>
        </div>
        <Link to="/characters/new" className="library-page-button">
          <Plus size={16} />
          Create Character
        </Link>
      </section>

      <section className="library-page-toolbar" aria-label="Character library tools">
        <p className="library-page-count">
          {sortedCharacters.length} character{sortedCharacters.length === 1 ? '' : 's'} saved
        </p>
        <button type="button" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {sortedCharacters.length === 0 ? (
        <section className="library-page-empty">
          <h2>No characters yet</h2>
          <p>Create one with Full Creator, Basic Creator, or Rook Character Matchmaker.</p>
          <div className="library-page-actions">
            <Link to="/characters/new" className="library-page-button">Create Character</Link>
          </div>
        </section>
      ) : (
        <section className="library-page-grid" aria-label="Saved characters">
          {sortedCharacters.map((character, index) => {
            const id = recordId(character);

            return (
              <article key={id || `character-${index}`} className="library-page-card">
                <div>
                  <p className="library-page-card-meta">Character</p>
                  <h2>{characterTitle(character)}</h2>
                  <p>{characterMeta(character)}</p>
                </div>
                <div className="library-page-actions">
                  <button type="button" onClick={() => id && navigate(`/characters/${id}`)} disabled={!id}>
                    Open Sheet <ChevronRight size={16} />
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
