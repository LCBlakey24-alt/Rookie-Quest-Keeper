import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, ChevronRight, Edit, Plus, Save, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import './CalendarTab.css';
import { isOfflineDesktop } from '@/preview/previewMode';
import {
  advanceCustomCalendar,
  calendarOrdinal,
  TIA_KARTA_REFERENCE_EVENTS,
  tiaKartaCalendar,
} from '@/data/tiaKartaCalendar';
import { eventOccursOn, calendarMonthAfter, calendarWeekdayOffset, daysUntilNextOccurrence } from '@/data/customCalendarUtilities';

const emptyEvent = { name: '', description: '', day: 1, month: 1, year: 1, is_recurring: false, recurrence_type: 'none' };
const fallbackCalendar = { calendar_type: 'gregorian', current_day: 1, current_month: 1, current_year: 1, custom_months: [{ name: 'Month 1', days: 30 }] };


export default function CalendarTab({ campaignId }) {
  const activeCampaignRef = useRef(campaignId);
  const [calendar, setCalendar] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewDate, setViewDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const eventEditorRef = useRef(null);
  const [dateDraft, setDateDraft] = useState({ day: 1, month: 1, year: 592 });
  const [showCalendarEditor, setShowCalendarEditor] = useState(false);
  const [structureDraft, setStructureDraft] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [advanceDays, setAdvanceDays] = useState(1);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [applyingTiaKarta, setApplyingTiaKarta] = useState(false);

  const loadCalendar = useCallback(async (options = {}) => {
    const requestedCampaign = campaignId;
    try {
      setLoading(true);
      setLoadError('');
      const [calendarRes, eventsRes] = await Promise.all([
        apiClient.get(`/campaigns/${campaignId}/calendar`),
        apiClient.get(`/campaigns/${campaignId}/calendar-events`),
      ]);
      if (activeCampaignRef.current !== requestedCampaign) return;
      if (!calendarRes.data || !Array.isArray(eventsRes.data)) throw new Error('Invalid calendar response');
      setCalendar(calendarRes.data);
      setEvents(eventsRes.data);
      if (!options.preserveView) {
        setViewDate({ month: Number(calendarRes.data.current_month), year: Number(calendarRes.data.current_year) });
        setSelectedDate({ day: Number(calendarRes.data.current_day),
          month: Number(calendarRes.data.current_month), year: Number(calendarRes.data.current_year) });
      }
      setDateDraft({ day: Number(calendarRes.data.current_day), month: Number(calendarRes.data.current_month), year: Number(calendarRes.data.current_year) });
      setEditingEvent(null);
      setEventForm({
        ...emptyEvent, day: Number(calendarRes.data.current_day),
        month: Number(calendarRes.data.current_month), year: Number(calendarRes.data.current_year),
      });
      setStructureDraft({ days_per_week: calendarRes.data.days_per_week,
        custom_months: (calendarRes.data.custom_months || []).map(month => ({ ...month })) });
    } catch (error) {
      if (activeCampaignRef.current !== requestedCampaign) return;
      setLoadError(error?.response?.data?.detail || error?.message || 'Failed to load calendar');
      toast.error('Could not load calendar. Existing campaign dates were not changed.');
    } finally {
      if (activeCampaignRef.current === requestedCampaign) setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    activeCampaignRef.current = campaignId;
    setCalendar(null);
    setEvents([]);
    setSelectedDate(null);
    setLoadError('');
    setLoading(true);
    loadCalendar();
  }, [campaignId, loadCalendar]);

  const sortedEvents = useMemo(() => [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  }), [events]);

  const upcomingEvents = useMemo(() => events
    .map(event => ({ ...event, daysUntil: daysUntilNextOccurrence(event, calendar) }))
    .filter(event => event.daysUntil !== null && event.daysUntil >= 0 && event.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil), [events, calendar]);

  const viewYear = viewDate?.year ?? calendar?.current_year ?? 592;
  const viewMonth = viewDate?.month ?? calendar?.current_month ?? 1;
  const selectedMonth = calendar?.custom_months?.[viewMonth - 1];
  const currentMonth = selectedMonth?.name || 'Month';
  const daysThisMonth = Math.max(1, Math.min(45, Number(selectedMonth?.days) || 30));
  const daysPerWeek = Math.max(1, Math.min(10, Number(calendar?.days_per_week) || 7));
  const monthStartOffset = calendarWeekdayOffset(calendar, viewYear, viewMonth) ?? 0;
  const jumpToCurrentMonth = () => {
    setViewDate({ month: calendar.current_month, year: calendar.current_year });
    setSelectedDate({ day: calendar.current_day, month: calendar.current_month, year: calendar.current_year });
  };
  const browseMonth = offset => {
    setViewDate(previous => calendarMonthAfter(calendar, previous?.year ?? calendar.current_year,
      previous?.month ?? calendar.current_month, offset));
    setSelectedDate(null);
  };
  const agendaEvents = selectedDate
    ? events.filter(item => eventOccursOn(item, calendar, selectedDate.year, selectedDate.month, selectedDate.day))
    : [];
  const addEventOnSelectedDay = () => {
    if (!selectedDate) return;
    setEditingEvent(null);
    setEventForm({ ...emptyEvent, ...selectedDate });
    eventEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const applyTiaKarta = async () => {
    if (!window.confirm('Apply the Tia-Karta 12-month calendar? If this campaign already has a custom in-world date it will be preserved. Existing events will not be deleted.')) return;
    setApplyingTiaKarta(true);
    try {
      await apiClient.put(`/campaigns/${campaignId}/calendar`, tiaKartaCalendar(campaignId, calendar));
      // Friday campaign milestones must not be written into Wednesday's
      // independent history. Only confirmed shared-world events are universal.
      const campaignRes = await apiClient.get(`/campaigns/${campaignId}`);
      const isWednesday = /spilsby\s+wednesday/i.test(String(campaignRes.data?.name || ''));
      const referenceEvents = isWednesday
        ? TIA_KARTA_REFERENCE_EVENTS.filter(event => event.id === 'tk-calendar-crowns')
        : TIA_KARTA_REFERENCE_EVENTS;
      const existingKeys = new Set(events.map(event => `${event.name}|${event.day}|${event.month}|${event.year}`));
      for (const event of referenceEvents) {
        const key = `${event.name}|${event.day}|${event.month}|${event.year}`;
        if (!existingKeys.has(key)) {
          await apiClient.post(`/campaigns/${campaignId}/calendar-events`, {
            name: event.name, description: event.description,
            day: event.day, month: event.month, year: event.year,
            is_recurring: false, recurrence_type: 'none',
          });
        }
      }
      toast.success('Tia-Karta calendar restored: 6-day weeks and 12 named months.');
      await loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error?.message || 'Could not apply Tia-Karta calendar');
    } finally {
      setApplyingTiaKarta(false);
    }
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    if (calendarOrdinal(calendar, eventForm.year, eventForm.month, eventForm.day) === null) {
      toast.error('Choose a valid date for this campaign calendar.');
      return;
    }
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
      loadCalendar({ preserveView: true });
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
    const days = Number(advanceDays);
    if (!Number.isInteger(days) || days < 1 || days > 10000) {
      toast.error('Choose 1 to 10,000 whole days to advance.');
      return;
    }
    try {
      if (isOfflineDesktop()) {
        const next = advanceCustomCalendar(calendar, Number(advanceDays));
        await apiClient.put(`/campaigns/${campaignId}/calendar`, next);
      } else {
        await apiClient.post(`/campaigns/${campaignId}/calendar/advance?days=${advanceDays}`);
      }
      toast.success(`Advanced ${advanceDays} day(s)`);
      loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Failed to advance time');
    }
  };

  const setCurrentDate = async event => {
    event.preventDefault();
    if (calendarOrdinal(calendar, dateDraft.year, dateDraft.month, dateDraft.day) === null) {
      toast.error('Choose a valid in-world day, month and year.');
      return;
    }
    try {
      await apiClient.put(`/campaigns/${campaignId}/calendar`, {
        current_day: Number(dateDraft.day),
        current_month: Number(dateDraft.month),
        current_year: Number(dateDraft.year),
      });
      toast.success('In-game date saved for this campaign');
      await loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save in-game date.');
    }
  };

  const saveCalendarSettings = async event => {
    event.preventDefault();
    if (!structureDraft || savingSettings) return;
    const { custom_months, days_per_week } = structureDraft;
    const validMonths = Array.isArray(custom_months) && custom_months.length > 0 &&
      custom_months.length <= 24 && custom_months.every(month =>
        String(month.name || '').trim() && Number.isInteger(Number(month.days)) &&
        Number(month.days) >= 1 && Number(month.days) <= 100);
    if (!validMonths || !Number.isInteger(Number(days_per_week)) ||
        Number(days_per_week) < 1 || Number(days_per_week) > 10) {
      toast.error('Calendar needs valid month names (1–100 days) and a 1–10 day week.');
      return;
    }
    const candidate = { ...calendar, custom_months: custom_months.map(month => ({
      name: String(month.name).trim(), days: Number(month.days), season: String(month.season || '').trim(),
    })), days_per_week: Number(days_per_week) };
    if (calendarOrdinal(candidate, calendar.current_year, calendar.current_month, calendar.current_day) === null ||
        events.some(item => calendarOrdinal(candidate, item.year, item.month, item.day) === null)) {
      toast.error('Existing campaign dates or events would fall outside the new months. Edit those dates first; nothing was changed.');
      return;
    }
    if (!window.confirm('Change this campaign calendar structure? Existing events and your current date will be preserved.')) return;
    setSavingSettings(true);
    try {
      await apiClient.put(`/campaigns/${campaignId}/calendar`, {
        calendar_type: 'custom',
        days_per_week: candidate.days_per_week,
        custom_months: candidate.custom_months,
      });
      toast.success('Custom calendar settings saved');
      setShowCalendarEditor(false);
      await loadCalendar();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Could not save calendar settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) return <div className="loading-spinner" />;
  if (loadError) return <div className="rqk-calendar-load-error" role="alert">
    <strong>Calendar could not be loaded</strong>
    <p>{String(loadError)} Your saved dates and events have not been reset.</p>
    <button type="button" className="btn-secondary" onClick={loadCalendar}>Retry calendar loading</button>
  </div>;

  return (
    <div className="rqk-calendar-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
      <main className="rqk-calendar-main">
        <header className="rqk-calendar-title">
          <div>
            <p className="rqk-calendar-kicker">Chronicle / World time</p>
            <h2><CalendarIcon size={22} aria-hidden="true" /> Campaign calendar</h2>
            <p>Plan events, navigate the world calendar and track this party's independent date.</p>
          </div>
          <button type="button" className="btn-secondary" onClick={applyTiaKarta} disabled={applyingTiaKarta}>{applyingTiaKarta ? 'Restoring…' : 'Restore Tia-Karta months'}</button>
        </header>

        <section className="rqk-calendar-panel rqk-calendar-current">
          <h3 style={{ color: '#EADFC8', fontSize: 34, margin: '0 0 6px' }}>{calendar?.current_day || 1} {calendar?.custom_months?.[(calendar?.current_month || 1) - 1]?.name || 'Month'}, {calendar?.current_year || 1}{calendar?.calendar_type === 'custom' ? ' PC' : ''}</h3>
          {calendar?.custom_months?.[(calendar?.current_month || 1) - 1]?.season &&
            <p style={{ color: '#C8BDA8', margin: '0 0 8px' }}>
              {calendar.custom_months[calendar.current_month - 1].season} · {daysPerWeek}-day week · {calendar?.custom_months?.length || 12}-month year
            </p>}
          <p style={{ color: '#EADFC8', margin: '0 0 14px' }}>Current in-game date</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input data-testid="advance-days-input" type="number" min="1" max="10000" value={advanceDays} onChange={e => setAdvanceDays(parseInt(e.target.value, 10) || 1)} className="input" style={{ width: 80, textAlign: 'center' }} />
            <button data-testid="advance-time-btn" type="button" onClick={advanceTime} className="btn-primary"><ChevronRight size={16} /> Advance Time</button>
          </div>
        </section>

        <section className="rqk-calendar-panel rqk-calendar-settings-panel">
          <h3>Set the in-game date</h3>
          <p>Each party has its own date. Setting Wednesday's date will never move Eldritch Heralds.</p>
          <form className="rqk-calendar-date-controls" onSubmit={setCurrentDate}>
            <label>Day
              <input type="number" min="1" max={calendar.custom_months?.[dateDraft.month - 1]?.days || 31}
                data-testid="calendar-set-day" value={dateDraft.day}
                onChange={event => setDateDraft(previous => ({ ...previous, day: Number(event.target.value) }))}/>
            </label>
            <label>Month
              <select data-testid="calendar-set-month" value={dateDraft.month}
                onChange={event => setDateDraft(previous => ({ ...previous, month: Number(event.target.value) }))}>
                {calendar.custom_months?.map((month, index) =>
                  <option key={index} value={index + 1}>{month.name}</option>)}
              </select>
            </label>
            <label>Year (PC)
              <input type="number" data-testid="calendar-set-year" value={dateDraft.year}
                onChange={event => setDateDraft(previous => ({ ...previous, year: Number(event.target.value) }))}/>
            </label>
            <button type="submit" className="btn-primary" data-testid="calendar-set-date">Set in-game date</button>
          </form>
          <button type="button" className="btn-secondary"
            onClick={() => setShowCalendarEditor(previous => !previous)}>
            {showCalendarEditor ? 'Close calendar settings' : 'Edit custom calendar structure'}
          </button>
          {showCalendarEditor && structureDraft && (
            <form className="rqk-calendar-structure-form" onSubmit={saveCalendarSettings}>
              <p>Edit month names, lengths and seasons, or the number of days in a week.
                This affects only this campaign. The 12-month Tia-Karta standard is available with the Restore button above.</p>
              <label>Days per week
                <input data-testid="calendar-week-length" type="number" min="1" max="10"
                  value={structureDraft.days_per_week}
                  onChange={event => setStructureDraft(previous =>
                    ({ ...previous, days_per_week: Number(event.target.value) }))}/>
              </label>
              <div className="rqk-calendar-structure-months">
                {structureDraft.custom_months.map((month, index) => (
                  <div key={index} className="rqk-calendar-structure-month">
                    <strong>Month {index + 1}</strong>
                    <label>Name
                      <input value={month.name} aria-label={`Month ${index + 1} name`}
                        onChange={event => setStructureDraft(previous => ({
                          ...previous,
                          custom_months: previous.custom_months.map((item, i) =>
                            i === index ? { ...item, name: event.target.value } : item),
                        }))}/>
                    </label>
                    <label>Days
                      <input type="number" min="1" max="100" value={month.days}
                        aria-label={`Month ${index + 1} length`}
                        onChange={event => setStructureDraft(previous => ({
                          ...previous,
                          custom_months: previous.custom_months.map((item, i) =>
                            i === index ? { ...item, days: Number(event.target.value) } : item),
                        }))}/>
                    </label>
                    <label>Season
                      <input value={month.season || ''} aria-label={`Month ${index + 1} season`}
                        onChange={event => setStructureDraft(previous => ({
                          ...previous,
                          custom_months: previous.custom_months.map((item, i) =>
                            i === index ? { ...item, season: event.target.value } : item),
                        }))}/>
                    </label>
                  </div>
                ))}
              </div>
              <button type="submit" className="btn-primary" disabled={savingSettings}>
                {savingSettings ? 'Saving…' : 'Save custom calendar'}
              </button>
            </form>
          )}
        </section>

        <section className="rqk-calendar-panel rqk-calendar-month-panel">
          <div className="rqk-calendar-month-heading">
            <h3 style={{ color: '#EADFC8', margin: 0 }}>{currentMonth} {viewYear} — Days of the Month</h3>
            <div className="rqk-calendar-month-actions">
              <button type="button" className="btn-secondary" onClick={() => browseMonth(-1)} aria-label="Previous in-game month">‹ Previous</button>
              <button type="button" className="btn-secondary" onClick={jumpToCurrentMonth}>Current month</button>
              <button type="button" className="btn-secondary" onClick={() => browseMonth(1)} aria-label="Next in-game month">Next ›</button>
            </div>
          </div>
          <div className="rqk-calendar-month-scroller" style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${daysPerWeek}, minmax(48px, 1fr))`, gap: 5, minWidth: daysPerWeek * 48 }}>
              {Array.from({ length: daysPerWeek }, (_, index) => (
                <strong key={index} style={{ color: '#D9BC82', textAlign: 'center', fontSize: 12 }}>Day {index + 1}</strong>
              ))}
              {Array.from({ length: monthStartOffset }, (_, index) => (
                <span key={`weekday-offset-${index}`} className="rqk-calendar-day-placeholder" aria-hidden="true" />
              ))}
              {Array.from({ length: daysThisMonth }, (_, index) => {
                const day = index + 1;
                const matching = events.filter(item => eventOccursOn(item, calendar, viewYear, viewMonth, day));
                const today = Number(calendar?.current_day) === day &&
                  Number(calendar?.current_month) === viewMonth && Number(calendar?.current_year) === viewYear;
                return (
                  <button key={day} type="button"
                    className={`rqk-calendar-day${today ? ' is-today' : ''}${selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day ? ' is-selected' : ''}`}
                    aria-label={`${day} ${currentMonth} ${viewYear}${today ? ', current in-game day' : ''}, ${matching.length} events`}
                    aria-pressed={selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day}
                    onClick={() => setSelectedDate({ day, month: viewMonth, year: viewYear })}>
                    <strong>{day}{today ? <span aria-hidden="true"> ★</span> : null}</strong>
                    {matching.slice(0, 2).map(item => (
                      <span className="rqk-calendar-day-event" key={item.id || item.name} title={item.name}>{item.name}</span>
                    ))}
                    {matching.length > 2 && <span className="rqk-calendar-day-more">+{matching.length - 2} more</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {selectedDate && (
          <section className="rqk-calendar-panel rqk-calendar-agenda" aria-label="Selected day agenda">
            <div className="rqk-calendar-agenda-heading">
              <div>
                <p className="rqk-calendar-kicker">Selected day</p>
                <h3>{selectedDate.day} {calendar?.custom_months?.[selectedDate.month - 1]?.name || 'Month'}, {selectedDate.year} PC</h3>
              </div>
              <button type="button" className="btn-secondary" onClick={addEventOnSelectedDay}>+ Add event here</button>
            </div>
            {agendaEvents.length ? (
              <ul className="rqk-calendar-agenda-list">
                {agendaEvents.map(item => <li key={item.id || item.name}>
                  <strong>{item.name}</strong>
                  {item.description && <p>{item.description}</p>}
                  {item.is_recurring && <small>Repeats: {item.recurrence_type}</small>}
                  <button type="button" onClick={() => editEvent(item)} aria-label={`Edit ${item.name}`}>Edit</button>
                </li>)}
              </ul>
            ) : <p className="rqk-calendar-agenda-empty">Nothing scheduled for this day yet.</p>}
          </section>
        )}

        <section ref={eventEditorRef} className="rqk-calendar-panel rqk-calendar-event-editor">
          <h3>{editingEvent ? 'Edit event' : 'Create an event'}</h3>
          <form onSubmit={saveEvent} style={{ display: 'grid', gap: 10 }}>
            <input data-testid="event-name-input" className="input" placeholder="Event name" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} required />
            <textarea data-testid="event-description-input" className="textarea" placeholder="Description" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} />
            <label className="rqk-calendar-repeat-label">Repeat event
              <select data-testid="calendar-event-recurrence"
                value={eventForm.is_recurring ? eventForm.recurrence_type : 'none'}
                onChange={event => setEventForm(previous => ({
                  ...previous,
                  is_recurring: event.target.value !== 'none',
                  recurrence_type: event.target.value,
                }))}>
                <option value="none">No repeat</option>
                <option value="weekly">Every {daysPerWeek}-day week</option>
                <option value="monthly">Every month</option>
                <option value="annual">Every year</option>
              </select>
            </label>
            <div className="rqk-calendar-event-date-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              <input aria-label="Event day" data-testid="event-day-input" className="input" type="number" min="1" max={calendar.custom_months?.[eventForm.month - 1]?.days || 31} value={eventForm.day} onChange={e => setEventForm({ ...eventForm, day: parseInt(e.target.value, 10) || 1 })} />
              <select aria-label="Event month" data-testid="event-month-input" className="input"
                value={eventForm.month} onChange={e => setEventForm(previous => ({
                  ...previous, month: Number(e.target.value),
                  day: Math.min(Number(previous.day), Number(calendar?.custom_months?.[Number(e.target.value) - 1]?.days) || 30),
                }))}>
                {calendar.custom_months?.map((month, index) => (
                  <option key={index} value={index + 1}>{month.name}</option>
                ))}
              </select>
              <input aria-label="Event year" data-testid="event-year-input" className="input" type="number" value={eventForm.year} onChange={e => setEventForm({ ...eventForm, year: parseInt(e.target.value, 10) || 1 })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {editingEvent && <button type="button" className="btn-secondary" onClick={() => { setEditingEvent(null); setEventForm(emptyEvent); }}>Cancel</button>}
              <button data-testid="event-submit-btn" type="submit" className="btn-primary"><Save size={16} /> {editingEvent ? 'Update' : 'Add'} Event</button>
            </div>
          </form>
        </section>

        <section className="rqk-calendar-panel rqk-calendar-events-list">
          <h3 style={{ color: '#EADFC8', marginTop: 0 }}>All Events</h3>
          {sortedEvents.length === 0 ? <p style={{ color: '#EADFC8' }}>No events scheduled.</p> : sortedEvents.map(event => {
            const monthName = calendar?.custom_months?.[event.month - 1]?.name || `Month ${event.month}`;
            return (
              <article key={event.id} data-testid={`event-${event.id}`} className="initiative-entry rqk-calendar-event-record">
                <div className="rqk-calendar-event-record-content">
                  <span className="rqk-calendar-event-record-date">{event.day} {monthName} · {event.year} PC</span>
                  <h4>{event.name}</h4>
                  {event.is_recurring && <span className="rqk-calendar-event-repeat">
                    Repeats {event.recurrence_type === 'weekly' ? `every ${daysPerWeek}-day week` :
                      event.recurrence_type === 'monthly' ? 'monthly' : event.recurrence_type === 'annual' ? 'annually' : ''}
                  </span>}
                  {event.description && <p>{event.description}</p>}
                </div>
                <div className="rqk-calendar-event-record-actions">
                  <button data-testid={`edit-event-btn-${event.id}`} type="button" className="btn-icon"
                    aria-label={`Edit ${event.name}`} title={`Edit ${event.name}`} onClick={() => editEvent(event)}>
                    <Edit size={17} aria-hidden="true" />
                  </button>
                  <button data-testid={`delete-event-btn-${event.id}`} type="button" className="btn-icon"
                    aria-label={`Delete ${event.name}`} title={`Delete ${event.name}`} onClick={() => deleteEvent(event.id)}>
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      <aside className="rqk-calendar-panel rqk-calendar-upcoming">
        <h3 style={{ color: '#EADFC8', marginTop: 0 }}>Upcoming 30 Days</h3>
        {upcomingEvents.length === 0 ? <p style={{ color: '#EADFC8' }}>No upcoming events.</p> : upcomingEvents.map(event => (
          <div key={event.id} style={{ border: '1px solid rgba(201,169,107,0.24)', background: '#263748', padding: 10, marginBottom: 8 }}>
            <strong style={{ color: '#EADFC8' }}>{event.name}</strong>
            <p style={{ color: '#EADFC8', margin: '4px 0 0' }}>{event.daysUntil === 0 ? 'Today' : `${event.daysUntil} day(s)`}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
