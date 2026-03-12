import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock, Plus, Edit, Trash2, Save, X, ChevronDown, ChevronUp,
  Swords, Users, MapPin, Crown, Skull, Heart, Star, Flag,
  Calendar, Milestone
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

// GM Theme - Red (Tron Aries)
const theme = {
  primary: '#F59E0B',
  hover: '#D97706',
  subtle: 'rgba(225, 29, 72, 0.15)',
  glow: '0 0 20px rgba(225, 29, 72, 0.3)',
  bg: '#0B0F19',
  card: '#111827',
  panel: '#111827',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  muted: '#808080',
  border: 'rgba(212, 175, 55, 0.15)'
};

const EVENT_TYPES = [
  { id: 'session', label: 'Session', icon: Calendar, color: '#06B6D4' },
  { id: 'combat', label: 'Combat', icon: Swords, color: '#D97706' },
  { id: 'npc_met', label: 'NPC Met', icon: Users, color: '#8B5CF6' },
  { id: 'location', label: 'Location', icon: MapPin, color: '#22C55E' },
  { id: 'quest', label: 'Quest', icon: Flag, color: '#F59E0B' },
  { id: 'death', label: 'Death', icon: Skull, color: '#6B7280' },
  { id: 'level_up', label: 'Level Up', icon: Star, color: '#06B6D4' },
  { id: 'major', label: 'Major Event', icon: Crown, color: '#F59E0B' },
  { id: 'milestone', label: 'Milestone', icon: Milestone, color: '#EC4899' }
];

function SessionTimeline({ campaignId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [newEvent, setNewEvent] = useState({
    type: 'session',
    title: '',
    description: '',
    session_number: '',
    in_game_date: ''
  });

  useEffect(() => {
    fetchEvents();
  }, [campaignId]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/campaigns/${campaignId}/timeline`);
      setEvents(response.data.events || []);
    } catch (error) {
      // If endpoint doesn't exist, use empty array
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    try {
      const eventData = {
        ...newEvent,
        campaign_id: campaignId,
        created_at: new Date().toISOString()
      };
      
      const response = await axios.post(`${API}/campaigns/${campaignId}/timeline`, eventData);
      setEvents(prev => [...prev, response.data].sort((a, b) => 
        (b.session_number || 0) - (a.session_number || 0)
      ));
      setNewEvent({ type: 'session', title: '', description: '', session_number: '', in_game_date: '' });
      setShowAddForm(false);
      toast.success('Event added to timeline!');
    } catch (error) {
      // Fallback to local state
      const localEvent = {
        id: Date.now().toString(),
        ...newEvent,
        campaign_id: campaignId,
        created_at: new Date().toISOString()
      };
      setEvents(prev => [...prev, localEvent].sort((a, b) => 
        (b.session_number || 0) - (a.session_number || 0)
      ));
      setNewEvent({ type: 'session', title: '', description: '', session_number: '', in_game_date: '' });
      setShowAddForm(false);
      toast.success('Event added locally!');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this timeline event?')) return;
    
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/timeline/${eventId}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Event deleted');
    } catch (error) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success('Event removed');
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const session = event.session_number || 'Unassigned';
    if (!acc[session]) acc[session] = [];
    acc[session].push(event);
    return acc;
  }, {});

  const getEventType = (typeId) => EVENT_TYPES.find(t => t.id === typeId) || EVENT_TYPES[0];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.muted }}>
        Loading timeline...
      </div>
    );
  }

  return (
    <div style={{
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center', 
        marginBottom: '24px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: theme.subtle,
            border: `1px solid ${theme.primary}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={20} color={theme.primary} />
          </div>
          <div>
            <h3 style={{ 
              color: theme.primary, 
              fontSize: '18px', 
              fontWeight: '400',
              margin: 0,
              fontFamily: "Inter, sans-serif"
            }}>
              SESSION TIMELINE
            </h3>
            <p style={{ color: theme.muted, fontSize: '13px', margin: 0 }}>
              Track major events in your campaign
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: theme.primary,
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '400'
          }}
        >
          <Plus size={16} />
          Add Event
        </Button>
      </div>

      {/* Add Event Form */}
      {showAddForm && (
        <div style={{
          background: theme.bg,
          border: `1px solid ${theme.primary}`,
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ color: theme.text, fontSize: '14px', fontWeight: '400', marginBottom: '16px' }}>
            New Timeline Event
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Event Type
              </label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  color: theme.text
                }}
              >
                {EVENT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
                Session #
              </label>
              <Input
                type="number"
                value={newEvent.session_number}
                onChange={(e) => setNewEvent({ ...newEvent, session_number: e.target.value })}
                placeholder="1"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
                In-Game Date
              </label>
              <Input
                value={newEvent.in_game_date}
                onChange={(e) => setNewEvent({ ...newEvent, in_game_date: e.target.value })}
                placeholder="Day 15, Spring"
                style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
              Event Title *
            </label>
            <Input
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="What happened?"
              style={{ background: theme.card, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: theme.muted, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase' }}>
              Description
            </label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="More details about this event..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '10px',
                background: theme.card,
                border: `1px solid ${theme.border}`,
                color: theme.text,
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              onClick={handleAddEvent}
              style={{ background: theme.primary, border: 'none', color: '#fff', padding: '10px 20px' }}
            >
              <Save size={16} style={{ marginRight: '8px' }} />
              Save Event
            </Button>
            <Button
              onClick={() => setShowAddForm(false)}
              style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.muted, padding: '10px 20px' }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px',
            background: filter === 'all' ? theme.subtle : 'transparent',
            border: `1px solid ${filter === 'all' ? theme.primary : theme.border}`,
            color: filter === 'all' ? theme.primary : theme.muted,
            fontSize: '12px',
            fontWeight: '400',
            cursor: 'pointer'
          }}
        >
          All ({events.length})
        </button>
        {EVENT_TYPES.map(type => {
          const count = events.filter(e => e.type === type.id).length;
          if (count === 0) return null;
          return (
            <button
              key={type.id}
              onClick={() => setFilter(type.id)}
              style={{
                padding: '6px 14px',
                background: filter === type.id ? `${type.color}20` : 'transparent',
                border: `1px solid ${filter === type.id ? type.color : theme.border}`,
                color: filter === type.id ? type.color : theme.muted,
                fontSize: '12px',
                fontWeight: '400',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <type.icon size={12} />
              {type.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: 0,
          bottom: 0,
          width: '2px',
          background: `linear-gradient(180deg, ${theme.primary}, ${theme.border})`
        }} />

        {events.length === 0 ? (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            marginLeft: '40px'
          }}>
            <Clock size={48} style={{ color: theme.muted, opacity: 0.3, marginBottom: '16px' }} />
            <h4 style={{ color: theme.text, margin: '0 0 8px' }}>No Events Yet</h4>
            <p style={{ color: theme.muted, margin: 0, fontSize: '14px' }}>
              Start adding events to build your campaign timeline
            </p>
          </div>
        ) : (
          Object.entries(groupedEvents)
            .sort(([a], [b]) => (parseInt(b) || 0) - (parseInt(a) || 0))
            .map(([session, sessionEvents]) => (
            <div key={session} style={{ marginBottom: '24px' }}>
              {/* Session marker */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  background: theme.primary,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}>
                  <span style={{ color: '#fff', fontWeight: '400', fontSize: '14px' }}>
                    {session === 'Unassigned' ? '?' : session}
                  </span>
                </div>
                <h4 style={{ 
                  color: theme.text, 
                  fontSize: '16px', 
                  fontWeight: '400',
                  margin: 0 
                }}>
                  {session === 'Unassigned' ? 'Unassigned Events' : `Session ${session}`}
                </h4>
              </div>

              {/* Events in this session */}
              <div style={{ marginLeft: '54px' }}>
                {sessionEvents.map((event) => {
                  const eventType = getEventType(event.type);
                  return (
                    <div
                      key={event.id}
                      style={{
                        background: theme.bg,
                        border: `1px solid ${theme.border}`,
                        borderLeft: `3px solid ${eventType.color}`,
                        padding: '16px',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <eventType.icon size={14} color={eventType.color} />
                            <span style={{ color: eventType.color, fontSize: '11px', fontWeight: '400', textTransform: 'uppercase' }}>
                              {eventType.label}
                            </span>
                            {event.in_game_date && (
                              <span style={{ color: theme.muted, fontSize: '11px' }}>
                                • {event.in_game_date}
                              </span>
                            )}
                          </div>
                          <h5 style={{ color: theme.text, fontSize: '15px', fontWeight: '400', margin: '0 0 6px' }}>
                            {event.title}
                          </h5>
                          {event.description && (
                            <p style={{ color: theme.textSecondary, fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                              {event.description}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleDeleteEvent(event.id)}
                          style={{
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: theme.muted
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default SessionTimeline;
