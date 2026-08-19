import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Grid, Map, MapPin, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

const rq = {
  bg: '#242424', panel: '#2f2f2f', card: '#3a3a3a', red: '#d00000',
  text: '#ffffff', soft: 'rgba(255,255,255,0.74)', muted: 'rgba(255,255,255,0.58)', line: 'rgba(255,255,255,0.16)',
};
const safeArray = value => Array.isArray(value) ? value : [];
const norm = value => String(value || '').trim().toLowerCase();

export default function LiveMapsPanel({ campaignId }) {
  const [locations, setLocations] = useState([]);
  const [maps, setMaps] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedLocationId, setExpandedLocationId] = useState('');
  const [focusedLocation, setFocusedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [locationRes, mapRes] = await Promise.all([
          apiClient.get(`/campaigns/${campaignId}/locations`).catch(() => ({ data: [] })),
          apiClient.get(`/campaigns/${campaignId}/maps`).catch(() => ({ data: [] })),
        ]);
        const loadedLocations = safeArray(locationRes.data);
        setLocations(loadedLocations);
        setMaps(safeArray(mapRes.data));

        try {
          const raw = localStorage.getItem(`gm.liveLocationFocus.${campaignId}`);
          if (raw) {
            const focus = JSON.parse(raw);
            localStorage.removeItem(`gm.liveLocationFocus.${campaignId}`);
            const match = loadedLocations.find(item => (focus.id && item.id === focus.id) || (focus.name && norm(item.name) === norm(focus.name)));
            if (match) {
              setFocusedLocation(match);
              setExpandedLocationId(match.id);
            } else if (focus.name) {
              setSearch(focus.name);
            }
          }
        } catch { /* ignore */ }
      } catch (error) {
        toast.error(error?.response?.data?.detail || 'Could not load live maps');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaignId]);

  const filteredLocations = useMemo(() => {
    const term = norm(search);
    const sorted = [...locations].sort((a, b) => {
      if (focusedLocation?.id === a.id) return -1;
      if (focusedLocation?.id === b.id) return 1;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    if (!term) return sorted;
    return sorted.filter(item => [item.name, item.location_type, item.type, item.description, item.notes].some(value => norm(value).includes(term)));
  }, [focusedLocation, locations, search]);

  const filteredMaps = useMemo(() => {
    const term = norm(search);
    if (!term) return maps;
    return maps.filter(item => [item.name, item.description].some(value => norm(value).includes(term)));
  }, [maps, search]);

  const quickNote = location => {
    try { localStorage.setItem(`gm.liveNotePrefill.${campaignId}`, `${location.name}: `); } catch { /* ignore */ }
    document.querySelector('[data-testid="live-tool-notes"]')?.click?.();
  };

  const findNpcs = location => {
    try { localStorage.setItem(`gm.liveNpcSearch.${campaignId}`, location.name || ''); } catch { /* ignore */ }
    document.querySelector('[data-testid="live-tool-npcs"]')?.click?.();
  };

  if (loading) return <div style={emptyStyle}>Loading locations and maps…</div>;

  return (
    <div data-testid="live-maps-panel" style={shellStyle}>
      <label style={searchStyle}><Search size={15} /><input value={search} onChange={event => { setSearch(event.target.value); setFocusedLocation(null); }} placeholder="Find a location or battle map" style={searchInputStyle} /></label>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}><span><MapPin size={14} /> Locations</span><strong>{filteredLocations.length}</strong></div>
        <div style={listStyle}>
          {filteredLocations.length === 0 && <div style={emptyStyle}>No matching locations.</div>}
          {filteredLocations.map(location => {
            const open = expandedLocationId === location.id;
            const focused = focusedLocation?.id === location.id;
            return (
              <article key={location.id} style={cardStyle(focused)}>
                <button type="button" onClick={() => setExpandedLocationId(open ? '' : location.id)} style={cardHeaderStyle}>
                  <span>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                  <span style={{ minWidth: 0, textAlign: 'left' }}><strong style={titleStyle}>{location.name || 'Unnamed Location'}</strong><span style={metaStyle}>{location.location_type || location.type || 'Location'}</span></span>
                  {focused && <span style={focusPillStyle}>Focused</span>}
                </button>
                {open && (
                  <div style={bodyStyle}>
                    {(location.description || location.notes) && <div style={detailStyle}>{location.description || location.notes}</div>}
                    <div style={actionsStyle}>
                      <button type="button" onClick={() => findNpcs(location)} style={actionStyle}><Users size={13} /> NPCs Here</button>
                      <button type="button" onClick={() => quickNote(location)} style={actionStyle}><FileText size={13} /> Quick Note</button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <details style={detailsStyle} open={filteredLocations.length === 0 && filteredMaps.length > 0 ? true : undefined}>
        <summary style={summaryStyle}><Map size={14} /> Battle Maps <span style={countStyle}>{filteredMaps.length}</span></summary>
        <div style={mapGridStyle}>
          {filteredMaps.length === 0 && <div style={emptyStyle}>No matching battle maps.</div>}
          {filteredMaps.map(map => (
            <article key={map.id} style={mapCardStyle}>
              <span style={mapIconStyle}><Grid size={17} /></span>
              <span style={{ minWidth: 0 }}><strong style={titleStyle}>{map.name || 'Untitled Map'}</strong><span style={metaStyle}>{map.width || 20}×{map.height || 15} · {safeArray(map.objects).length} objects · {safeArray(map.walls).length} walls</span></span>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

const shellStyle = { display: 'grid', gap: 7, color: rq.text };
const searchStyle = { minHeight: 40, display: 'flex', alignItems: 'center', gap: 7, background: rq.bg, border: `1px solid ${rq.line}`, color: rq.muted, padding: '0 9px' };
const searchInputStyle = { flex: 1, minWidth: 0, minHeight: 38, border: 0, outline: 0, background: 'transparent', color: rq.text, fontSize: 12 };
const sectionStyle = { display: 'grid', gap: 5 };
const sectionHeaderStyle = { minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, color: rq.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em' };
const listStyle = { display: 'grid', gap: 4 };
const cardStyle = focused => ({ background: rq.panel, border: `1px solid ${focused ? rq.red : rq.line}`, borderLeft: focused ? `4px solid ${rq.red}` : `1px solid ${rq.line}` });
const cardHeaderStyle = { width: '100%', minHeight: 46, border: 0, background: rq.card, color: rq.text, padding: '6px 8px', display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) auto', alignItems: 'center', gap: 5, cursor: 'pointer' };
const titleStyle = { display: 'block', color: rq.text, fontSize: 11, fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const metaStyle = { display: 'block', color: rq.muted, fontSize: 9, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const focusPillStyle = { minHeight: 21, border: `1px solid ${rq.red}`, background: 'rgba(208,0,0,0.14)', color: rq.text, padding: '0 5px', display: 'inline-flex', alignItems: 'center', fontSize: 8, fontWeight: 950 };
const bodyStyle = { display: 'grid', gap: 6, padding: 7, borderTop: `1px solid ${rq.line}` };
const detailStyle = { background: rq.bg, color: rq.soft, padding: 7, fontSize: 10, lineHeight: 1.4, maxHeight: 120, overflowY: 'auto' };
const actionsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 4 };
const actionStyle = { minHeight: 32, border: `1px solid ${rq.line}`, background: rq.bg, color: rq.text, padding: '0 7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', fontSize: 9, fontWeight: 900 };
const detailsStyle = { background: rq.panel, border: `1px solid ${rq.line}` };
const summaryStyle = { minHeight: 38, padding: '0 9px', display: 'flex', alignItems: 'center', gap: 6, color: rq.soft, cursor: 'pointer', listStyle: 'none', fontSize: 10, fontWeight: 900 };
const countStyle = { marginLeft: 'auto', color: rq.muted, fontSize: 9 };
const mapGridStyle = { padding: 7, borderTop: `1px solid ${rq.line}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 4 };
const mapCardStyle = { minHeight: 43, background: rq.bg, border: `1px solid ${rq.line}`, padding: '5px 7px', display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', alignItems: 'center', gap: 6 };
const mapIconStyle = { width: 26, height: 26, display: 'grid', placeItems: 'center', background: rq.card, color: rq.red };
const emptyStyle = { minHeight: 65, display: 'grid', placeItems: 'center', background: rq.panel, border: `1px dashed ${rq.line}`, color: rq.muted, fontSize: 10, textAlign: 'center', padding: 10 };
