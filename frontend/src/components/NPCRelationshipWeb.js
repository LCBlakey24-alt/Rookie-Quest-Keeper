import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Heart, Link2, RefreshCw, Trash2, Users, Network } from 'lucide-react';
import './NPCRelationshipWeb.css';

export const RELATIONSHIP_TYPES = [
  { id: 'family', label: 'Family', color: '#D79C97' },
  { id: 'romantic', label: 'Romantic', color: '#C88BB6' },
  { id: 'ally', label: 'Ally', color: '#83B5A1' },
  { id: 'business', label: 'Business', color: '#D4B17C' },
  { id: 'political', label: 'Political', color: '#B3A1D0' },
  { id: 'rival', label: 'Rival', color: '#D49A76' },
  { id: 'enemy', label: 'Enemy', color: '#D47E7E' },
  { id: 'servant', label: 'Serves', color: '#93B4D0' },
  { id: 'neutral', label: 'Neutral', color: '#9CAAB7' },
  { id: 'unknown', label: 'Unknown', color: '#8993A0' },
  { id: 'parent', label: 'Parent / child', color: '#D79C97' },
  { id: 'sibling', label: 'Siblings', color: '#D79C97' },
  { id: 'spouse', label: 'Spouses', color: '#C88BB6' },
  { id: 'mentor', label: 'Mentor / student', color: '#83B5A1' },
  { id: 'friend', label: 'Friends', color: '#83B5A1' },
  { id: 'colleague', label: 'Colleagues', color: '#D4B17C' },
  { id: 'secret_ally', label: 'Secret allies', color: '#83B5A1' },
  { id: 'secret_enemy', label: 'Secret enemies', color: '#D47E7E' },
];
const EMPTY_FORM = { source_id: '', target_id: '', relationship_type: 'family', description: '' };
const relationStyle = type => RELATIONSHIP_TYPES.find(item => item.id === type) || RELATIONSHIP_TYPES[9];

export function relatedNpcIds(links, npcId) {
  return links.filter(link => link.source_id === npcId || link.target_id === npcId)
    .map(link => link.source_id === npcId ? link.target_id : link.source_id);
}

export function isDuplicateRelationship(links, from, to) {
  return links.some(link =>
    (link.source_id === from && link.target_id === to) ||
    (link.source_id === to && link.target_id === from));
}

function getApiError(error, fallback) {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

function layoutNodes(npcs) {
  const columns = 6;
  const stepX = 154;
  const stepY = 112;
  return Object.fromEntries(npcs.map((npc, i) => [npc.id, {
    x: 86 + (i % columns) * stepX,
    y: 70 + Math.floor(i / columns) * stepY,
  }]));
}

export default function NPCRelationshipWeb({ campaignId }) {
  const [npcs, setNpcs] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedNpcId, setSelectedNpcId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    setNpcs([]);
    setRelationships([]);
    setSearch('');
    setTypeFilter('all');
    setSelectedNpcId('');
    setForm(EMPTY_FORM);
    setLoadError('');
    setLoading(true);
    const load = async () => {
      try {
        const [npcResponse, relationResponse] = await Promise.all([
          apiClient.get(`/campaigns/${campaignId}/npcs`),
          apiClient.get(`/campaigns/${campaignId}/npc-relationships`),
        ]);
        if (cancelled) return;
        if (!Array.isArray(npcResponse.data) || !Array.isArray(relationResponse.data)) {
          throw new Error('Invalid relationship response');
        }
        setNpcs(npcResponse.data);
        setRelationships(relationResponse.data);
      } catch (error) {
        if (!cancelled) setLoadError(getApiError(error, 'Could not load saved relationships.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [campaignId, reloadKey]);

  const npcsById = useMemo(() => Object.fromEntries(npcs.map(npc => [npc.id, npc])), [npcs]);
  const validLinks = useMemo(() => relationships.filter(link =>
    npcsById[link.source_id] && npcsById[link.target_id]), [relationships, npcsById]);
  const filteredLinks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return validLinks.filter(link => (typeFilter === 'all' || link.relationship_type === typeFilter) &&
      (!term || [
      npcsById[link.source_id]?.name, npcsById[link.target_id]?.name,
      link.relationship_type, link.description,
    ].some(value => String(value || '').toLowerCase().includes(term))));
  }, [validLinks, npcsById, search, typeFilter]);
  const selectedNpc = npcsById[selectedNpcId];
  const selectedLinks = selectedNpcId ? validLinks.filter(link => link.source_id === selectedNpcId || link.target_id === selectedNpcId) : [];
  const relatedIds = selectedNpc ? relatedNpcIds(validLinks, selectedNpcId) : [];
  const positions = useMemo(() => layoutNodes(npcs), [npcs]);
  const svgHeight = Math.max(400, Math.ceil(npcs.length / 6) * 112 + 50);

  const createRelationship = async event => {
    event.preventDefault();
    if (busy) return;
    const { source_id, target_id, relationship_type, description } = form;
    if (!source_id || !target_id || source_id === target_id ||
        !npcsById[source_id] || !npcsById[target_id]) {
      toast.error('Choose two different NPCs from this campaign.');
      return;
    }
    if (isDuplicateRelationship(validLinks, source_id, target_id)) {
      toast.error('These two NPCs already have a relationship. Remove it first to change the type.');
      return;
    }
    setBusy(true);
    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/npc-relationships`, {
        source_id, target_id, relationship_type, description: description.trim(),
      });
      if (!response.data?.id) throw new Error('The save did not return a relationship ID.');
      setRelationships(previous => [...previous, response.data]);
      setForm(previous => ({ ...EMPTY_FORM, source_id: previous.source_id }));
      toast.success('Relationship saved to this campaign');
    } catch (error) {
      toast.error(getApiError(error, 'Relationship was NOT saved. Your existing connections are unchanged.'));
    } finally {
      setBusy(false);
    }
  };

  const removeRelationship = async link => {
    if (!window.confirm(
      `Remove the relationship between ${npcsById[link.source_id].name} and ${npcsById[link.target_id].name}? Neither NPC will be deleted.`
    )) return;
    setRemovingId(link.id);
    try {
      await apiClient.delete(`/campaigns/${campaignId}/npc-relationships/${link.id}`);
      setRelationships(previous => previous.filter(item => item.id !== link.id));
      toast.success('Relationship removed');
    } catch (error) {
      toast.error(getApiError(error, 'Relationship could not be removed. It is still saved.'));
    } finally {
      setRemovingId('');
    }
  };

  if (loading) {
    return <p role="status" className="rqk-rel-status">Loading the campaign NPC network…</p>;
  }
  if (loadError) {
    return <section role="alert" data-testid="npc-relationships-load-error" className="rqk-rel-status">
      <strong>Could not load the NPC relationship network</strong>
      <p>{loadError} This is a loading issue, not evidence that your data was deleted.</p>
      <button type="button" onClick={() => setReloadKey(value => value + 1)}>
        <RefreshCw size={16}/> Retry loading
      </button>
    </section>;
  }

  return <section className="rqk-rel-workspace" data-testid="npc-relationship-web">
    <header className="rqk-rel-heading">
      <div>
        <p className="rqk-rel-eyebrow"><Network size={16} /> GM network</p>
        <h2>NPC relationships</h2>
        <p>Every connection belongs to this campaign. Shared Tia-Karta people can have different stories in each party.</p>
      </div>
      <span className="rqk-rel-count">{validLinks.length} saved links</span>
    </header>

    <section className="rqk-rel-panel" aria-label="Create NPC relationship">
      <h3><Link2 size={17} /> Connect two NPCs</h3>
      <form className="rqk-rel-form" onSubmit={createRelationship}>
        <label>First NPC
          <select data-testid="relationship-source" value={form.source_id} onChange={event =>
            setForm(previous => ({ ...previous, source_id: event.target.value, target_id: '' }))}>
            <option value="">Choose NPC…</option>
            {npcs.map(npc => <option key={npc.id} value={npc.id}>{npc.name}</option>)}
          </select>
        </label>
        <label>Connection
          <select data-testid="relationship-type" value={form.relationship_type} onChange={event =>
            setForm(previous => ({ ...previous, relationship_type: event.target.value }))}>
            {RELATIONSHIP_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>
        <label>Second NPC
          <select data-testid="relationship-target" value={form.target_id} onChange={event =>
            setForm(previous => ({ ...previous, target_id: event.target.value }))}>
            <option value="">Choose NPC…</option>
            {npcs.filter(npc => npc.id !== form.source_id).map(npc =>
              <option key={npc.id} value={npc.id}>{npc.name}</option>)}
          </select>
        </label>
        <label className="rqk-rel-form-notes">How are they connected?
          <input data-testid="relationship-description" value={form.description}
            placeholder="e.g. Mara is Godfrey's mother"
            onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))}/>
        </label>
        <button type="submit" className="rqk-rel-submit" disabled={busy || !form.source_id || !form.target_id}>
          <Link2 size={16} /> {busy ? 'Saving…' : 'Save relationship'}
        </button>
      </form>
    </section>

    <section className="rqk-rel-panel" aria-label="Saved NPC connections">
      <div className="rqk-rel-list-heading">
        <h3><Heart size={17}/> Saved connections</h3>
        <input aria-label="Search NPC relationships" placeholder="Search people or relationship notes…"
          value={search} onChange={event => setSearch(event.target.value)}/>
        <select aria-label="Filter relationship type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
          <option value="all">All connection types</option>
          {RELATIONSHIP_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
      </div>
      {filteredLinks.length === 0 ? (
        <p className="rqk-rel-empty">{validLinks.length ? 'No connections match your search.' :
          'No relationships recorded yet. Use the form above to connect established NPCs.'}</p>
      ) : <div className="rqk-rel-list" data-testid="npc-relationship-list">
        {filteredLinks.map(link => {
          const type = relationStyle(link.relationship_type);
          return <article className="rqk-rel-entry" key={link.id}>
            <div className="rqk-rel-entry-copy">
              <div className="rqk-rel-entry-names">
                <button type="button" onClick={() => setSelectedNpcId(link.source_id)}>{npcsById[link.source_id].name}</button>
                <span className="rqk-rel-type" style={{ borderColor: type.color, color: type.color }}>{type.label}</span>
                <button type="button" onClick={() => setSelectedNpcId(link.target_id)}>{npcsById[link.target_id].name}</button>
              </div>
              {link.description && <p>{link.description}</p>}
            </div>
            <button type="button" className="rqk-rel-remove" disabled={removingId === link.id}
              aria-label={`Remove relationship between ${npcsById[link.source_id].name} and ${npcsById[link.target_id].name}`}
              onClick={() => removeRelationship(link)}><Trash2 size={15} /> Remove</button>
          </article>;
        })}
      </div>}
    </section>

    <section className="rqk-rel-panel rqk-rel-graph-panel" aria-label="Visual NPC relationship map">
      <h3><Users size={17}/> Relationship map</h3>
      <p>Select an NPC to highlight their connections. The list above works on mobile and with a keyboard.</p>
      {npcs.length ? <div className="rqk-rel-graph-scroller">
        <svg viewBox={`0 0 1000 ${svgHeight}`} aria-label="NPC network diagram">
          {validLinks.map(link => {
            const from = positions[link.source_id], to = positions[link.target_id];
            const type = relationStyle(link.relationship_type);
            return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={type.color} strokeWidth={selectedNpcId && (link.source_id === selectedNpcId || link.target_id === selectedNpcId) ? 3 : 1.4}
              opacity={selectedNpcId && link.source_id !== selectedNpcId && link.target_id !== selectedNpcId ? 0.18 : 0.7}/>;
          })}
          {npcs.map(npc => {
            const point = positions[npc.id];
            const selected = npc.id === selectedNpcId;
            const highlighted = !selectedNpcId || selected || relatedIds.includes(npc.id);
            return <g key={npc.id} role="button" tabIndex={0}
              aria-label={`Show connections for ${npc.name}`}
              onClick={() => setSelectedNpcId(npc.id)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedNpcId(npc.id); } }}
              style={{ cursor: 'pointer', opacity: highlighted ? 1 : 0.36 }}>
              <rect x={point.x - 70} y={point.y - 28} width={140} height={55} rx={8}
                fill={selected ? '#344753' : '#142938'} stroke={selected ? '#E1BF85' : '#455968'} strokeWidth={selected ? 2.5 : 1}/>
              <text x={point.x} y={point.y - 5} textAnchor="middle" fill="#F2E5CD" fontSize={11.5} fontWeight="600">
                {String(npc.name).length > 19 ? String(npc.name).slice(0, 17) + '…' : npc.name}
              </text>
              <text x={point.x} y={point.y + 12} textAnchor="middle" fill="#BCA77F" fontSize={10}>
                {relatedNpcIds(validLinks, npc.id).length} links
              </text>
            </g>;
          })}
        </svg>
      </div> : <p>No NPCs have been added to this campaign yet.</p>}
      {selectedNpc && <div className="rqk-rel-selected" data-testid="selected-npc-relationships">
        <strong>{selectedNpc.name}</strong> · {relatedIds.length} connections
        {selectedLinks.length ? <ul className="rqk-rel-selected-links">
          {selectedLinks.map(link => {
            const otherId = link.source_id === selectedNpcId ? link.target_id : link.source_id;
            return <li key={link.id}>
              <strong>{npcsById[otherId]?.name}</strong> — {relationStyle(link.relationship_type).label}
              {link.description ? <span> · {link.description}</span> : null}
            </li>;
          })}
        </ul> : <p>No links recorded for this NPC yet.</p>}
        <button type="button" onClick={() => {
          setForm(previous => ({ ...previous, source_id: selectedNpc.id, target_id: '' }));
          window.scrollTo?.({ top: 0, behavior: 'smooth' });
        }}>Create a connection for {selectedNpc.name}</button>
      </div>}
    </section>
  </section>;
}
