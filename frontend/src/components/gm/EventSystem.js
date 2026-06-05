import React, { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/apiClient';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MapPin, Plus, Trash2, Play, TrendingUp, TrendingDown,
  Users, Coins, Trophy, AlertTriangle, ChevronDown, ChevronRight,
  BarChart3, Building2, Swords, Timer, Dices, X, Eye, Check,
  Minus, ArrowUpRight, ArrowDownRight, History, Sparkles
} from 'lucide-react';


// ─── Event Templates ────────────────────────────────────────────
const MAJOR_TEMPLATES = [
  { name: 'Horse Racing', category: 'horse_racing', description: 'A grand race through the streets or countryside. Riders compete for glory and gold.', skill_checks: ['Animal Handling', 'DEX'], config: { entry_fee: 25, venue_cost: 150, prize_pool: 500, marketing_cost: 60, staff_cost: 40, security_cost: 30, expected_participants: 12, quality_level: 'high' }},
  { name: 'Boxing Match', category: 'boxing', description: 'Bare-knuckle or gloved fighting in the arena pit. Crowd favorite.', skill_checks: ['STR', 'CON'], config: { entry_fee: 15, venue_cost: 80, prize_pool: 200, marketing_cost: 30, staff_cost: 25, security_cost: 40, expected_participants: 8, quality_level: 'medium' }},
  { name: 'Grand Tournament', category: 'tournament', description: 'A multi-day tournament of arms, jousting, and melee. Draws nobles and commoners alike.', skill_checks: ['STR', 'DEX', 'CON'], config: { entry_fee: 50, venue_cost: 500, prize_pool: 2000, marketing_cost: 200, staff_cost: 100, security_cost: 80, expected_participants: 32, quality_level: 'legendary' }},
  { name: 'Harvest Festival', category: 'festival', description: 'A celebration of the season with games, food, and music. Boosts morale and trade.', skill_checks: ['CHA', 'Performance'], config: { entry_fee: 5, venue_cost: 200, prize_pool: 50, marketing_cost: 40, staff_cost: 60, security_cost: 20, expected_participants: 80, quality_level: 'high' }},
  { name: 'Market Fair', category: 'market', description: 'Merchants from across the realm gather to trade exotic goods.', skill_checks: ['CHA', 'Insight'], config: { entry_fee: 2, venue_cost: 100, prize_pool: 0, marketing_cost: 80, staff_cost: 30, security_cost: 25, expected_participants: 100, quality_level: 'medium' }},
];

const MINOR_TEMPLATES = [
  { name: 'Arm Wrestling', category: 'arm_wrestling', description: 'Quick strength contest at the tavern.', skill_checks: ['STR'], config: { entry_fee: 5, venue_cost: 0, prize_pool: 20, marketing_cost: 0, staff_cost: 0, security_cost: 0, expected_participants: 6, quality_level: 'low' }},
  { name: 'Drinking Contest', category: 'drinking_contest', description: 'Last one standing wins. Increasing CON saves.', skill_checks: ['CON'], config: { entry_fee: 3, venue_cost: 0, prize_pool: 15, marketing_cost: 0, staff_cost: 0, security_cost: 0, expected_participants: 8, quality_level: 'low' }},
  { name: 'Card Game', category: 'card_game', description: 'Three-Dragon Ante or similar gambling.', skill_checks: ['CHA', 'WIS'], config: { entry_fee: 10, venue_cost: 0, prize_pool: 0, marketing_cost: 0, staff_cost: 0, security_cost: 0, expected_participants: 4, quality_level: 'low' }},
  { name: 'Knife Throwing', category: 'knife_throwing', description: 'Hit the bullseye for glory.', skill_checks: ['DEX'], config: { entry_fee: 5, venue_cost: 5, prize_pool: 25, marketing_cost: 0, staff_cost: 0, security_cost: 0, expected_participants: 10, quality_level: 'low' }},
  { name: 'Riddle Challenge', category: 'riddle_challenge', description: 'A battle of wits against a cunning opponent.', skill_checks: ['INT'], config: { entry_fee: 5, venue_cost: 0, prize_pool: 15, marketing_cost: 0, staff_cost: 0, security_cost: 0, expected_participants: 6, quality_level: 'low' }},
];

const QUALITY_COLORS = { low: '#6B7280', medium: '#F59E0B', high: '#3B82F6', legendary: '#8B5CF6' };

export default function EventSystem({ theme, campaignId: propCampaignId }) {
  const params = useParams();
  const campaignId = propCampaignId || params.campaignId;

  const [locations, setLocations] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [view, setView] = useState('locations'); // locations | events | create | preview | history
  const [loading, setLoading] = useState(true);

  // Create location
  const [newLocName, setNewLocName] = useState('');
  const [newLocRegion, setNewLocRegion] = useState('');
  const [newLocPop, setNewLocPop] = useState(500);
  const [newLocGold, setNewLocGold] = useState(5000);

  // Create event
  const [eventForm, setEventForm] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [locRes, evtRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/event-locations`),
        apiClient.get(`/campaigns/${campaignId}/events`),
      ]);
      setLocations(locRes.data);
      setEvents(evtRes.data);
      if (locRes.data.length > 0 && !selectedLocation) {
        setSelectedLocation(locRes.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch event data', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedLocation]);

  useEffect(() => { fetchData(); }, [campaignId]);

  // ─── Location CRUD ───────────────────────────────────────────
  const createLocation = async () => {
    if (!newLocName.trim()) return;
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/event-locations`, {
        name: newLocName, region: newLocRegion, population: newLocPop, gold_treasury: newLocGold,
      });
      setLocations(prev => [...prev, res.data]);
      setSelectedLocation(res.data);
      setNewLocName(''); setNewLocRegion(''); setNewLocPop(500); setNewLocGold(5000);
      toast.success(`${res.data.name} created!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create location');
    }
  };

  const deleteLocation = async (locId) => {
    if (!window.confirm('Delete this location and all its events?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/event-locations/${locId}`);
      setLocations(prev => prev.filter(l => l.location_id !== locId));
      setEvents(prev => prev.filter(e => e.location_id !== locId));
      if (selectedLocation?.location_id === locId) setSelectedLocation(null);
      toast.success('Location deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ─── Event CRUD ──────────────────────────────────────────────
  const createEvent = async () => {
    if (!eventForm || !selectedLocation) return;
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/events`, {
        ...eventForm, location: selectedLocation.name,
      });
      setEvents(prev => [...prev, res.data]);
      setEventForm(null);
      setView('events');
      toast.success(`${res.data.name} created!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create event');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await apiClient.delete(`/campaigns/${campaignId}/events/${eventId}`);
      setEvents(prev => prev.filter(e => e.event_id !== eventId));
      toast.success('Event deleted');
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const previewEvent = async (eventId) => {
    setPreviewLoading(true);
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/events/${eventId}/preview`);
      setPreviewData(res.data);
      setView('preview');
    } catch (err) {
      toast.error('Failed to preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const runEvent = async (eventId) => {
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/events/${eventId}/run`);
      // Update local state
      setEvents(prev => prev.map(e => e.event_id === eventId ? res.data.event : e));
      setLocations(prev => prev.map(l => l.location_id === res.data.location.location_id ? res.data.location : l));
      if (selectedLocation?.location_id === res.data.location.location_id) {
        setSelectedLocation(res.data.location);
      }
      setPreviewData(null);
      setView('events');
      const r = res.data.results;
      if (r.profit >= 0) {
        toast.success(`Event complete! Profit: ${r.profit} GP | Pop: ${r.population_change >= 0 ? '+' : ''}${r.population_change}`);
      } else {
        toast.error(`Event complete. Loss: ${r.profit} GP | Pop: ${r.population_change >= 0 ? '+' : ''}${r.population_change}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to run event');
    }
  };

  // ─── Realtime config preview ─────────────────────────────────
  const previewConfigChange = async (eventId, newConfig) => {
    try {
      const res = await apiClient.post(`/campaigns/${campaignId}/events/${eventId}/preview-config`, newConfig);
      return res.data.projection;
    } catch { return null; }
  };

  // ─── Filtered events ────────────────────────────────────────
  const locationEvents = useMemo(() => {
    if (!selectedLocation) return [];
    return events.filter(e => e.location_id === selectedLocation.location_id);
  }, [events, selectedLocation]);

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}`,
    borderRadius: '8px', color: theme.text.primary, padding: '10px 12px',
    fontSize: '13px', outline: 'none', width: '100%', fontFamily: "'Outfit', sans-serif",
  };
  const labelStyle = { fontSize: '10px', fontWeight: 700, color: theme.text.muted, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px', display: 'block' };
  const cardStyle = { background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '16px' };

  if (loading) return <div style={{ color: theme.text.muted, textAlign: 'center', padding: '40px' }}>Loading events...</div>;

  // ─── LOCATION OVERVIEW ───────────────────────────────────────
  const renderLocationPanel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Location selector */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {locations.map(loc => (
          <button key={loc.location_id} data-testid={`loc-${loc.location_id}`}
            onClick={() => { setSelectedLocation(loc); setView('events'); }}
            style={{
              padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
              background: selectedLocation?.location_id === loc.location_id ? theme.accent?.primary + '25' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selectedLocation?.location_id === loc.location_id ? theme.accent?.primary : theme.border}`,
              color: selectedLocation?.location_id === loc.location_id ? theme.accent?.primary : theme.text.secondary,
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600,
            }}
          >
            <Building2 size={14} /> {loc.name}
            <span style={{ fontSize: '10px', color: theme.text.muted }}>Pop: {loc.population?.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Add location form */}
      <div style={{ ...cardStyle, display: 'flex', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ flex: '2', minWidth: '140px' }}>
          <label style={labelStyle}>City / Area Name</label>
          <input data-testid="loc-name-input" value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="e.g. Waterdeep" style={inputStyle} />
        </div>
        <div style={{ flex: '1', minWidth: '100px' }}>
          <label style={labelStyle}>Region</label>
          <input value={newLocRegion} onChange={e => setNewLocRegion(e.target.value)} placeholder="Sword Coast" style={inputStyle} />
        </div>
        <div style={{ flex: '1', minWidth: '80px' }}>
          <label style={labelStyle}>Population</label>
          <input type="number" value={newLocPop} onChange={e => setNewLocPop(parseInt(e.target.value) || 0)} style={inputStyle} />
        </div>
        <div style={{ flex: '1', minWidth: '80px' }}>
          <label style={labelStyle}>Treasury (GP)</label>
          <input type="number" value={newLocGold} onChange={e => setNewLocGold(parseFloat(e.target.value) || 0)} style={inputStyle} />
        </div>
        <button data-testid="create-location-btn" onClick={createLocation}
          style={{ padding: '10px 20px', borderRadius: '8px', background: theme.accent?.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
          <Plus size={14} /> Add Location
        </button>
      </div>
    </div>
  );

  // ─── LOCATION STATS ──────────────────────────────────────────
  const renderLocationStats = () => {
    if (!selectedLocation) return null;
    const loc = selectedLocation;
    const latestHistory = loc.history?.[loc.history.length - 1];
    const prevHistory = loc.history?.length >= 2 ? loc.history[loc.history.length - 2] : null;
    const goldDelta = prevHistory ? loc.gold_treasury - prevHistory.gold : 0;
    const popDelta = prevHistory ? loc.population - prevHistory.population : 0;
    const repDelta = prevHistory ? loc.reputation - prevHistory.reputation : 0;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <StatCard theme={theme} label="Treasury" value={`${loc.gold_treasury?.toLocaleString()} GP`} delta={goldDelta} icon={<Coins size={16} />} color="#F59E0B" />
        <StatCard theme={theme} label="Population" value={loc.population?.toLocaleString()} delta={popDelta} icon={<Users size={16} />} color="#3B82F6" />
        <StatCard theme={theme} label="Reputation" value={`${loc.reputation}/100`} delta={repDelta} icon={<TrendingUp size={16} />} color="#10B981" />
        <StatCard theme={theme} label="Events Run" value={locationEvents.filter(e => e.status === 'completed').length} icon={<BarChart3 size={16} />} color="#8B5CF6" />
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Day</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: theme.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>
              {loc.history?.length || 1}
            </div>
          </div>
          <button onClick={() => setView('history')} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: 'rgba(139,92,246,0.1)', border: `1px solid rgba(139,92,246,0.3)`, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <History size={10} /> History
          </button>
        </div>
      </div>
    );
  };

  // ─── EVENT LIST ──────────────────────────────────────────────
  const renderEventList = () => {
    const planned = locationEvents.filter(e => e.status === 'planned');
    const completed = locationEvents.filter(e => e.status === 'completed');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Planned Events */}
        {planned.length > 0 && (
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Planned Events ({planned.length})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {planned.map(evt => (
                <EventCard key={evt.event_id} evt={evt} theme={theme} onPreview={() => previewEvent(evt.event_id)} onDelete={() => deleteEvent(evt.event_id)} onRun={() => runEvent(evt.event_id)} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Events */}
        {completed.length > 0 && (
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Completed Events ({completed.length})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {completed.map(evt => (
                <EventCard key={evt.event_id} evt={evt} theme={theme} completed />
              ))}
            </div>
          </div>
        )}

        {locationEvents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.text.muted }}>
            <Sparkles size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ fontSize: '14px', marginBottom: '4px' }}>No events planned for {selectedLocation?.name}</p>
            <p style={{ fontSize: '12px' }}>Create a major or minor event to get started</p>
          </div>
        )}
      </div>
    );
  };

  // ─── CREATE EVENT FORM ───────────────────────────────────────
  const renderCreateForm = () => {
    if (!eventForm) return null;
    const cfg = eventForm.config || {};

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: theme.text.primary }}>
            {eventForm.event_type === 'major' ? 'Major Event' : 'Minor Event'}: {eventForm.name}
          </h4>
          <button onClick={() => { setEventForm(null); setView('events'); }} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Event Name</label>
            <input value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Quality Level</label>
            <select value={cfg.quality_level || 'medium'} onChange={e => setEventForm(p => ({ ...p, config: { ...p.config, quality_level: e.target.value } }))} style={inputStyle}>
              {['low', 'medium', 'high', 'legendary'].map(q => <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea value={eventForm.description || ''} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Financial Sliders */}
        <div style={{ ...cardStyle }}>
          <h5 style={{ fontSize: '11px', fontWeight: 700, color: theme.accent?.primary, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Financial Configuration</h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            <SliderField label="Entry Fee (GP)" value={cfg.entry_fee} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, entry_fee: v } }))} min={0} max={200} theme={theme} />
            <SliderField label="Venue Cost (GP)" value={cfg.venue_cost} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, venue_cost: v } }))} min={0} max={1000} theme={theme} />
            <SliderField label="Prize Pool (GP)" value={cfg.prize_pool} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, prize_pool: v } }))} min={0} max={5000} theme={theme} />
            <SliderField label="Marketing (GP)" value={cfg.marketing_cost} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, marketing_cost: v } }))} min={0} max={500} theme={theme} />
            <SliderField label="Staff Cost (GP)" value={cfg.staff_cost} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, staff_cost: v } }))} min={0} max={200} theme={theme} />
            <SliderField label="Security (GP)" value={cfg.security_cost} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, security_cost: v } }))} min={0} max={200} theme={theme} />
            <SliderField label="Expected Participants" value={cfg.expected_participants} onChange={v => setEventForm(p => ({ ...p, config: { ...p.config, expected_participants: v } }))} min={1} max={200} theme={theme} />
          </div>
        </div>

        {/* Live Financial Preview */}
        <LivePreview config={cfg} location={selectedLocation} theme={theme} />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button data-testid="save-event-btn" onClick={createEvent}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', background: theme.gradient || theme.accent?.primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Check size={14} /> Create Event
          </button>
          <button onClick={() => { setEventForm(null); setView('events'); }}
            style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}`, color: theme.text.muted, cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ─── HISTORY VIEW ────────────────────────────────────────────
  const renderHistory = () => {
    if (!selectedLocation?.history?.length) return <p style={{ color: theme.text.muted }}>No history yet.</p>;
    const history = [...selectedLocation.history].reverse();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: theme.text.primary }}>Day-by-Day History: {selectedLocation.name}</h4>
          <button onClick={() => setView('events')} style={{ fontSize: '11px', color: theme.text.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Back to Events</button>
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {history.map((h, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 80px', gap: '12px', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', fontSize: '12px' }}>
              <span style={{ fontWeight: 700, color: theme.accent?.primary, fontFamily: "'JetBrains Mono', monospace" }}>Day {h.day}</span>
              <span style={{ color: theme.text.secondary }}>{h.event}</span>
              <span style={{ color: '#F59E0B', fontFamily: "'JetBrains Mono', monospace" }}>{h.gold?.toLocaleString()} GP</span>
              <span style={{ color: '#3B82F6', fontFamily: "'JetBrains Mono', monospace" }}>Pop: {h.population?.toLocaleString()}</span>
              <span style={{ color: '#10B981', fontFamily: "'JetBrains Mono', monospace" }}>Rep: {h.reputation}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── PREVIEW VIEW ────────────────────────────────────────────
  const renderPreview = () => {
    if (!previewData) return null;
    const p = previewData.projection;
    const evt = previewData.event;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 700, color: theme.text.primary }}>Preview: {evt.name}</h4>
          <button onClick={() => { setPreviewData(null); setView('events'); }} style={{ background: 'none', border: 'none', color: theme.text.muted, cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <MiniStat label="Est. Attendance" value={p.actual_attendance} color="#3B82F6" theme={theme} />
          <MiniStat label="Spectators" value={p.spectators} color="#8B5CF6" theme={theme} />
          <MiniStat label="Revenue" value={`${p.total_revenue} GP`} color="#10B981" theme={theme} />
          <MiniStat label="Costs" value={`${p.total_costs} GP`} color="#EF4444" theme={theme} />
          <MiniStat label="Profit" value={`${p.profit >= 0 ? '+' : ''}${p.profit} GP`} color={p.profit >= 0 ? '#10B981' : '#EF4444'} theme={theme} />
          <MiniStat label="Satisfaction" value={`${p.satisfaction}/100`} color="#F59E0B" theme={theme} />
          <MiniStat label="Rep Change" value={`${p.reputation_change >= 0 ? '+' : ''}${p.reputation_change}`} color={p.reputation_change >= 0 ? '#10B981' : '#EF4444'} theme={theme} />
          <MiniStat label="Pop Change" value={`${p.population_change >= 0 ? '+' : ''}${p.population_change}`} color={p.population_change >= 0 ? '#3B82F6' : '#EF4444'} theme={theme} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button data-testid="run-event-confirm" onClick={() => runEvent(evt.event_id)}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Play size={14} /> Run Event
          </button>
          <button onClick={() => { setPreviewData(null); setView('events'); }}
            style={{ padding: '12px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}`, color: theme.text.muted, cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────
  return (
    <div data-testid="event-system" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', color: theme.accent?.gm || theme.accent?.primary, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={20} /> Event System
          {selectedLocation && <span style={{ fontSize: '13px', fontWeight: 500, color: theme.text.secondary }}>/ {selectedLocation.name}</span>}
        </h3>
        <div style={{ display: 'flex', gap: '6px' }}>
          {selectedLocation && view !== 'create' && (
            <>
              <button data-testid="create-major-event-btn" onClick={() => { setView('create'); setEventForm({ event_type: 'major', name: '', category: 'custom', description: '', skill_checks: [], config: { entry_fee: 25, venue_cost: 100, prize_pool: 300, marketing_cost: 50, staff_cost: 30, security_cost: 20, expected_participants: 20, quality_level: 'medium' } }); }}
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: theme.accent?.primary + '20', color: theme.accent?.primary, border: `1px solid ${theme.accent?.primary}40`, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={12} /> Major Event
              </button>
              <button data-testid="create-minor-event-btn" onClick={() => { setView('create'); setEventForm({ event_type: 'minor', name: '', category: 'custom', description: '', skill_checks: [], config: { entry_fee: 5, venue_cost: 0, prize_pool: 20, marketing_cost: 0, staff_cost: 0, security_cost: 0, expected_participants: 6, quality_level: 'low' } }); }}
                style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={12} /> Minor Event
              </button>
            </>
          )}
        </div>
      </div>

      {/* Location Panel - always visible */}
      {renderLocationPanel()}

      {/* Selected Location Stats */}
      {selectedLocation && view !== 'create' && renderLocationStats()}

      {/* Templates Quick-Add (when creating) */}
      {view === 'create' && eventForm && (
        <div style={{ ...cardStyle }}>
          <h5 style={{ fontSize: '11px', fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
            {eventForm.event_type === 'major' ? 'Major' : 'Minor'} Event Templates (click to use)
          </h5>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(eventForm.event_type === 'major' ? MAJOR_TEMPLATES : MINOR_TEMPLATES).map(t => (
              <button key={t.category} data-testid={`template-${t.category}`}
                onClick={() => setEventForm(prev => ({ ...prev, name: t.name, category: t.category, description: t.description, skill_checks: t.skill_checks, config: { ...t.config } }))}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: eventForm.category === t.category ? theme.accent?.primary + '25' : 'rgba(255,255,255,0.04)', color: eventForm.category === t.category ? theme.accent?.primary : theme.text.secondary, border: `1px solid ${eventForm.category === t.category ? theme.accent?.primary + '60' : theme.border}`, transition: 'all 0.15s' }}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Router */}
      {view === 'create' && renderCreateForm()}
      {view === 'events' && renderEventList()}
      {view === 'preview' && renderPreview()}
      {view === 'history' && renderHistory()}
      {view === 'locations' && !selectedLocation && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.text.muted }}>
          <MapPin size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: '14px' }}>Add a city or area above to start tracking events</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ────────────────────────────────────────────

function StatCard({ theme, label, value, delta, icon, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: '20px', fontWeight: 800, color: theme.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {delta !== undefined && delta !== 0 && (
        <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', color: delta > 0 ? '#10B981' : '#EF4444' }}>
          {delta > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {delta > 0 ? '+' : ''}{typeof delta === 'number' ? delta.toLocaleString() : delta}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color, theme }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
      <div style={{ fontSize: '9px', color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, theme }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontSize: '10px', fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
        <span style={{ fontSize: '12px', fontWeight: 700, color: theme.text.primary, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: theme.accent?.primary || '#D4A017', height: '4px' }} />
    </div>
  );
}

function LivePreview({ config, location, theme }) {
  // Client-side version of the financial calculator
  const calc = useMemo(() => {
    if (!config || !location) return null;
    const q = { low: 0.5, medium: 1.0, high: 1.5, legendary: 2.5 }[config.quality_level] || 1;
    const mkt = Math.min(2.0, 0.5 + (config.marketing_cost / 50));
    const sec = Math.min(1.5, 0.7 + (config.security_cost / 30));
    const maxA = Math.floor(location.population * 0.15);
    const att = Math.max(1, Math.min(Math.floor(config.expected_participants * q * mkt * (location.reputation / 50)), maxA));
    const spec = Math.floor(att * 1.5 * q);
    const entryRev = att * config.entry_fee;
    const specSpend = spec * 2;
    const totalRev = entryRev + specSpend;
    const totalCost = config.venue_cost + config.prize_pool + config.marketing_cost + config.staff_cost + config.security_cost;
    const profit = totalRev - totalCost;
    const prizeAttr = Math.min(40, (config.prize_pool / Math.max(1, config.entry_fee)) * 5);
    const satisfaction = Math.min(100, Math.floor(q * 30 + sec * 20 + prizeAttr + 10));
    let repC = satisfaction >= 80 ? 3 : satisfaction >= 60 ? 1 : satisfaction >= 40 ? 0 : satisfaction >= 20 ? -1 : -3;
    if (profit > 0) repC += 1; else if (profit < -100) repC -= 2;
    let popC = 0;
    if (satisfaction >= 70 && profit >= 0) popC = Math.floor(att * 0.05 * q);
    else if (satisfaction < 30) popC = -Math.floor(location.population * 0.005);
    return { att, spec, totalRev: Math.round(totalRev), totalCost: Math.round(totalCost), profit: Math.round(profit), satisfaction, repC, popC };
  }, [config, location]);

  if (!calc) return null;

  return (
    <div style={{ background: calc.profit >= 0 ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)', border: `1px solid ${calc.profit >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '10px', padding: '14px' }}>
      <h5 style={{ fontSize: '11px', fontWeight: 700, color: theme.text.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Live Financial Preview</h5>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px', fontSize: '11px' }}>
        <div><span style={{ color: theme.text.muted }}>Attendance:</span> <strong style={{ color: '#3B82F6' }}>{calc.att}</strong></div>
        <div><span style={{ color: theme.text.muted }}>Spectators:</span> <strong style={{ color: '#8B5CF6' }}>{calc.spec}</strong></div>
        <div><span style={{ color: theme.text.muted }}>Revenue:</span> <strong style={{ color: '#10B981' }}>{calc.totalRev} GP</strong></div>
        <div><span style={{ color: theme.text.muted }}>Costs:</span> <strong style={{ color: '#EF4444' }}>{calc.totalCost} GP</strong></div>
        <div><span style={{ color: theme.text.muted }}>Profit:</span> <strong style={{ color: calc.profit >= 0 ? '#10B981' : '#EF4444' }}>{calc.profit >= 0 ? '+' : ''}{calc.profit} GP</strong></div>
        <div><span style={{ color: theme.text.muted }}>Satisfaction:</span> <strong style={{ color: '#F59E0B' }}>{calc.satisfaction}/100</strong></div>
        <div><span style={{ color: theme.text.muted }}>Rep:</span> <strong style={{ color: calc.repC >= 0 ? '#10B981' : '#EF4444' }}>{calc.repC >= 0 ? '+' : ''}{calc.repC}</strong></div>
        <div><span style={{ color: theme.text.muted }}>Pop:</span> <strong style={{ color: calc.popC >= 0 ? '#3B82F6' : '#EF4444' }}>{calc.popC >= 0 ? '+' : ''}{calc.popC}</strong></div>
      </div>
    </div>
  );
}

function EventCard({ evt, theme, onPreview, onDelete, onRun, completed }) {
  const qualColor = QUALITY_COLORS[evt.config?.quality_level] || '#6B7280';
  const isMinor = evt.event_type === 'minor';
  const results = evt.results;

  return (
    <div data-testid={`event-card-${evt.event_id}`} style={{
      background: 'rgba(255,255,255,0.02)', border: `1px solid ${theme.border}`,
      borderLeft: `3px solid ${completed ? (results?.profit >= 0 ? '#10B981' : '#EF4444') : qualColor}`,
      borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: theme.text.primary }}>{evt.name}</div>
          <div style={{ fontSize: '10px', color: theme.text.muted, display: 'flex', gap: '6px', marginTop: '2px' }}>
            <span style={{ background: isMinor ? 'rgba(245,158,11,0.1)' : theme.accent?.primary + '15', color: isMinor ? '#F59E0B' : theme.accent?.primary, padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
              {isMinor ? 'MINOR' : 'MAJOR'}
            </span>
            <span style={{ background: qualColor + '20', color: qualColor, padding: '1px 6px', borderRadius: '3px', fontWeight: 600 }}>
              {evt.config?.quality_level?.toUpperCase()}
            </span>
          </div>
        </div>
        {completed && results && (
          <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: results.profit >= 0 ? '#10B981' : '#EF4444' }}>
            {results.profit >= 0 ? '+' : ''}{results.profit} GP
          </span>
        )}
      </div>

      {evt.description && <div style={{ fontSize: '11px', color: theme.text.secondary, lineHeight: 1.4 }}>{evt.description}</div>}

      {/* Cost summary */}
      <div style={{ display: 'flex', gap: '8px', fontSize: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: '#F59E0B' }}><Coins size={10} style={{ display: 'inline', marginRight: '2px' }} />Entry: {evt.config?.entry_fee} GP</span>
        <span style={{ color: '#EF4444' }}>Cost: {(evt.config?.venue_cost || 0) + (evt.config?.prize_pool || 0) + (evt.config?.marketing_cost || 0) + (evt.config?.staff_cost || 0) + (evt.config?.security_cost || 0)} GP</span>
      </div>

      {/* Completed results */}
      {completed && results && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
          <span style={{ color: '#3B82F6' }}>Attend: {results.actual_attendance}</span>
          <span style={{ color: '#F59E0B' }}>Satis: {results.satisfaction}/100</span>
          <span style={{ color: results.population_change >= 0 ? '#10B981' : '#EF4444' }}>Pop: {results.population_change >= 0 ? '+' : ''}{results.population_change}</span>
        </div>
      )}

      {/* Actions */}
      {!completed && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
          <button data-testid={`preview-${evt.event_id}`} onClick={onPreview}
            style={{ flex: 1, padding: '6px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Eye size={10} /> Preview
          </button>
          <button data-testid={`run-${evt.event_id}`} onClick={onRun}
            style={{ flex: 1, padding: '6px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Play size={10} /> Run
          </button>
          <button onClick={onDelete}
            style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', cursor: 'pointer' }}>
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
