import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Heart, Link2, RefreshCw, Trash2, Users, Network, Pencil, X } from 'lucide-react';
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
/** Some relationships have direction; source NPC is the parent, mentor or
 * person serving the second NPC. Neutral and mutual links have no arrow. */
export const isDirectionalNpcRelationship = type => ['parent', 'mentor', 'servant'].includes(type);

/** Show a relationship from the selected NPC's point of view.
 * The saved link's source/target direction matters for parents and mentors.
 * Descriptions remain authoritative; this only improves the label in the UI.
 */
export function npcRelationshipPerspective(link, focusId) {
  const source = link?.source_id === focusId;
  switch (link?.relationship_type) {
    case 'parent': return source ? 'Parent of' : 'Child of';
    case 'mentor': return source ? 'Mentor of' : 'Student of';
    case 'servant': return source ? 'Serves' : 'Served by';
    case 'sibling': return 'Sibling of';
    case 'spouse': return 'Spouse of';
    case 'friend': return 'Friend of';
    case 'secret_ally': return 'Secret ally of';
    case 'secret_enemy': return 'Secret enemy of';
    default: return RELATIONSHIP_TYPES.find(type => type.id === link?.relationship_type)?.label || 'Connected to';
  }
}

export function relatedNpcIds(links, npcId) {
  return links.filter(link => link.source_id === npcId || link.target_id === npcId)
    .map(link => link.source_id === npcId ? link.target_id : link.source_id);
}

export function isDuplicateRelationship(links, from, to, exceptId = null) {
  return links.some(link => link.id !== exceptId && (
    (link.source_id === from && link.target_id === to) ||
    (link.source_id === to && link.target_id === from)));
}

/** A narrow phone-friendly map: one focal NPC and its immediate connections. */
export function focusedRelationshipLayout(npcs, links, focusId) {
  if (!focusId || !npcs.some(npc => npc.id === focusId)) return { positions: {}, ids: [], height: 310 };
  const neighbours = [...new Set(relatedNpcIds(links, focusId))]
    .filter(id => npcs.some(npc => npc.id === id))
    .sort((a, b) => String(npcs.find(n => n.id === a)?.name).localeCompare(String(npcs.find(n => n.id === b)?.name)));
  const positions = { [focusId]: { x: 195, y: 70 } };
  neighbours.forEach((id, index) => {
    positions[id] = { x: index % 2 === 0 ? 100 : 290, y: 210 + Math.floor(index / 2) * 125 };
  });
  return {
    ids: [focusId, ...neighbours],
    positions,
    height: Math.max(310, 270 + Math.ceil(neighbours.length / 2) * 125),
  };
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
  const [graphMode, setGraphMode] = useState('focus');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingLinkId, setEditingLinkId] = useState('');
  const formSectionRef = useRef(null);
  const activeCampaignRef = useRef(campaignId);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState('');

  useEffect(() => {
    activeCampaignRef.current = campaignId;
    let cancelled = false;
    setNpcs([]);
    setRelationships([]);
    setSearch('');
    setTypeFilter('all');
    setSelectedNpcId('');
    setGraphMode('focus');
    setEditingLinkId('');
    setBusy(false);
    setRemovingId('');
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
  const focusNpcId = selectedNpcId || validLinks[0]?.source_id || npcs[0]?.id || '';
  const selectedNpc = npcsById[focusNpcId];
  const selectedLinks = focusNpcId ? validLinks.filter(link => link.source_id === focusNpcId || link.target_id === focusNpcId) : [];
  const relatedIds = selectedNpc ? relatedNpcIds(validLinks, focusNpcId) : [];
  const focusLayout = useMemo(() => focusedRelationshipLayout(npcs, validLinks, focusNpcId),
    [npcs, validLinks, focusNpcId]);
  const allPositions = useMemo(() => layoutNodes(npcs), [npcs]);
  const focusMode = graphMode === 'focus';
  const positions = focusMode ? focusLayout.positions : allPositions;
  const visibleNodes = focusMode ? npcs.filter(npc => focusLayout.ids.includes(npc.id)) : npcs;
  const visibleLines = focusMode ? selectedLinks : validLinks;
  const svgHeight = focusMode ? focusLayout.height : Math.max(400, Math.ceil(npcs.length / 6) * 112 + 50);

  const beginEdit = link => {
    setEditingLinkId(link.id);
    setForm({
      source_id: link.source_id,
      target_id: link.target_id,
      relationship_type: link.relationship_type,
      description: link.description || '',
    });
    formSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingLinkId('');
    setForm(EMPTY_FORM);
  };

  const saveRelationship = async event => {
    event.preventDefault();
    if (busy) return;
    const requestedCampaign = campaignId;
    const { source_id, target_id, relationship_type, description } = form;
    if (!source_id || !target_id || source_id === target_id ||
        !npcsById[source_id] || !npcsById[target_id]) {
      toast.error('Choose two different NPCs from this campaign.');
      return;
    }
    if (isDuplicateRelationship(validLinks, source_id, target_id, editingLinkId || null)) {
      toast.error('These two NPCs already have a relationship. Edit that saved link instead.');
      return;
    }
    setBusy(true);
    try {
      const endpoint = `/campaigns/${requestedCampaign}/npc-relationships`;
      const payload = { source_id, target_id, relationship_type, description: description.trim() };
      const response = editingLinkId
        ? await apiClient.put(`${endpoint}/${editingLinkId}`, payload)
        : await apiClient.post(endpoint, payload);
      if (!response.data?.id) throw new Error('The save did not return a relationship ID.');
      if (activeCampaignRef.current !== requestedCampaign) return;
      if (editingLinkId) {
        setRelationships(previous => previous.map(link =>
          link.id === response.data.id ? response.data : link));
      } else {
        setRelationships(previous => [...previous, response.data]);
      }
      setEditingLinkId('');
      setForm(EMPTY_FORM);
      toast.success('Relationship saved to this campaign');
    } catch (error) {
      if (activeCampaignRef.current === requestedCampaign) {
        toast.error(getApiError(error, 'Relationship was NOT saved. Your existing connections are unchanged.'));
      }
    } finally {
      if (activeCampaignRef.current === requestedCampaign) setBusy(false);
    }
  };

  const removeRelationship = async link => {
    if (!window.confirm(
      `Remove the relationship between ${npcsById[link.source_id].name} and ${npcsById[link.target_id].name}? Neither NPC will be deleted.`
    )) return;
    const requestedCampaign = campaignId;
    setRemovingId(link.id);
    try {
      await apiClient.delete(`/campaigns/${requestedCampaign}/npc-relationships/${link.id}`);
      if (activeCampaignRef.current !== requestedCampaign) return;
      setRelationships(previous => previous.filter(item => item.id !== link.id));
      if (editingLinkId === link.id) cancelEdit();
      toast.success('Relationship removed');
    } catch (error) {
      if (activeCampaignRef.current === requestedCampaign)
        toast.error(getApiError(error, 'Relationship could not be removed. It is still saved.'));
    } finally {
      if (activeCampaignRef.current === requestedCampaign) setRemovingId('');
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
      <div className="rqk-rel-heading-actions">
        <span className="rqk-rel-count">{validLinks.length} saved links</span>
        <button type="button" className="rqk-rel-add-link" onClick={() =>
          formSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })}>
          <Link2 size={16} aria-hidden="true" /> Add connection
        </button>
      </div>
    </header>

    <section className="rqk-rel-panel rqk-rel-graph-panel" aria-label="Visual NPC relationship map">
      <h3><Users size={17}/> Relationship map</h3>
      <p>Explore one NPC's connections on your phone, or switch to the full network. Select any node to focus on that person.</p>
      <div className="rqk-rel-graph-controls">
        <label>Focus on NPC
          <select aria-label="Focus relationship map on NPC" value={focusNpcId}
            onChange={event => { setSelectedNpcId(event.target.value); setGraphMode('focus'); }}>
            {npcs.map(npc => <option key={npc.id} value={npc.id}>{npc.name}</option>)}
          </select>
        </label>
        <div className="rqk-rel-graph-modes" role="group" aria-label="Network view">
          <button type="button" aria-pressed={focusMode} onClick={() => setGraphMode('focus')}>Focused view</button>
          <button type="button" aria-pressed={!focusMode} onClick={() => setGraphMode('all')}>Whole network</button>
        </div>
      </div>
      <div className="rqk-rel-network-legend" aria-label="Relationship line guide">
        <span><i className="rqk-rel-line-swatch rqk-rel-line-swatch--family"/> Family</span>
        <span><i className="rqk-rel-line-swatch rqk-rel-line-swatch--ally"/> Ally / friend</span>
        <span><i className="rqk-rel-line-swatch rqk-rel-line-swatch--enemy"/> Rival / enemy</span>
        <span><i className="rqk-rel-line-swatch rqk-rel-line-swatch--secret"/> Secret connection</span>
        <span><i className="rqk-rel-arrow-swatch" aria-hidden="true">→</i> Directional: parent, mentor, serves</span>
      </div>
      {npcs.length ? <div className={`rqk-rel-graph-scroller ${focusMode ? 'rqk-rel-graph-scroller--focus' : 'rqk-rel-graph-scroller--all'}`}>
        <svg viewBox={`0 0 ${focusMode ? 390 : 1000} ${svgHeight}`}
          role="group" aria-label={focusMode ? `Relationship network focused on ${selectedNpc?.name || 'NPC'}` : 'Complete campaign NPC network'}>
          <defs>
            <marker id="rqk-npc-directed-arrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="8" markerHeight="8" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#D9BC82"/>
            </marker>
          </defs>
          {visibleLines.map(link => {
            const from = positions[link.source_id], to = positions[link.target_id];
            if (!from || !to) return null;
            const type = relationStyle(link.relationship_type);
            const secret = String(link.relationship_type).startsWith('secret_');
            const highlighted = link.source_id === focusNpcId || link.target_id === focusNpcId;
            const directional = isDirectionalNpcRelationship(link.relationship_type);
            // Stop arrows on the target card edge, not underneath its label.
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const edgeScale = Math.max(Math.abs(dx) / 70, Math.abs(dy) / 28, 1);
            const endX = directional ? to.x - dx / edgeScale : to.x;
            const endY = directional ? to.y - dy / edgeScale : to.y;
            const title = `${npcsById[link.source_id].name} — ${type.label} — ${npcsById[link.target_id].name}`;
            return <g key={link.id}>
              <line x1={from.x} y1={from.y} x2={endX} y2={endY}
                stroke={type.color} strokeWidth={highlighted ? 3.4 : 2}
                markerEnd={directional ? 'url(#rqk-npc-directed-arrow)' : undefined}
                strokeDasharray={secret ? '7 6' : undefined}
                opacity={focusMode || highlighted ? 0.9 : 0.42}>
                <title>{title}</title>
              </line>
              {focusMode && <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8}
                textAnchor="middle" fill={type.color} fontSize="11" fontWeight="750"
                paintOrder="stroke" stroke="#091b2a" strokeWidth="4">
                {type.label}
              </text>}
            </g>;
          })}
          {visibleNodes.map(npc => {
            const point = positions[npc.id];
            if (!point) return null;
            const selected = npc.id === focusNpcId;
            const highlighted = focusMode || !focusNpcId || selected || relatedIds.includes(npc.id);
            return <g key={npc.id} role="button" tabIndex={0}
              aria-label={`Show connections for ${npc.name}`}
              onClick={() => { setSelectedNpcId(npc.id); setGraphMode('focus'); }}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault(); setSelectedNpcId(npc.id); setGraphMode('focus');
              } }}
              style={{ cursor: 'pointer', opacity: highlighted ? 1 : 0.35 }}>
              <rect x={point.x - 70} y={point.y - 28} width="140" height="56" rx="8"
                fill={selected ? '#344753' : '#142938'}
                stroke={selected ? '#E1BF85' : '#455968'} strokeWidth={selected ? 2.7 : 1.4}/>
              <text x={point.x} y={point.y - 5} textAnchor="middle" fill="#F2E5CD" fontSize="11.5" fontWeight="700">
                {String(npc.name).length > 19 ? String(npc.name).slice(0, 17) + '…' : npc.name}
              </text>
              <text x={point.x} y={point.y + 13} textAnchor="middle" fill="#BCA77F" fontSize="10">
                {relatedNpcIds(validLinks, npc.id).length} connections
              </text>
            </g>;
          })}
        </svg>
      </div> : <p>No NPCs have been added to this campaign yet.</p>}
      {selectedNpc && <div className="rqk-rel-selected" data-testid="selected-npc-relationships">
        <strong>{selectedNpc.name}</strong> · {relatedIds.length} connections
        {selectedLinks.length ? <ul className="rqk-rel-selected-links">
          {selectedLinks.map(link => {
            const otherId = link.source_id === focusNpcId ? link.target_id : link.source_id;
            return <li key={link.id}>
              <span className="rqk-rel-selected-links__type">{npcRelationshipPerspective(link, focusNpcId)}</span>
              <strong>{npcsById[otherId]?.name}</strong>
              {link.description ? <span className="rqk-rel-selected-links__description">{link.description}</span> : null}
            </li>;
          })}
        </ul> : <p>No links recorded for this NPC yet.</p>}
        <button type="button" onClick={() => {
          setEditingLinkId('');
          setForm(previous => ({ ...EMPTY_FORM, source_id: selectedNpc.id }));
          formSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        }}>Create a connection for {selectedNpc.name}</button>
      </div>}
    </section>
    <section className="rqk-rel-panel rqk-rel-saved-panel" aria-label="Saved NPC connections">
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
            <div className="rqk-rel-entry-actions">
              <button type="button" className="rqk-rel-edit" disabled={busy || removingId === link.id}
                aria-label={`Edit relationship between ${npcsById[link.source_id].name} and ${npcsById[link.target_id].name}`}
                onClick={() => beginEdit(link)}><Pencil size={15}/> Edit</button>
              <button type="button" className="rqk-rel-remove" disabled={removingId === link.id || busy}
                aria-label={`Remove relationship between ${npcsById[link.source_id].name} and ${npcsById[link.target_id].name}`}
                onClick={() => removeRelationship(link)}><Trash2 size={15} /> Remove</button>
            </div>
          </article>;
        })}
      </div>}
    </section>

    <section ref={formSectionRef} className="rqk-rel-panel rqk-rel-create-panel" aria-label={editingLinkId ? 'Edit NPC relationship' : 'Create NPC relationship'}>
      <h3><Link2 size={17} /> {editingLinkId ? 'Edit NPC relationship' : 'Connect two NPCs'}</h3>
      <p className="rqk-rel-help">For directional connections, put the parent, mentor or leader first.</p>
      <form className="rqk-rel-form" onSubmit={saveRelationship}>
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
        <div className="rqk-rel-form-actions">
          <button type="submit" className="rqk-rel-submit" disabled={busy || !form.source_id || !form.target_id}>
            <Link2 size={16} /> {busy ? 'Saving…' : editingLinkId ? 'Save changes' : 'Save relationship'}
          </button>
          {editingLinkId && <button type="button" className="rqk-rel-cancel" onClick={cancelEdit} disabled={busy}>
            <X size={16}/> Cancel edit
          </button>}
        </div>
      </form>
    </section>

  </section>;
}
