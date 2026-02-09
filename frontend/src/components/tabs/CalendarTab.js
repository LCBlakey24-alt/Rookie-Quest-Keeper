import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ChevronRight, ChevronLeft, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PRESET_CALENDARS = {
  gregorian: {
    name: "Gregorian (Real World)",
    months: [
      {name: "January", days: 31}, {name: "February", days: 28},
      {name: "March", days: 31}, {name: "April", days: 30},
      {name: "May", days: 31}, {name: "June", days: 30},
      {name: "July", days: 31}, {name: "August", days: 31},
      {name: "September", days: 30}, {name: "October", days: 31},
      {name: "November", days: 30}, {name: "December", days: 31}
    ]
  },
  forgotten_realms: {
    name: "Forgotten Realms (D&D)",
    months: [
      {name: "Hammer", days: 30}, {name: "Alturiak", days: 30},
      {name: "Ches", days: 30}, {name: "Tarsakh", days: 30},
      {name: "Mirtul", days: 30}, {name: "Kythorn", days: 30},
      {name: "Flamerule", days: 30}, {name: "Eleasis", days: 30},
      {name: "Eleint", days: 30}, {name: "Marpenoth", days: 30},
      {name: "Uktar", days: 30}, {name: "Nightal", days: 30}
    ]
  },
  custom: {
    name: "Custom Calendar",
    months: [
      {name: "Month 1", days: 30},
      {name: "Month 2", days: 30},
      {name: "Month 3", days: 30}
    ]
  }
};

function CalendarTab({ campaignId }) {
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ name: '', description: '', day: 1, month: 1, year: 1 });
  const [advanceDays, setAdvanceDays] = useState(1);
  const [showCalendarBuilder, setShowCalendarBuilder] = useState(false);
  const [customMonths, setCustomMonths] = useState([{ name: 'Month 1', days: 30 }]);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    try {
      const [calendarRes, eventsRes] = await Promise.all([
        axios.get(`${API}/campaigns/${campaignId}/calendar`),
        axios.get(`${API}/campaigns/${campaignId}/calendar-events`)
      ]);
      setCalendar(calendarRes.data);
      setEvents(eventsRes.data);
      if (calendarRes.data.calendar_type === 'custom') {
        setCustomMonths(calendarRes.data.custom_months);
      }
    } catch (error) {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceTime = async () => {
    try {
      await axios.post(`${API}/campaigns/${campaignId}/calendar/advance?days=${advanceDays}`);
      toast.success(`Advanced ${advanceDays} day(s)`);
      fetchData();
    } catch (error) {
      toast.error('Failed to advance time');
    }
  };

  const handleSetDate = async (day, month, year) => {
    try {
      await axios.put(`${API}/campaigns/${campaignId}/calendar`, {
        current_day: day,
        current_month: month,
        current_year: year
      });
      toast.success('Date updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update date');
    }
  };

  const handleChangeCalendarType = async (type) => {
    try {
      await axios.put(`${API}/campaigns/${campaignId}/calendar`, {
        calendar_type: type,
        custom_months: PRESET_CALENDARS[type].months
      });
      toast.success('Calendar type changed');
      if (type === 'custom') {
        setShowCalendarBuilder(true);
      }
      fetchData();
    } catch (error) {
      toast.error('Failed to change calendar');
    }
  };

  const handleSaveCustomCalendar = async () => {
    if (customMonths.length === 0) {
      toast.error('Add at least one month');
      return;
    }
    try {
      await axios.put(`${API}/campaigns/${campaignId}/calendar`, {
        calendar_type: 'custom',
        custom_months: customMonths
      });
      toast.success('Custom calendar saved!');
      setShowCalendarBuilder(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save calendar');
    }
  };

  const addMonth = () => {
    setCustomMonths([...customMonths, { name: `Month ${customMonths.length + 1}`, days: 30 }]);
  };

  const removeMonth = (index) => {
    if (customMonths.length <= 1) {
      toast.error('Calendar must have at least one month');
      return;
    }
    setCustomMonths(customMonths.filter((_, i) => i !== index));
  };

  const updateMonth = (index, field, value) => {
    const updated = [...customMonths];
    updated[index][field] = field === 'days' ? parseInt(value) || 1 : value;
    setCustomMonths(updated);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await axios.put(`${API}/campaigns/${campaignId}/calendar-events/${editingEvent.id}`, eventForm);
        toast.success('Event updated!');
      } else {
        await axios.post(`${API}/campaigns/${campaignId}/calendar-events`, eventForm);
        toast.success('Event added!');
      }
      fetchData();
      resetEventForm();
    } catch (error) {
      toast.error('Failed to save event');
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({ name: event.name, description: event.description, day: event.day, month: event.month, year: event.year });
    setShowEventDialog(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await axios.delete(`${API}/campaigns/${campaignId}/calendar-events/${eventId}`);
      toast.success('Event deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const resetEventForm = () => {
    setEventForm({ name: '', description: '', day: 1, month: 1, year: 1 });
    setEditingEvent(null);
    setShowEventDialog(false);
  };

  const calculateDaysUntil = (event) => {
    if (!calendar) return 0;
    
    const currentDate = {
      year: calendar.current_year,
      month: calendar.current_month,
      day: calendar.current_day
    };
    
    const eventDate = {
      year: event.year,
      month: event.month,
      day: event.day
    };
    
    // Simple calculation - could be more sophisticated
    if (eventDate.year > currentDate.year) {
      return 999; // Far future
    } else if (eventDate.year < currentDate.year) {
      return -1; // Past
    }
    
    if (eventDate.month > currentDate.month) {
      return (eventDate.month - currentDate.month) * 30 + (eventDate.day - currentDate.day);
    } else if (eventDate.month < currentDate.month) {
      return -1; // Past
    }
    
    return eventDate.day - currentDate.day;
  };

  const getUpcomingEvents = () => {
    return events
      .map(event => ({ ...event, daysUntil: calculateDaysUntil(event) }))
      .filter(event => event.daysUntil >= 0 && event.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (!calendar) return null;

  const currentMonth = calendar.custom_months[calendar.current_month - 1];
  const upcomingEvents = getUpcomingEvents();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
      {/* Main Calendar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#d4af37' }}>Campaign Calendar</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              data-testid="calendar-type-select"
              value={calendar.calendar_type}
              onChange={(e) => handleChangeCalendarType(e.target.value)}
              className="input"
              style={{ width: 'auto', cursor: 'pointer' }}
            >
              <option value="gregorian">Gregorian</option>
              <option value="forgotten_realms">Forgotten Realms</option>
            </select>
          </div>
        </div>

        {/* Current Date Display */}
        <Card className="parchment-dark" style={{ marginBottom: '24px', padding: '32px', textAlign: 'center' }}>
          <h3 className="medieval-heading" style={{ fontSize: '48px', color: '#d4af37', marginBottom: '8px' }}>
            {currentMonth?.name || 'Month'} {calendar.current_day}, {calendar.current_year}
          </h3>
          <p style={{ fontSize: '18px', color: '#8b7355' }}>Current In-Game Date</p>
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
            <Input
              data-testid="advance-days-input"
              type="number"
              min="1"
              value={advanceDays}
              onChange={(e) => setAdvanceDays(parseInt(e.target.value) || 1)}
              className="input"
              style={{ width: '80px', textAlign: 'center' }}
            />
            <span style={{ color: '#8b7355' }}>day(s)</span>
            <Button
              data-testid="advance-time-btn"
              onClick={handleAdvanceTime}
              className="btn-primary"
              style={{ display: 'flex', gap: '8px' }}
            >
              <ChevronRight size={16} />
              Advance Time
            </Button>
          </div>
        </Card>

        {/* All Events List */}
        <Card className="parchment-dark" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>All Events</h3>
            <Dialog open={showEventDialog} onOpenChange={(open) => { if (!open) resetEventForm(); setShowEventDialog(open); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-event-btn" className="btn-primary" style={{ display: 'flex', gap: '8px' }}>
                  <Plus size={16} />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="modal">
                <DialogHeader>
                  <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#d4af37' }}>
                    {editingEvent ? 'Edit Event' : 'Add Event'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveEvent} style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Event Name</label>
                    <Input
                      data-testid="event-name-input"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Description</label>
                    <textarea
                      data-testid="event-description-input"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="textarea"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                    <div>
                      <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Day</label>
                      <Input
                        data-testid="event-day-input"
                        type="number"
                        min="1"
                        max="31"
                        value={eventForm.day}
                        onChange={(e) => setEventForm({ ...eventForm, day: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Month</label>
                      <select
                        data-testid="event-month-select"
                        value={eventForm.month}
                        onChange={(e) => setEventForm({ ...eventForm, month: parseInt(e.target.value) })}
                        className="input"
                      >
                        {calendar.custom_months.map((month, idx) => (
                          <option key={idx} value={idx + 1}>{month.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="gold-text" style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Year</label>
                      <Input
                        data-testid="event-year-input"
                        type="number"
                        value={eventForm.year}
                        onChange={(e) => setEventForm({ ...eventForm, year: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button type="button" className="btn-secondary" onClick={resetEventForm}>Cancel</Button>
                    <Button data-testid="event-submit-btn" type="submit" className="btn-primary">
                      {editingEvent ? 'Update' : 'Add'} Event
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {events.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8b7355', padding: '20px' }}>No events scheduled</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                if (a.month !== b.month) return a.month - b.month;
                return a.day - b.day;
              }).map(event => {
                const monthName = calendar.custom_months[event.month - 1]?.name || 'Month';
                const daysUntil = calculateDaysUntil(event);
                const isPast = daysUntil < 0;
                const isToday = daysUntil === 0;
                
                return (
                  <div
                    key={event.id}
                    data-testid={`event-${event.id}`}
                    className="initiative-entry"
                    style={{
                      borderLeftColor: isToday ? '#22c55e' : isPast ? '#6b7280' : '#d4af37',
                      opacity: isPast ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 className="gold-text" style={{ fontSize: '16px', marginBottom: '4px' }}>{event.name}</h4>
                        <p style={{ fontSize: '13px', color: '#8b7355', marginBottom: '4px' }}>
                          {monthName} {event.day}, {event.year}
                        </p>
                        {!isPast && daysUntil <= 30 && (
                          <p style={{ 
                            fontSize: '12px', 
                            color: isToday ? '#22c55e' : '#d4af37',
                            fontWeight: '600'
                          }}>
                            {isToday ? 'TODAY!' : `In ${daysUntil} day(s)`}
                          </p>
                        )}
                        {event.description && (
                          <p style={{ fontSize: '13px', color: '#e8dcc4', marginTop: '8px' }}>{event.description}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          data-testid={`edit-event-btn-${event.id}`}
                          onClick={() => handleEditEvent(event)}
                          className="btn-icon"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          data-testid={`delete-event-btn-${event.id}`}
                          onClick={() => handleDeleteEvent(event.id)}
                          className="btn-icon"
                          style={{ color: '#dc143c' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Upcoming Events Sidebar */}
      <div style={{ position: 'sticky', top: '20px', height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '2px solid #d4af37' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#d4af37' }}>
              Upcoming (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#8b7355', textAlign: 'center', padding: '20px' }}>
                No events in the next 30 days
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingEvents.map(event => {
                  const monthName = calendar.custom_months[event.month - 1]?.name || 'Month';
                  return (
                    <div
                      key={event.id}
                      style={{
                        padding: '12px',
                        background: event.daysUntil === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(212, 175, 55, 0.1)',
                        border: '1px solid',
                        borderColor: event.daysUntil === 0 ? '#22c55e' : '#5a4a2f',
                        borderRadius: '8px'
                      }}
                    >
                      <h5 className="gold-text" style={{ fontSize: '14px', marginBottom: '4px' }}>{event.name}</h5>
                      <p style={{ fontSize: '12px', color: '#8b7355', marginBottom: '6px' }}>
                        {monthName} {event.day}
                      </p>
                      <p style={{ 
                        fontSize: '13px', 
                        fontWeight: '700',
                        color: event.daysUntil === 0 ? '#22c55e' : '#d4af37'
                      }}>
                        {event.daysUntil === 0 ? 'TODAY!' : `${event.daysUntil} day(s)`}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CalendarTab;
