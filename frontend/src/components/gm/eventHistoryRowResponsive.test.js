/**
 * The day-by-day location history row was an inline five-column grid:
 *
 *   gridTemplateColumns: '50px 1fr 100px 100px 80px'   gap: '12px'
 *
 * 330px of fixed columns plus 48px of gaps commits 378px before the 1fr
 * event-text column gets anything. A 390px phone has roughly 358px of content
 * width, so the event text collapsed and the Reputation column was pushed out
 * of the row. Its scroller sets overflowY only, so the clipped columns could
 * not be reached by scrolling either.
 */
import fs from 'fs';
import path from 'path';

const CSS = fs.readFileSync(path.join(__dirname, 'EventSystem.css'), 'utf8');
const JSX = fs.readFileSync(path.join(__dirname, 'EventSystem.js'), 'utf8');

const blockFor = (selector) => {
  const at = CSS.indexOf(selector);
  if (at < 0) return '';
  return CSS.slice(at, CSS.indexOf('}', at));
};

describe('the history row no longer clips its columns', () => {
  test('the row stops committing 330px to fixed columns', () => {
    expect(JSX).not.toContain("'50px 1fr 100px 100px 80px'");
  });

  test('the row is laid out by stylesheet, not inline, so it can be responsive', () => {
    expect(JSX).toContain('className="rqk-event-history-row"');
    expect(JSX).toContain("import './EventSystem.css'");
  });

  test('every column can shrink below its content width', () => {
    // Without min-width: 0 a grid item refuses to go below its content size,
    // which is the other half of why the row overflowed.
    expect(blockFor('.rqk-event-history-row > *')).toContain('min-width: 0');
  });

  test('the three trailing stats are grouped into one grid child', () => {
    expect(JSX).toContain('className="rqk-event-history-stats"');
    // Day, event, stats -- three children, so three columns.
    expect(blockFor('.rqk-event-history-row {')).toContain('50px minmax(0, 1fr) auto');
  });

  test('long event text wraps instead of forcing the row wider', () => {
    expect(blockFor('.rqk-event-history-event')).toContain('overflow-wrap: anywhere');
  });
});

describe('phone layout follows the design system', () => {
  const phoneBlock = CSS.slice(CSS.indexOf('@media (max-width: 719px)'));

  test('it uses the canonical phone breakpoint', () => {
    // docs/DESIGN_SYSTEM.md: phone is up to 719px, desktop from 1181px.
    expect(CSS).toContain('@media (max-width: 719px)');
  });

  test('the row stacks into day/event then stats', () => {
    expect(phoneBlock).toContain("'day event'");
    expect(phoneBlock).toContain("'stats stats'");
  });

  test('every named area has a cell assigned to it', () => {
    ['rqk-event-history-day', 'rqk-event-history-event', 'rqk-event-history-stats'].forEach((cls) => {
      expect(phoneBlock).toContain(cls);
    });
  });

  test('it stacks rather than introducing sideways scrolling', () => {
    // The design system asks phones to avoid sideways scrolling, so the fix
    // must not be a horizontal scrollport.
    expect(CSS).not.toContain('overflow-x: auto');
    expect(CSS).not.toContain('overflow-x: scroll');
  });
});
