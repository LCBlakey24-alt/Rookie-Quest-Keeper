import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, ChevronRight, Edit, Plus, Save, Settings, Trash2, X } from 'lucide-react';
import apiClient from '@/lib/apiClient';

const PRESET_CALENDARS = {
  gregorian: {
    name: 'Gregorian (Real World)',
    months: [
      { name: 'January', days: 31 }, { name: 'February', days: 28 },
      { name: 'March', days: 31 }, { name: 'April', days: 30 },
      { name: 'May', days: 31 }, { name: 'June', days: 30 },
      { name: 'July', days: 31 }, { name: 'August', days: 31 },
      { name: 'September', days: 30 }, { name: 'October', days: 31 },
      { name: 'November', days: 30 }, { name: 'December', days: 31 },
    ],
  },
};

const emptyEvent = {
  name: '',
  description: '',
  day: 1,
  month: 1,
  year: 1,
  is_recurring: false,
  recurrence_type: 'none',
};

function getDaysUntil(event, calendar) {
  if (!calendar) return 0;
  const currentYear = calendar.current_year;
  const currentMonth = calendar.current_month;
  const currentDay = calendar.current_day;
  if (event.year > currentYear) return 999;
  if (event.year < currentYear) return -1;
  if (event.month > currentMonth) return ((event.month - currentMonth) * 30) + (event.day - currentDay);
  if (event.month < currentMonth) return -1;
  return event.day - currentDay;
}

function CalendarTab({ campaignId }) {
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [advanceDays, setAdvanceDays] = useState(1);
  const [showCalendarBuilder, setShowCalendarBuilder] = useState(false);
  const [customMonths, setCustomMonths] = useState([{ name: 'Month 1', days: 30 }]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [calendarRes, eventsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/calendar`),
        apiClient.get(`/campaigns/${campaignId}/calendar-events`),
      ]);
      setCalendar(calendarRes.data);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      if (calendarRes.data?.custom_months?.length) setCustomMonths(calendarRes.data.custom_months);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const currentMonth = calendar?.custom_months?.[Math.max(0, (calendar?.current_month || 1) - 1)] || { name: 'Month', days: 30 };

  const upcomingEvents = events
    .map(event => ({ ...event, daysUntil: getDaysUntil(event, calendar) }))
    .filter(event => event.daysUntil >= 0 && event.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }), [events]);

  const handleAdvanceTime = async () => {
    try {
      await apiClient.post(`/campaigns/${campaignId}/calendar/advance?days=${advanceDays}`);
      toast.success(`Advanced ${advanceDays} day(s)`);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to advance time');
    }
  };

  const handleChangeCalendarType = async (type) => {
    if (type === 'custom') {
      setShowCalendarBuilder(true);
      return;
    }
    try {
      await apiClient.put(`/campaigns/${campaignId}/calendar`, {
        calendar_type: type,
        custom_months: PRESET_CALENDARS[type].months,
      });
      toast.success('Calendar type changed');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to change calendar');
    }
  };

  const handleSaveCustomCalendar = async () => {
    if (customMonths.length === 0) return toast.error('Add at least one month');
    if (customMonths.some(month => !month.name.trim())) return toast.error('All months must have a name');

    try {
      await apiClient.put(`/campaigns/${campaignId}/calendar`, {
        calendar_type: 'custom',
        custom_months: customMonths,
      });
      toast.success('Custom calendar saved');
      setShowCalendarBuilder(false);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save calendar');
    }
  };

  const addMonth = () => setCustomMonths(prev => [...prev, { name: `Month ${prev.length + 1}`, days: 30 }]);
  const removeMonth = (index) => {
    if (customMonths.length <= 1) return toast.error('Calendar must have at least one month');
    setCustomMonths(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };
  const updateMonth = (index, field, value) => {
    setCustomMonths(prev => prev.map((month, itemIndex) => itemIndex === index ? {
      ...month,
      [field]: field === 'days' ? Math.max(1, parseInt(value, 10) || 1) : value,
    } : month));
  };

  const handleSaveEvent = async (event) => {
    event.preventDefault();
    try {
      if (editingEvent) {
        await apiClient.put(`/campaigns/${campaignId}/calendar-events/${editingEvent.id}`, eventForm);
        toast.success('Event updated');
      } else {
        await apiClient.post(`/campaigns/${campaignId}/calendar-events`, eventForm);
        toast.success('Event added');
      }
      resetEventForm();
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to save event');
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      name: event.name || '',
      description: event.description || '',
      day: event.day || 1,
      month: event.month || 1,
      year: event.year || 1,
      is_recurring: event.is_recurring || false,
      recurrence_type: event.recurrence_type || 'none',
    });
    setShowEventDialog(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await apiClient.delete(`/campaigns/${campaignId}/calendar-events/${eventId}`);
      toast.success('Event deleted');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to delete event');
    }
  };

  const resetEventForm = () => {
    setEventForm(emptyEvent);
    setEditingEvent(null);
    setShowEventDialog(false);
  };

  if (loading) return <div className="loading-spinner"></div>;
  if (!calendar) return <Card className="parchment-dark" style={{ padding: 24 }}><p style={{ color: '#D1D5DB' }}>Calendar could not be loaded.</p></Card>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 380px)', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <h2 className="medieval-heading" style={{ fontSize: 28, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 10 }}><CalendarIcon size={24} /> Campaign Calendar</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select data-testid="calendar-type-select" value={calendar.calendar_type} onChange={e => handleChangeCalendarType(e.target.value)} className="input clickable-box" style={{ width: 'auto' }}>
              <option value="gregorian">Gregorian</option>
              <option value="custom">Custom Calendar</option>
            </select>
            <Button data-testid="customize-calendar-btn" onClick={() => setShowCalendarBuilder(true)} className="btn-secondary clickable-box"><Settings size={16} /> Customize</Button>
          </div>
        </div>

        <Dialog open={showCalendarBuilder} onOpenChange={setShowCalendarBuilder}>
          <DialogContent className="modal" style={{ maxWidth: 720, maxHeight: '85vh', overflow: 'auto' }}>
            <DialogHeader><DialogTitle className="medieval-heading" style={{ color: '#FFFFFF' }}>Custom Calendar Builder</DialogTitle></DialogHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0' }}>
              <p style={{ color: '#D1D5DB', margin: 0 }}>Add custom months and day counts.</p>
              <Button data-testid="add-month-btn" onClick={addMonth} className="btn-primary"><Plus size={16} /> Add Month</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customMonths.map((month, index) => (
                <div key={`${month.name}-${index}`} data-testid={`month-row-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 42px', gap: 8, alignItems: 'center' }}>
                  <Input data-testid={`month-name-${index}`} value={month.name} onChange={e => updateMonth(index, 'name', e.target.value)} className="input" />
                  <Input data-testid={`month-days-${index}`} type="number" min="1" value={month.days} onChange={e => updateMonth(index, 'days', e.target.value)} className="input" />
                  <Button data-testid={`remove-month-${index}`} onClick={() => removeMonth(index)} className="btn-icon" style={{ color: '#EF4444' }}><X size={16} /></Button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button type="button" onClick={() => setShowCalendarBuilder(false)} className="btn-secondary">Cancel</Button>
              <Button data-testid="save-custom-calendar-btn" onClick={handleSaveCustomCalendar} className="btn-primary"><Save size={16} /> Save Calendar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="parchment-dark" style={{ padding: 30, textAlign: 'center', marginBottom: 18 }}>
          <h3 className="medieval-heading" style={{ fontSize: 42, color: '#EF4444', marginBottom: 8 }}>{currentMonth.name} {calendar.current_day}, {calendar.current_year}</h3>
          <p style={{ color: '#FFFFFF', fontSize: 16 }}>Current In-Game Date</p>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input data-testid="advance-days-input" type="number" min="1" value={advanceDays} onChange={e => setAdvanceDays(parseInt(e.target.value, 10) || 1)} className="input" style={{ width: 80, textAlign: 'center' }} />
            <span style={{ color: '#D1D5DB' }}>day(s)</span>
            <Button data-testid="advance-time-btn" onClick={handleAdvanceTime} className="btn-primary clickable-box"><ChevronRight size={16} /> Advance Time</Button>
          </div>
        </Card>

        <Card className="parchment-dark" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h3 className="medieval-heading" style={{ fontSize: 22, color: '#FFFFFF', margin: 0 }}>All Events</h3>
            <Dialog open={showEventDialog} onOpenChange={(open) => { if (!open) resetEventForm(); setShowEventDialog(open); }}>
              <DialogTrigger asChild><Button data-testid="add-event-btn" className="btn-primary clickable-box"><Plus size={16} /> Add Event</Button></DialogTrigger>
              <DialogContent className="modal">
                <DialogHeader><DialogTitle className="medieval-heading" style={{ color: '#FFFFFF' }}>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSaveEvent} style={{ marginTop: 16 }}>
                  <Field label="Event Name"><Input data-testid="event-name-input" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} className="input" required /></Field>
                  <Field label="Description"><textarea data-testid="event-description-input" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="textarea" /></Field>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <Field label="Day"><Input data-testid="event-day-input" type="number" min="1" value={eventForm.day} onChange={e => setEventForm({ ...eventForm, day: parseInt(e.target.value, 10) || 1 })} className="input" /></Field>
                    <Field label="Month"><select data-testid="event-month-select" value={eventForm.month} onChange={e => setEventForm({ ...eventForm, month: parseInt(e.target.value, 10) || 1 })} className="input">{calendar.custom_months.map((month, index) => <option key={month.name} value={index + 1}>{month.name}</option>)}</select></Field>
                    <Field label="Year"><Input data-testid="event-year-input" type="number" value={eventForm.year} onChange={e => setEventForm({ ...eventForm, year: parseInt(e.target.value, 10) || 1 })} className="input" /></Field>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF', margin: '14px 0' }}><input type="checkbox" checked={eventForm.is_recurring} onChange={e => setEventForm({ ...eventForm, is_recurring: e.target.checked })} /> Recurring Event</label>
                  {eventForm.is_recurring && <select value={eventForm.recurrence_type} onChange={e => setEventForm({ ...eventForm, recurrence_type: e.target.value })} className="input" style={{ marginBottom: 14 }}><option value="annual">Yearly</option><option value="monthly">Monthly</option></select>}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <Button type="button" className="btn-secondary clickable-box" onClick={resetEventForm}>Cancel</Button>
                    <Button data-testid="event-submit-btn" type="submit" className="btn-primary">{editingEvent ? 'Update' : 'Add'} Event</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {sortedEvents.length === 0 ? <p style={{ textAlign: 'center', color: '#D1D5DB', padding: 20 }}>No events scheduled</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedEvents.map(event => <EventRow key={event.id} event={event} calendar={calendar} daysUntil={getDaysUntil(event, calendar)} onEdit={() => handleEditEvent(event)} onDelete={() => handleDeleteEvent(event.id)} />)}
            </div>
          )}
        </Card>
      </div>

      <aside style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
        <Card className="parchment-dark" style={{ border: '1px solid rgba(239,68,68,0.42)' }}>
          <CardHeader><CardTitle className="medieval-heading" style={{ color: '#FFFFFF', fontSize: 19 }}>Upcoming (30 days)</CardTitle></CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? <p style={{ color: '#D1D5DB', textAlign: 'center' }}>No events in the next 30 days</p> : upcomingEvents.map(event => {
              const monthName = calendar.custom_months[event.month - 1]?.name || 'Month';
              return <div key={event.id} style={{ padding: 12, background: event.daysUntil === 0 ? 'rgba(239,68,68,0.20)' : '#1F1F23', border: '1px solid rgba(239,68,68,0.35)', marginBottom: 10 }}><h5 style={{ color: '#FFFFFF', margin: '0 0 4px' }}>{event.name}</h5><p style={{ color: '#D1D5DB', margin: 0, fontSize: 12 }}>{monthName} {event.day}</p><strong style={{ color: '#EF4444', fontSize: 13 }}>{event.daysUntil === 0 ? 'TODAY!' : `${event.daysUntil} day(s)`}</strong></div>;
            })}
          </CardContent>
        </Card>
        <Card className="parchment-dark" style={{ marginTop: 14 }}>
          <CardContent style={{ padding: 16 }}>
            <h4 style={{ color: '#FFFFFF', margin: '0 0 10px' }}>Calendar Info</h4>
            <p style={{ color: '#D1D5DB', fontSize: 13 }}>Type: <span style={{ color: '#EF4444' }}>{calendar.calendar_type === 'custom' ? 'Custom' : PRESET_CALENDARS[calendar.calendar_type]?.name || calendar.calendar_type}</span></p>
            <p style={{ color: '#D1D5DB', fontSize: 13 }}>Months: <span style={{ color: '#EF4444' }}>{calendar.custom_months.length}</span></p>
            <p style={{ color: '#D1D5DB', fontSize: 13 }}>Days/Year: <span style={{ color: '#EF4444' }}>{calendar.custom_months.reduce((sum, month) => sum + month.days, 0)}</span></p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}><label style={{ display: 'block', color: '#FFFFFF', marginBottom: 6, fontSize: 13 }}>{label}</label>{children}</div>;
}

function EventRow({ event, calendar, daysUntil, onEdit, onDelete }) {
  const monthName = calendar.custom_months[event.month - 1]?.name || 'Month';
  const isPast = daysUntil < 0;
  const isToday = daysUntil === 0;
  return (
    <div data-testid={`event-${event.id}`} className="initiative-entry" style={{ borderLeftColor: isToday ? '#EF4444' : isPast ? '#6B7280' : '#D1D5DB', opacity: isPast ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ color: '#FFFFFF', margin: '0 0 4px', fontSize: 16 }}>{event.name}</h4>
          <p style={{ color: '#D1D5DB', margin: '0 0 4px', fontSize: 13 }}>{monthName} {event.day}, {event.year}{event.is_recurring && <span style={{ marginLeft: 8, color: '#EF4444' }}>(Recurring)</span>}</p>
          {!isPast && daysUntil <= 30 && <p style={{ color: isToday ? '#EF4444' : '#D1D5DB', fontWeight: 900, margin: '0 0 6px', fontSize: 12 }}>{isToday ? 'TODAY!' : `In ${daysUntil} day(s)`}</p>}
          {event.description && <p style={{ color: '#FFFFFF', fontSize: 13, margin: 0 }}>{event.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button data-testid={`edit-event-btn-${event.id}`} onClick={onEdit} className="btn-icon"><Edit size={14} /></Button>
          <Button data-testid={`delete-event-btn-${event.id}`} onClick={onDelete} className="btn-icon" style={{ color: '#EF4444' }}><Trash2 size={14} /></Button>
        </div>
      </div>
    </div>
  );
}

export default CalendarTab;
