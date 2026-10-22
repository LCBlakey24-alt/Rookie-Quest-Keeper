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
