import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ChevronRight, Save, Settings, X } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const API = API_BASE;

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
  }
};

function CalendarTab({ campaignId }) {
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ 
    name: '', 
    description: '', 
    day: 1, 
    month: 1, 
    year: 1,
    is_recurring: false,
    recurrence_type: 'none'
  });
  const [advanceDays, setAdvanceDays] = useState(1);
  const [showCalendarBuilder, setShowCalendarBuilder] = useState(false);
  const [customMonths, setCustomMonths] = useState([{ name: 'Month 1', days: 30 }]);
  const [calendarName, setCalendarName] = useState('My Custom Calendar');

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
      if (calendarRes.data.custom_months && calendarRes.data.custom_months.length > 0) {
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

  const handleChangeCalendarType = async (type) => {
    if (type === 'custom') {
      setShowCalendarBuilder(true);
      return;
    }
    try {
      await axios.put(`${API}/campaigns/${campaignId}/calendar`, {
        calendar_type: type,
        custom_months: PRESET_CALENDARS[type].months
      });
      toast.success('Calendar type changed');
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
    if (customMonths.some(m => !m.name.trim())) {
      toast.error('All months must have a name');
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
    updated[index][field] = field === 'days' ? Math.max(1, parseInt(value) || 1) : value;
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
    setEventForm({ 
      name: event.name, 
      description: event.description, 
      day: event.day, 
      month: event.month, 
      year: event.year,
      is_recurring: event.is_recurring || false,
      recurrence_type: event.recurrence_type || 'none'
    });
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
    setEventForm({ 
      name: '', 
      description: '', 
      day: 1, 
      month: 1, 
      year: 1,
      is_recurring: false,
      recurrence_type: 'none'
    });
    setEditingEvent(null);
    setShowEventDialog(false);
  };

  const calculateDaysUntil = (event) => {
    if (!calendar) return 0;
    const currentDate = { year: calendar.current_year, month: calendar.current_month, day: calendar.current_day };
    const eventDate = { year: event.year, month: event.month, day: event.day };
    
    if (eventDate.year > currentDate.year) return 999;
    if (eventDate.year < currentDate.year) return -1;
    if (eventDate.month > currentDate.month) {
      return (eventDate.month - currentDate.month) * 30 + (eventDate.day - currentDate.day);
    }
    if (eventDate.month < currentDate.month) return -1;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="medieval-heading" style={{ fontSize: '28px', color: '#ffffff' }}>Campaign Calendar</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              data-testid="calendar-type-select"
              value={calendar.calendar_type}
              onChange={(e) => handleChangeCalendarType(e.target.value)}
              className="input clickable-box"
              style={{ width: 'auto', cursor: 'pointer' }}
            >
              <option value="gregorian">Gregorian</option>
              <option value="custom">Custom Calendar</option>
            </select>
            <Button
              data-testid="customize-calendar-btn"
              onClick={() => setShowCalendarBuilder(true)}
              className="btn-secondary clickable-box"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <Settings size={16} />
              Customize
            </Button>
          </div>
        </div>

        {/* Custom Calendar Builder Modal */}
        <Dialog open={showCalendarBuilder} onOpenChange={setShowCalendarBuilder}>
          <DialogContent className="modal" style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}>
            <DialogHeader>
              <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                Custom Calendar Builder
              </DialogTitle>
            </DialogHeader>
            <div style={{ marginTop: '20px' }}>
              <p style={{ color: '#bae6fd', marginBottom: '20px', fontSize: '14px' }}>
                Create your own homebrew calendar! Add custom months with any number of days.
              </p>
              
              {/* Months List */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ color: '#ffffff', fontWeight: '600', fontSize: '16px' }}>Months ({customMonths.length})</label>
                  <Button
                    data-testid="add-month-btn"
                    onClick={addMonth}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    <Plus size={16} style={{ marginRight: '4px' }} />
                    Add Month
                  </Button>
                </div>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '4px' }}>
                  {customMonths.map((month, index) => (
                    <div 
                      key={index} 
                      data-testid={`month-row-${index}`}
                      style={{ 
                        display: 'flex', 
                        gap: '12px', 
                        alignItems: 'center', 
                        marginBottom: '12px',
                        background: '#0a1628',
                        border: '2px solid #ff1f8f',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                    >
                      <span style={{ 
                        color: '#ff1f8f', 
                        fontWeight: '700', 
                        minWidth: '30px',
                        fontSize: '14px'
                      }}>
                        #{index + 1}
                      </span>
                      <Input
                        data-testid={`month-name-${index}`}
                        value={month.name}
                        onChange={(e) => updateMonth(index, 'name', e.target.value)}
                        placeholder="Month name"
                        className="input"
                        style={{ flex: 2 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <Input
                          data-testid={`month-days-${index}`}
                          type="number"
                          min="1"
                          max="100"
                          value={month.days}
                          onChange={(e) => updateMonth(index, 'days', e.target.value)}
                          className="input"
                          style={{ width: '80px' }}
                        />
                        <span style={{ color: '#bae6fd', fontSize: '14px' }}>days</span>
                      </div>
                      <Button
                        data-testid={`remove-month-${index}`}
                        onClick={() => removeMonth(index)}
                        className="btn-icon"
                        style={{ color: '#ff4444', padding: '8px' }}
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ 
                background: '#0a1628', 
                border: '2px solid #38bdf8', 
                borderRadius: '8px', 
                padding: '16px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#ffffff', fontWeight: '600', marginBottom: '8px' }}>Calendar Summary</p>
                <p style={{ color: '#bae6fd', fontSize: '14px' }}>
                  Total months: <span style={{ color: '#ff1f8f', fontWeight: '600' }}>{customMonths.length}</span>
                </p>
                <p style={{ color: '#bae6fd', fontSize: '14px' }}>
                  Total days per year: <span style={{ color: '#ff1f8f', fontWeight: '600' }}>{customMonths.reduce((sum, m) => sum + m.days, 0)}</span>
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button 
                  type="button" 
                  className="btn-secondary clickable-box" 
                  onClick={() => setShowCalendarBuilder(false)}
                >
                  Cancel
                </Button>
                <Button
                  data-testid="save-custom-calendar-btn"
                  onClick={handleSaveCustomCalendar}
                  className="btn-primary"
                  style={{ display: 'flex', gap: '8px' }}
                >
                  <Save size={16} />
                  Save Calendar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Current Date Display */}
        <Card className="parchment-dark" style={{ marginBottom: '24px', padding: '32px', textAlign: 'center' }}>
          <h3 className="medieval-heading" style={{ fontSize: '48px', color: '#ff1f8f', marginBottom: '8px' }}>
            {currentMonth?.name || 'Month'} {calendar.current_day}, {calendar.current_year}
          </h3>
          <p style={{ fontSize: '18px', color: '#ffffff' }}>Current In-Game Date</p>
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input
              data-testid="advance-days-input"
              type="number"
              min="1"
              value={advanceDays}
              onChange={(e) => setAdvanceDays(parseInt(e.target.value) || 1)}
              className="input"
              style={{ width: '80px', textAlign: 'center' }}
            />
            <span style={{ color: '#bae6fd' }}>day(s)</span>
            <Button
              data-testid="advance-time-btn"
              onClick={handleAdvanceTime}
              className="btn-primary clickable-box"
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
            <h3 className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>All Events</h3>
            <Dialog open={showEventDialog} onOpenChange={(open) => { if (!open) resetEventForm(); setShowEventDialog(open); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-event-btn" className="btn-primary clickable-box" style={{ display: 'flex', gap: '8px' }}>
                  <Plus size={16} />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="modal">
                <DialogHeader>
                  <DialogTitle className="medieval-heading" style={{ fontSize: '24px', color: '#ffffff' }}>
                    {editingEvent ? 'Edit Event' : 'Add Event'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveEvent} style={{ marginTop: '20px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ffffff' }}>Event Name</label>
                    <Input
                      data-testid="event-name-input"
                      value={eventForm.name}
                      onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ffffff' }}>Description</label>
                    <textarea
                      data-testid="event-description-input"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      className="textarea"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ffffff' }}>Day</label>
                      <Input
                        data-testid="event-day-input"
                        type="number"
                        min="1"
                        value={eventForm.day}
                        onChange={(e) => setEventForm({ ...eventForm, day: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ffffff' }}>Month</label>
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
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ffffff' }}>Year</label>
                      <Input
                        data-testid="event-year-input"
                        type="number"
                        value={eventForm.year}
                        onChange={(e) => setEventForm({ ...eventForm, year: parseInt(e.target.value) })}
                        className="input"
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={eventForm.is_recurring}
                        onChange={(e) => setEventForm({ ...eventForm, is_recurring: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#ff1f8f' }}
                      />
                      Recurring Event
                    </label>
                    {eventForm.is_recurring && (
                      <select
                        value={eventForm.recurrence_type}
                        onChange={(e) => setEventForm({ ...eventForm, recurrence_type: e.target.value })}
                        className="input"
                        style={{ marginTop: '8px' }}
                      >
                        <option value="annual">Yearly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <Button type="button" className="btn-secondary clickable-box" onClick={resetEventForm}>Cancel</Button>
                    <Button data-testid="event-submit-btn" type="submit" className="btn-primary">
                      {editingEvent ? 'Update' : 'Add'} Event
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {events.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#bae6fd', padding: '20px' }}>No events scheduled</p>
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
                      borderLeftColor: isToday ? '#22c55e' : isPast ? '#6b7280' : '#ff1f8f',
                      opacity: isPast ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '16px', marginBottom: '4px', color: '#ffffff' }}>{event.name}</h4>
                        <p style={{ fontSize: '13px', color: '#bae6fd', marginBottom: '4px' }}>
                          {monthName} {event.day}, {event.year}
                          {event.is_recurring && <span style={{ marginLeft: '8px', color: '#ff1f8f' }}>(Recurring)</span>}
                        </p>
                        {!isPast && daysUntil <= 30 && (
                          <p style={{ 
                            fontSize: '12px', 
                            color: isToday ? '#22c55e' : '#ff1f8f',
                            fontWeight: '600'
                          }}>
                            {isToday ? 'TODAY!' : `In ${daysUntil} day(s)`}
                          </p>
                        )}
                        {event.description && (
                          <p style={{ fontSize: '13px', color: '#ffffff', marginTop: '8px' }}>{event.description}</p>
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
                          style={{ color: '#ff4444' }}
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
        <Card className="parchment-dark" style={{ border: '2px solid #ff1f8f' }}>
          <CardHeader>
            <CardTitle className="medieval-heading" style={{ fontSize: '20px', color: '#ffffff' }}>
              Upcoming (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#bae6fd', textAlign: 'center', padding: '20px' }}>
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
                        background: event.daysUntil === 0 ? 'rgba(34, 197, 94, 0.2)' : '#0a1628',
                        border: '2px solid',
                        borderColor: event.daysUntil === 0 ? '#22c55e' : '#ff1f8f',
                        borderRadius: '8px'
                      }}
                    >
                      <h5 style={{ fontSize: '14px', marginBottom: '4px', color: '#ffffff' }}>{event.name}</h5>
                      <p style={{ fontSize: '12px', color: '#bae6fd', marginBottom: '6px' }}>
                        {monthName} {event.day}
                      </p>
                      <p style={{ 
                        fontSize: '13px', 
                        fontWeight: '700',
                        color: event.daysUntil === 0 ? '#22c55e' : '#ff1f8f'
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

        {/* Calendar Info */}
        <Card className="parchment-dark" style={{ marginTop: '16px' }}>
          <CardContent style={{ padding: '16px' }}>
            <h4 style={{ color: '#ffffff', marginBottom: '12px', fontWeight: '600' }}>Calendar Info</h4>
            <p style={{ color: '#bae6fd', fontSize: '13px', marginBottom: '8px' }}>
              Type: <span style={{ color: '#ff1f8f' }}>{calendar.calendar_type === 'custom' ? 'Custom' : PRESET_CALENDARS[calendar.calendar_type]?.name || calendar.calendar_type}</span>
            </p>
            <p style={{ color: '#bae6fd', fontSize: '13px', marginBottom: '8px' }}>
              Months: <span style={{ color: '#ff1f8f' }}>{calendar.custom_months.length}</span>
            </p>
            <p style={{ color: '#bae6fd', fontSize: '13px' }}>
              Days/Year: <span style={{ color: '#ff1f8f' }}>{calendar.custom_months.reduce((sum, m) => sum + m.days, 0)}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default CalendarTab;
