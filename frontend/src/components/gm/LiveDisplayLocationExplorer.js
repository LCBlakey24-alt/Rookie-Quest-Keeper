import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Globe, Image as ImageIcon, MapPin, RefreshCw, Send, Store, Users } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const arr = value => Array.isArray(value) ? value : [];
const nameOf = (item, fallback = 'Unnamed location') => String(item?.name || item?.title || fallback);
const imageOf = item => item?.image_url || item?.map_url || item?.imageUrl || item?.portrait_url || item?.image_data || '';
const typeText = value => String(value || 'Location').replace(/[_-]/g, ' ');

function placeNode(place, prefix, index) {
  return {
    key: prefix + ':place:' + String(place?.id || index),
    name: nameOf(place, 'Place of Interest'),
    kind: 'place', type: place?.place_type || 'other',
    description: place?.description || '',
    data: place || {}, children: [],
  };
}

function worldNode(item, kind, prefix, index) {
  const key = prefix + ':' + kind + ':' + String(item?.id || index);
  const children = kind === 'continent'
    ? arr(item?.regions).map((value, i) => worldNode(value, 'region', key, i))
    : kind === 'region'
      ? arr(item?.settlements).map((value, i) => worldNode(value, 'settlement', key, i))
      : kind === 'settlement'
        ? arr(item?.places).map((value, i) => placeNode(value, key, i))
        : [];
  return { key, name: nameOf(item), kind, type: item?.[kind + '_type'] || kind,
    description: item?.description || '', data: item || {}, children };
}

/** The two existing campaign data collections must not be merged by name. */
export function buildDisplayLocationTree(world = {}, locations = []) {
  const continents = arr(world?.continents).map((value, i) => worldNode(value, 'continent', 'world', i));
  const saved = arr(locations).map((value, i) => ({
    key: 'saved-location:' + String(value?.id || i), kind: 'location',
    name: nameOf(value), type: value?.location_type || 'location',
    description: value?.description || '', data: value || {},
    children: arr(value?.places_of_interest).map((place, n) => placeNode(place, 'saved-location:' + String(value?.id || i), n)),
  }));
  return [
    ...(continents.length ? [{ key: 'world-root', name: 'World Builder', kind: 'folder', children: continents }] : []),
    ...(saved.length ? [{ key: 'saved-root', name: 'Saved Locations', kind: 'folder', children: saved }] : []),
  ];
}

function atPath(tree, path) {
  let children = tree;
  let current = null;
  const crumbs = [];
  for (const key of path) {
    current = children.find(node => node.key === key) || null;
    if (!current) return { current: null, children: tree, crumbs: [] };
    crumbs.push(current);
    children = current.children || [];
  }
  return { current, children, crumbs };
}

const shopTypes = new Set(['shop', 'blacksmith', 'tavern', 'inn', 'market', 'store', 'merchant']);
function relatedNpcs(node, npcs) {
  if (!node || node.kind === 'folder') return [];
  const id = String(node.data?.id || '');
  const name = node.name.toLowerCase();
  const owner = String(node.data?.owner || '').toLowerCase();
  return arr(npcs).filter(npc =>
    (id && [npc?.location_id, npc?.settlement_id, npc?.place_id].some(value => String(value || '') === id))
    || (npc?.location && String(npc.location).toLowerCase() === name)
    || (owner && String(npc?.name || '').toLowerCase() === owner));
}

const box = { display: 'grid', gap: 12, padding: 12, background: 'var(--rq-bg-panel,#102237)', border: '1px solid var(--rq-border-default,#294156)' };
const tile = { display: 'flex', alignItems: 'center', gap: 10, padding: 12, textAlign: 'left', color: 'var(--rq-text-primary,#fff)', background: 'var(--rq-card,#182e45)', border: '1px solid var(--rq-border-default,#294156)', cursor: 'pointer', minHeight: 46 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,205px),1fr))', gap: 8 };
const action = { ...tile, minHeight: 36, padding: '6px 10px', borderBottom: '3px solid var(--rq-accent-primary,#e3753a)', fontWeight: 800, fontSize: 12 };
const label = { display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 8px', fontSize: 14 };
const section = { background: 'var(--rq-bg-main,#091b2c)', border: '1px solid var(--rq-border-default,#294156)', padding: 12 };

export default function LiveDisplayLocationExplorer({ campaignId, maps = [], npcs = [], onRevealScene, onRevealImage, onRevealNpcs }) {
  const [world, setWorld] = useState({ continents: [] });
  const [locations, setLocations] = useState([]);
  const [path, setPath] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [warning, setWarning] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setWorld({ continents: [] });
    setLocations([]);
    setPath([]);
    setWarning('');
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      apiClient.get('/campaigns/' + campaignId + '/world'),
      apiClient.get('/campaigns/' + campaignId + '/locations'),
    ]).then(([treeResult, locationResult]) => {
      if (cancelled) return;
      const failed = [];
      if (treeResult.status === 'fulfilled') {
        const data = treeResult.value?.data;
        setWorld(data && !Array.isArray(data) ? data : { continents: [] });
      } else failed.push('World Builder');
      if (locationResult.status === 'fulfilled') setLocations(arr(locationResult.value?.data));
      else failed.push('Locations');
      setWarning(failed.length ? 'Unable to refresh ' + failed.join(' and ') + '. Previously loaded locations have been kept.' : '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [campaignId, refresh]);

  const tree = useMemo(() => buildDisplayLocationTree(world, locations), [world, locations]);
  const { current, children, crumbs } = useMemo(() => atPath(tree, path), [tree, path]);
  const people = useMemo(() => relatedNpcs(current, npcs), [current, npcs]);
  const images = useMemo(() => [...new Set([
    imageOf(current?.data),
    ...arr(current?.data?.gallery || current?.data?.images).map(value => typeof value === 'string' ? value : imageOf(value)),
  ].filter(Boolean))], [current]);
  const stock = arr(current?.data?.shop_inventory).filter(row => row && row.name);
  const isShop = shopTypes.has(String(current?.type || '').toLowerCase());

  return <section style={box} data-testid="live-location-explorer">
    <header style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <div>
        <h3 style={label}><Globe size={19} /> Locations</h3>
        <p style={{ margin: 0, fontSize: 12, opacity: .8 }}>Explore one level at a time. Only items you explicitly reveal go to players.</p>
      </div>
      <button type="button" style={action} disabled={loading} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={14} /> Refresh Locations</button>
    </header>
    {warning && <p role="status" style={{ borderLeft: '3px solid orange', padding: 8, margin: 0 }}>{warning}</p>}
    <nav aria-label="Location breadcrumbs" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
      {path.length > 0 && <button type="button" style={tile} aria-label="Back one location" onClick={() => setPath(prev => prev.slice(0, -1))}><ArrowLeft size={16}/></button>}
      <button type="button" onClick={() => setPath([])} style={tile} aria-current={!path.length ? 'page' : undefined}>World</button>
      {crumbs.map((node, index) => <React.Fragment key={node.key}>
        <ChevronRight size={12} />
        <button type="button" onClick={() => setPath(prev => prev.slice(0, index + 1))} style={tile} aria-current={index === path.length - 1 ? 'page' : undefined}>{node.name}</button>
      </React.Fragment>)}
    </nav>

    {!current && <section style={section}>
      <h4 style={label}><ImageIcon size={15}/> World maps</h4>
      <div style={grid}>
        {arr(maps).filter(map => imageOf(map)).map((map, index) =>
          <button key={String(map.id || index)} type="button" style={tile} onClick={() => onRevealImage?.(imageOf(map), nameOf(map, 'Map'))}><ImageIcon size={15}/><span style={{ flex: 1 }}>{nameOf(map, 'Map')}</span><Send size={14}/></button>)}
      </div>
      {!arr(maps).some(map => imageOf(map)) && <p style={{ fontSize: 12, opacity: .75 }}>No map images saved yet.</p>}
    </section>}

    <div style={grid}>
      {children.map(node => <button type="button" key={node.key} style={tile} onClick={() => setPath(prev => [...prev, node.key])}>
        {node.kind === 'place' ? <Store size={18}/> : <MapPin size={18}/>}
        <span style={{ display: 'grid', gap: 3, flex: 1, minWidth: 0 }}><strong>{node.name}</strong><small style={{ opacity: .75, textTransform: 'capitalize' }}>{typeText(node.type || node.kind)}{node.children?.length ? ' · ' + node.children.length + ' inside' : ''}</small></span>
        <ChevronRight size={15}/>
      </button>)}
    </div>
    {loading && !tree.length && <p role="status">Loading world locations…</p>}
    {!loading && !tree.length && <p>No saved locations yet. Add them in campaign World Builder or Locations.</p>}

    {current && current.kind !== 'folder' && <article style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><small style={{ textTransform: 'capitalize', opacity: .7 }}>{typeText(current.type)}</small><h4 style={{ margin: '2px 0 6px', fontSize: 20 }}>{current.name}</h4>{current.description && <p style={{ margin: 0, fontSize: 13 }}>{current.description}</p>}</div>
        <button type="button" style={action} onClick={() => onRevealScene?.({ name: current.name, type: current.type, description: current.description })}><Send size={14}/> Reveal Location</button>
      </div>

      {images.length > 0 && <section style={section}>
        <h5 style={label}><ImageIcon size={14}/> Images</h5>
        <div style={grid}>{images.map((src, i) => <button key={src} type="button" style={{ ...tile, display: 'grid' }} onClick={() => onRevealImage?.(src, current.name)} aria-label={'Reveal ' + current.name + ' image ' + (i + 1)}>
          <img src={src} alt="" style={{ width: '100%', height: 90, objectFit: 'cover' }}/>Reveal image
        </button>)}</div>
      </section>}

      {(isShop || stock.length > 0) && <section style={section} data-testid="location-shop-catalog">
        <h5 style={label}><Store size={14}/> Items & Prices</h5>
        {stock.length > 0 ? stock.map((item, i) => <div key={String(item.id || i)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid var(--rq-border-default,#294156)', justifyContent: 'space-between' }}>
          <strong>{String(item.name)}</strong><span>{String(item.price || 'Price not set')}</span>{item.quantity !== undefined && <small>{Number(item.quantity) === 0 ? 'Out of stock' : 'Stock: ' + String(item.quantity)}</small>}
        </div>) : <p>No prices have been entered for this shop. Shop inventory can be added through campaign editing.</p>}
      </section>}

      {people.length > 0 && <section style={section} data-testid="location-linked-npcs">
        <h5 style={label}><Users size={14}/> NPCs</h5>
        <div style={grid}>{people.map((npc, index) => <div key={String(npc.id || index)} style={{ ...tile, display: 'grid' }}>
          {imageOf(npc) && <img src={imageOf(npc)} alt="" style={{ width: '100%', height: 95, objectFit: 'cover' }}/>}
          <strong>{nameOf(npc, 'NPC')}</strong><button type="button" style={action} onClick={() => onRevealNpcs?.([npc])}>Reveal NPC</button>
        </div>)}</div>
      </section>}

      {current.data?.services && <p style={{ fontSize: 13, margin: 0 }}><strong>Services:</strong> {current.data.services}</p>}
      {current.data?.notes && <details style={section}><summary>GM-only notes</summary><p>{current.data.notes}</p></details>}
    </article>}
  </section>;
}
