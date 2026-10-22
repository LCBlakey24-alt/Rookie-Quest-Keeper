import fs from 'fs';
import path from 'path';

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

describe('campaign calendar phone layout', () => {
  test('uses a responsive main/sidebar wrapper instead of permanently cramming two columns', () => {
    const component = read('./CalendarTab.js');
    const css = read('./CalendarTab.css');
    expect(component).toContain('className="rqk-calendar-layout"');
    expect(component).toContain('className="rqk-calendar-main"');
    expect(component).toContain('className="rqk-calendar-panel rqk-calendar-upcoming"');
    expect(css).toContain('@media (max-width: 980px)');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) !important');
  });

  test('keeps the six-day month grid independently scrollable and event dates accessible', () => {
    const component = read('./CalendarTab.js');
    const css = read('./CalendarTab.css');
    expect(component).toContain('className="rqk-calendar-month-scroller"');
    expect(css).toContain('overflow-x: auto');
    expect(component).toContain('aria-label="Event day"');
    expect(component).toContain('aria-label="Event month"');
    expect(component).toContain('aria-label="Event year"');
  });

  test("does not replace campaign-specific dates with today's real-world date", () => {
    const component = read('./CalendarTab.js');
    expect(component).toContain('calendar?.current_day');
    expect(component).toContain('calendar?.current_year');
    expect(component).toContain('/calendar/advance?days=');
    expect(component).not.toContain('Date.now()');
  });
});


describe('campaign-specific calendar editing', () => {
  test('GM can set a day/month/year without changing the other campaign', () => {
    const jsx = read('./CalendarTab.js');
    expect(jsx).toContain('calendar-set-date');
    expect(jsx).toContain('calendar-set-day');
    expect(jsx).toContain('calendar-set-month');
    expect(jsx).toContain('calendar-set-year');
    expect(jsx).toContain('current_day: Number(dateDraft.day)');
    expect(jsx).toContain('current_month: Number(dateDraft.month)');
    expect(jsx).toContain('current_year: Number(dateDraft.year)');
  });
  test('can browse months without changing the stored in-game date', () => {
    const jsx = read('./CalendarTab.js');
    expect(jsx).toContain('calendarMonthAfter');
    expect(jsx).toContain('Previous in-game month');
    expect(jsx).toContain('Next in-game month');
    expect(jsx).toContain('jumpToCurrentMonth');
  });
  test('edits month names, lengths, seasons and week length with date preservation checks', () => {
    const jsx = read('./CalendarTab.js');
    expect(jsx).toContain('Save custom calendar');
    expect(jsx).toContain('calendar-week-length');
    expect(jsx).toContain('custom_months: candidate.custom_months');
    expect(jsx).toContain('calendarOrdinal(candidate, calendar.current_year');
    expect(jsx).toContain('events.some(item => calendarOrdinal(candidate');
  });
  test('month cells are accessible buttons with a selected-day agenda and creation shortcut', () => {
    const jsx = read('./CalendarTab.js');
    const css = read('./CalendarTab.css');
    expect(jsx).toContain('aria-pressed={selectedDate?.year === viewYear');
    expect(jsx).toContain('aria-label="Selected day agenda"');
    expect(jsx).toContain('setSelectedDate({ day, month: viewMonth, year: viewYear })');
    expect(jsx).toContain('addEventOnSelectedDay');
    expect(jsx).toContain('loadCalendar({ preserveView: true })');
    expect(css).toContain('.rqk-calendar-day.is-selected');
    expect(css).toContain('@media (max-width: 719px)');
    expect(jsx).not.toMatch(/255,45,170|#FF2DAA/);
  });

  test('supports recurring events on the actual fantasy calendar', () => {
    const jsx = read('./CalendarTab.js');
    expect(jsx).toContain('calendar-event-recurrence');
    expect(jsx).toContain('eventOccursOn');
    expect(jsx).toContain('daysUntilNextOccurrence');
    expect(jsx).toContain('Every {daysPerWeek}-day week');
  });
});

describe('readable in-world event management', () => {
  test('month cells offset for irregular week starts rather than resetting', () => {
    const jsx = read('./CalendarTab.js');
    expect(jsx).toContain('calendarWeekdayOffset(calendar, viewYear, viewMonth)');
    expect(jsx).toContain('length: monthStartOffset');
    expect(jsx).toContain('rqk-calendar-day-placeholder');
  });
  test('event editor uses the fantasy month names, clamps day and labels actions', () => {
    const jsx = read('./CalendarTab.js');
    const css = read('./CalendarTab.css');
    expect(jsx).toContain('<select aria-label="Event month"');
    expect(jsx).toContain('<option key={index} value={index + 1}>{month.name}</option>');
    expect(jsx).toContain('day: Math.min(Number(previous.day)');
    expect(jsx).toContain('aria-label={`Edit ${event.name}`}');
    expect(jsx).toContain('aria-label={`Delete ${event.name}`}');
    expect(css).toContain('.rqk-calendar-event-record-actions');
    expect(css).toContain('min-height: 44px');
  });
});
