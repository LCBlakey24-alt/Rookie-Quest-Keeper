import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Check,
  Clock,
  Crown,
  Eye,
  Flag,
  HeartCrack,
  MapPin,
  Milestone,
  Plus,
  Save,
  Search,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const fontStack = 'var(--rq-body-font, Manrope, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)';

const theme = {
  bg: '#242424',
  panel: '#2f2f2f',
  card: '#3a3a3a',
  input: '#242424',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  soft: 'rgba(255,255,255,0.74)',
  line: 'rgba(255,255,255,0.16)',
  lineStrong: 'rgba(255,255,255,0.22)',
  primary: '#d00000',
};

const EVENT_TYPES = [
  { id: 'session', label: 'Session Recap', icon: Calendar },
  { id: 'major', label: 'Major Event', icon: Crown },
  { id: 'milestone', label: 'Milestone', icon: Milestone },
  { id: 'quest', label: 'Quest / Objective', icon: Flag },
  { id: 'location', label: 'Location Discovered', icon: MapPin },
  { id: 'npc_met', label: 'NPC / Figure Met', icon: Users },
  { id: 'combat', label: 'Encounter / Combat', icon: Swords },
  { id: 'reveal', label: 'Reveal / Secret', icon: Eye },
  { id: 'consequence', label: 'Consequence', icon: HeartCrack },
  { id: 'death', label: 'Death / Loss', icon: Skull },
  { id: 'level_up', label: 'Level Up / Reward', icon: Sparkles },
];

const emptyEvent = {
  type: 'session',
  title: '',
  description: '',
  session_number: '',
  in_game_date: '',
};

function typeDetails(typeId) {
  return EVENT_TYPES.find(type => type.id === typeId) || EVENT_TYPES[0];
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const sessionA = Number(a.session_number) || 0;
    const sessionB = Number(b.session_number) || 0;
    if (sessionB !== sessionA) return sessionB - sessionA;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

export default function SessionTimeline({ campaignId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [newEvent, setNewEvent] = useState(emptyEvent);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [campaignId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/campaigns/${campaignId}/timeline`);
      const nextEvents = Array.isArray(response.data?.events) ? response.data.events : [];
      setEvents(sortEvents(nextEvents));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortEvents(events).filter(event => {
      const matchesType = filter === 'all' || event.type === filter;
      const matchesSearch = !query || [
        event.title,
        event.description,
        event.in_game_date,
        event.session_number,
        typeDetails(event.type).label,
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [events, filter, searchTerm]);

  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce((acc, event) => {
      const session = event.session_number || 'Unassigned';
      if (!acc[session]) acc[session] = [];
      acc[session].push(event);
      return acc;
    }, {});
  }, [filteredEvents]);

  const counts = useMemo(() => {
    return EVENT_TYPES.reduce((acc, type) => {
      acc[type.id] = events.filter(event => event.type === type.id).length;
      return acc;
    }, {});
  }, [events]);

  const updateNewEvent = (field, value) => setNewEvent(prev => ({ ...prev, [field]: value }));

  const resetForm = () => {
    setNewEvent(emptyEvent);
    setShowAddForm(false);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Add a timeline title first');
      return;
    }

    const eventData = {
      ...newEvent,
      title: newEvent.title.trim(),
      description: newEvent.description.trim(),
      in_game_date: newEvent.in_game_date.trim(),
      campaign_id: campaignId,
      created_at: new Date().toISOString(),
    };

    try {
      const response = await apiClient.post(`/campaigns/${campaignId}/timeline`, eventData);
      setEvents(prev => sortEvents([...prev, response.data]));
      toast.success('Timeline event saved');
    } catch {
      const localEvent = { id: Date.now().toString(), ...eventData };
      setEvents(prev => sortEvents([...prev, localEvent]));
      toast.info('Timeline event added locally');
    } finally {
      resetForm();
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (deletingId !== eventId) {
      setDeletingId(eventId);
      setTimeout(() => setDeletingId(null), 5000);
      return;
    }

    try {
      await apiClient.delete(`/campaigns/${campaignId}/timeline/${eventId}`);
      toast.success('Timeline event deleted');
    } catch {
      toast.info('Timeline event removed locally');
    } finally {
      setEvents(prev => prev.filter(event => event.id !== eventId));
      setDeletingId(null);
    }
  };

  if (loading) {
    return <section style={loadingStyle}>Loading campaign timeline...</section>;
  }

  return (
    <section style={shellStyle}>
      <header style={headerStyle}>
        <div style={headerIconStyle}><Clock size={22} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={eyebrowStyle}>Chronicle</p>
          <h3 style={titleStyle}>Campaign Timeline</h3>
          <p style={subtitleStyle}>Track sessions, reveals, consequences, discoveries, losses, rewards, and world changes.</p>
        </div>
        <Button onClick={() => setShowAddForm(prev => !prev)} style={primaryButtonStyle}>
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Close' : 'Add Event'}
        </Button>
      </header>

      <section style={statsStyle}>
        <Stat label="Events" value={events.length} />
        <Stat label="Filtered" value={filteredEvents.length} />
        <Stat label="Sessions" value={new Set(events.map(event => event.session_number).filter(Boolean)).size} />
      </section>

      {showAddForm && (
        <section style={formPanelStyle}>
          <p style={formTitleStyle}>New Chronicle Event</p>
          <div style={topFormGridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Event type</span>
              <select value={newEvent.type} onChange={(event) => updateNewEvent('type', event.target.value)} style={inputStyle}>
                {EVENT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Session #</span>
              <Input type="number" value={newEvent.session_number} onChange={(event) => updateNewEvent('session_number', event.target.value)} placeholder="1" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>In-world date</span>
              <Input value={newEvent.in_game_date} onChange={(event) => updateNewEvent('in_game_date', event.target.value)} placeholder="Day 15, Spring" style={inputStyle} />
            </label>
          </div>
          <label style={fieldStyle}>
            <span style={labelStyle}>Title</span>
            <Input value={newEvent.title} onChange={(event) => updateNewEvent('title', event.target.value)} placeholder="What changed?" style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Description</span>
            <textarea value={newEvent.description} onChange={(event) => updateNewEvent('description', event.target.value)} placeholder="What happened, why does it matter, and what might come back later?" style={textareaStyle} />
          </label>
          <div style={formActionsStyle}>
            <Button onClick={resetForm} style={secondaryButtonStyle}>Cancel</Button>
            <Button onClick={handleAddEvent} style={primaryButtonStyle}><Save size={16} /> Save Event</Button>
          </div>
        </section>
      )}

      <section style={controlsStyle}>
        <div style={searchWrapStyle}>
          <Search size={17} style={searchIconStyle} />
          <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search timeline events..." style={searchInputStyle} />
        </div>
        <div style={filtersStyle}>
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All ({events.length})</FilterButton>
          {EVENT_TYPES.map(type => counts[type.id] > 0 && <FilterButton key={type.id} active={filter === type.id} onClick={() => setFilter(type.id)}>{type.label} ({counts[type.id]})</FilterButton>)}
        </div>
      </section>

      <section style={timelineStyle}>
        {events.length === 0 ? (
          <div style={emptyStyle}>
            <Clock size={42} />
            <h4 style={emptyTitleStyle}>No timeline events yet</h4>
            <p style={emptyTextStyle}>Start with session one, a major world event, or the moment the campaign truly kicked off.</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={emptyStyle}>
            <Search size={38} />
            <h4 style={emptyTitleStyle}>No matching events</h4>
            <p style={emptyTextStyle}>Clear the search or change the filter.</p>
          </div>
        ) : (
          Object.entries(groupedEvents)
            .sort(([a], [b]) => (Number(b) || 0) - (Number(a) || 0))
            .map(([session, sessionEvents]) => (
              <SessionGroup key={session} session={session} events={sessionEvents} deletingId={deletingId} onDelete={handleDeleteEvent} onCancelDelete={() => setDeletingId(null)} />
            ))
        )}
      </section>
    </section>
  );
}

function Stat({ label, value }) {
  return <div style={statStyle}><strong>{value}</strong><span>{label}</span></div>;
}

function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} style={filterButtonStyle(active)}>{children}</button>;
}

function SessionGroup({ session, events, deletingId, onDelete, onCancelDelete }) {
  return (
    <article style={sessionGroupStyle}>
      <div style={sessionMarkerStyle}>{session === 'Unassigned' ? '?' : session}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h4 style={sessionTitleStyle}>{session === 'Unassigned' ? 'Unassigned Events' : `Session ${session}`}</h4>
        <div style={eventsListStyle}>
          {events.map(event => <TimelineEvent key={event.id} event={event} deleting={deletingId === event.id} onDelete={() => onDelete(event.id)} onCancelDelete={onCancelDelete} />)}
        </div>
      </div>
    </article>
  );
}

function TimelineEvent({ event, deleting, onDelete, onCancelDelete }) {
  const details = typeDetails(event.type);
  const Icon = details.icon;
  return (
    <article style={eventCardStyle}>
      <div style={eventTopStyle}>
        <span style={eventTypeStyle}><Icon size={14} /> {details.label}</span>
        {event.in_game_date && <span style={dateStyle}>{event.in_game_date}</span>}
      </div>
      <h5 style={eventTitleStyle}>{event.title}</h5>
      {event.description && <p style={eventDescriptionStyle}>{event.description}</p>}
      <div style={eventActionsStyle}>
        {deleting ? (
          <>
            <span style={deleteTextStyle}>Delete?</span>
            <button type="button" onClick={onDelete} style={dangerButtonStyle}><Check size={13} /> Yes</button>
            <button type="button" onClick={onCancelDelete} style={smallButtonStyle}><X size={13} /> No</button>
          </>
        ) : (
          <button type="button" onClick={onDelete} style={smallButtonStyle}><Trash2 size={13} /> Delete</button>
        )}
      </div>
    </article>
  );
}

const shellStyle = { display: 'grid', gap: 14, background: theme.panel, border: `1px solid ${theme.line}`, padding: 16, fontFamily: fontStack };
const loadingStyle = { minHeight: 180, display: 'grid', placeItems: 'center', color: theme.soft, background: theme.panel, border: `1px solid ${theme.line}`, fontFamily: fontStack };
const headerStyle = { display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${theme.line}`, paddingBottom: 14 };
const headerIconStyle = { width: 44, height: 44, display: 'grid', placeItems: 'center', background: theme.bg, color: theme.text, borderLeft: `6px solid ${theme.primary}` };
const eyebrowStyle = { margin: 0, color: theme.muted, fontSize: 11, fontWeight: 950, letterSpacing: '0.1em', textTransform: 'uppercase' };
const titleStyle = { margin: '2px 0 5px', color: theme.text, fontSize: 25, fontWeight: 950, letterSpacing: '-0.02em' };
const subtitleStyle = { margin: 0, color: theme.soft, fontSize: 14, lineHeight: 1.45 };
const primaryButtonStyle = { minHeight: 40, border: 0, borderRadius: 0, background: theme.primary, color: theme.text, padding: '0 13px', fontWeight: 950, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const secondaryButtonStyle = { minHeight: 40, border: 0, borderRadius: 0, background: theme.card, color: theme.text, padding: '0 13px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontFamily: fontStack };
const statsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', borderTop: `1px solid ${theme.line}`, borderBottom: `1px solid ${theme.line}` };
const statStyle = { minHeight: 58, display: 'grid', alignContent: 'center', gap: 3, padding: '10px 12px', borderRight: `1px solid ${theme.line}`, color: theme.text };
const formPanelStyle = { display: 'grid', gap: 12, background: theme.bg, borderLeft: `6px solid ${theme.primary}`, padding: 14 };
const formTitleStyle = { margin: 0, color: theme.text, fontSize: 15, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.08em' };
const topFormGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 };
const fieldStyle = { display: 'grid', gap: 6 };
const labelStyle = { color: theme.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 950 };
const inputStyle = { minHeight: 42, width: '100%', background: theme.card, border: `1px solid ${theme.lineStrong}`, color: theme.text, borderRadius: 0, padding: '0 11px', fontFamily: fontStack, colorScheme: 'dark' };
const textareaStyle = { width: '100%', minHeight: 100, background: theme.card, border: `1px solid ${theme.lineStrong}`, color: theme.text, borderRadius: 0, padding: 11, fontFamily: fontStack, lineHeight: 1.45, resize: 'vertical', colorScheme: 'dark' };
const formActionsStyle = { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', borderTop: `1px solid ${theme.line}`, paddingTop: 12 };
const controlsStyle = { display: 'grid', gap: 10 };
const searchWrapStyle = { position: 'relative' };
const searchIconStyle = { position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', color: theme.muted, zIndex: 1 };
const searchInputStyle = { ...inputStyle, paddingLeft: 38 };
const filtersStyle = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const filterButtonStyle = (active) => ({ minHeight: 34, border: 0, borderRadius: 0, background: active ? theme.primary : theme.card, color: theme.text, padding: '0 10px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: fontStack });
const timelineStyle = { display: 'grid', gap: 14, position: 'relative' };
const emptyStyle = { display: 'grid', justifyItems: 'center', gap: 9, textAlign: 'center', background: theme.bg, border: `1px solid ${theme.line}`, padding: '42px 16px', color: theme.muted };
const emptyTitleStyle = { margin: 0, color: theme.text, fontSize: 18, fontWeight: 950 };
const emptyTextStyle = { margin: 0, color: theme.soft, lineHeight: 1.4, maxWidth: 460 };
const sessionGroupStyle = { display: 'flex', gap: 12, alignItems: 'flex-start' };
const sessionMarkerStyle = { width: 44, height: 44, display: 'grid', placeItems: 'center', flex: '0 0 auto', background: theme.primary, color: theme.text, fontWeight: 950, fontSize: 15 };
const sessionTitleStyle = { margin: '0 0 10px', color: theme.text, fontSize: 17, fontWeight: 950 };
const eventsListStyle = { display: 'grid', gap: 9 };
const eventCardStyle = { background: theme.bg, border: `1px solid ${theme.line}`, borderLeft: `6px solid ${theme.primary}`, padding: 13 };
const eventTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 7 };
const eventTypeStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, color: theme.text, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 950 };
const dateStyle = { color: theme.muted, fontSize: 12, fontWeight: 850 };
const eventTitleStyle = { margin: '0 0 6px', color: theme.text, fontSize: 16, fontWeight: 950 };
const eventDescriptionStyle = { margin: 0, color: theme.soft, lineHeight: 1.5, whiteSpace: 'pre-wrap' };
const eventActionsStyle = { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 7, flexWrap: 'wrap', borderTop: `1px solid ${theme.line}`, marginTop: 11, paddingTop: 9 };
const smallButtonStyle = { minHeight: 32, border: 0, borderRadius: 0, background: theme.card, color: theme.text, padding: '0 9px', fontWeight: 900, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: fontStack };
const dangerButtonStyle = { ...smallButtonStyle, background: theme.primary };
const deleteTextStyle = { color: theme.muted, fontSize: 12, fontWeight: 900 };
