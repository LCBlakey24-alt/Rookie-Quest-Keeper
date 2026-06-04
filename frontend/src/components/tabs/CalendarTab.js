import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, ChevronRight, Edit, Plus, Save, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const emptyEvent = { name: '', description: '', day: 1, month: 1, year: 1, is_recurring: false, recurrence_type: 'none' };
const fallbackCalendar = { calendar_type: 'gregorian', current_day: 1, current_month: 1, current_year: 1, custom_months: [{ name: 'Month 1', days: 30 }] };

function getDaysUntil(event, calendar) {
  if (!calendar) return 0;
  if (event.year > calendar.current_year) return 999;
  if (event.year < calendar.current_year) return -1;
  if (event.month > calendar.current_month) return ((event.month - calendar.current_month) * 30) + (event.day - calendar.current_day);
  if (event.month < calendar.current_month) return -1;
  return event.day - calendar.current_day;
}

export default function CalendarTab({ campaignId }) {
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advanceDays, setAdvanceDays] = useState(1);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);

  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const [calendarRes, eventsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/calendar`),
        apiClient.get(`/campaigns/${campaignId}/calendar-events`),
      ]);
      setCalendar(calendarRes.data || fallbackCalendar);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load calendar');
      setCalendar(fallbackCalendar);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }), [events]);

  const upcomingEvents = useMemo(() => events
    .map(event => ({ ...event, daysUntil: getDaysUntil(event, calendar) }))
    .filter(event => event.daysUntil >= 0 && event.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil), [events, calendar]);

  const currentMonth = calendar?.custom_months?.[(calendar.current_month || 1) - 1]?.name || 'Month';

  const saveEvent = async (event) => {
    event.preventDefault();
    try {
      if (editingEvent) {
        await apiClient.put(`/campaigns/${campaignId}/calendar-events/${editingEvent.id}`, eventForm);
        toast.success('Event updated');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/calendar-events`, eventForm);
        toast.success('Event added');
      }
      setEditingEvent(null);
      setEventForm(emptyEvent);
      loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save event');
    }
  };

  const editEvent = (event) => {
    setEditingEvent(event);
    setEventForm({ ...emptyEvent, ...event });
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/calendar-events/${eventId}`);
      toast.success('Event deleted');
      loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete event');
    }
  };

  const advanceTime = async () => {
    try {
      await apiClient.post(`/campaigns/${campaignId}/calendar/advance?days=${advanceDays}`);
      toast.success(`Advanced ${advanceDays} day(s)`);
      loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to advance time');
    }
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
      <main>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h2 style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}><CalendarIcon size={22} /> Campaign Calendar</h2>
        </header>

        <section className="parchment-dark" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#EF4444', fontSize: 34, margin: '0 0 6px' }}>{currentMonth} {calendar?.current_day || 1}, {calendar?.current_year || 1}</h3>
          <p style={{ color: '#D1D5DB', margin: '0 0 14px' }}>Current in-game date</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input data-testid="advance-days-input" type="number" min="1" value={advanceDays} onChange={e => setAdvanceDays(parseInt(e.target.value, 10) || 1)} className="input" style={{ width: 80, textAlign: 'center' }} />
            <button data-testid="advance-time-btn" type="button" onClick={advanceTime} className="btn-primary"><ChevronRight size={16} /> Advance Time</button>
          </div>
        </section>

        <section className="parchment-dark" style={{ padding: 18, marginBottom: 16 }}>
          <h3 style={{ color: '#FFFFFF', marginTop: 0 }}>{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
          <form onSubmit={saveEvent} style={{ display: 'grid', gap: 10 }}>
            <input data-testid="event-name-input" className="input" placeholder="Event name" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} required />
            <textarea data-testid="event-description-input" className="textarea" placeholder="Description" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <input data-testid="event-day-input" className="input" type="number" min="1" value={eventForm.day} onChange={e => setEventForm({ ...eventForm, day: parseInt(e.target.value, 10) || 1 })} />
              <input data-testid="event-month-input" className="input" type="number" min="1" value={eventForm.month} onChange={e => setEventForm({ ...eventForm, month: parseInt(e.target.value, 10) || 1 })} />
              <input data-testid="event-year-input" className="input" type="number" value={eventForm.year} onChange={e => setEventForm({ ...eventForm, year: parseInt(e.target.value, 10) || 1 })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {editingEvent && <button type="button" className="btn-secondary" onClick={() => { setEditingEvent(null); setEventForm(emptyEvent); }}>Cancel</button>}
              <button data-testid="event-submit-btn" type="submit" className="btn-primary"><Save size={16} /> {editingEvent ? 'Update' : 'Add'} Event</button>
            </div>
          </form>
        </section>

        <section className="parchment-dark" style={{ padding: 18 }}>
          <h3 style={{ color: '#FFFFFF', marginTop: 0 }}>All Events</h3>
          {sortedEvents.length === 0 ? <p style={{ color: '#D1D5DB' }}>No events scheduled.</p> : sortedEvents.map(event => {
            const monthName = calendar?.custom_months?.[event.month - 1]?.name || `Month ${event.month}`;
            return (
              <article key={event.id} data-testid={`event-${event.id}`} className="initiative-entry" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <h4 style={{ color: '#FFFFFF', margin: '0 0 4px' }}>{event.name}</h4>
                    <p style={{ color: '#D1D5DB', margin: 0 }}>{monthName} {event.day}, {event.year}</p>
                    {event.description && <p style={{ color: '#FFFFFF', margin: '6px 0 0' }}>{event.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button data-testid={`edit-event-btn-${event.id}`} type="button" className="btn-icon" onClick={() => editEvent(event)}><Edit size={14} /></button>
                    <button data-testid={`delete-event-btn-${event.id}`} type="button" className="btn-icon" onClick={() => deleteEvent(event.id)} style={{ color: '#EF4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <aside className="parchment-dark" style={{ padding: 16, height: 'fit-content' }}>
        <h3 style={{ color: '#FFFFFF', marginTop: 0 }}>Upcoming 30 Days</h3>
        {upcomingEvents.length === 0 ? <p style={{ color: '#D1D5DB' }}>No upcoming events.</p> : upcomingEvents.map(event => (
          <div key={event.id} style={{ border: '1px solid rgba(239,68,68,0.35)', padding: 10, marginBottom: 8 }}>
            <strong style={{ color: '#FFFFFF' }}>{event.name}</strong>
            <p style={{ color: '#EF4444', margin: '4px 0 0' }}>{event.daysUntil === 0 ? 'Today' : `${event.daysUntil} day(s)`}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
