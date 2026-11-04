/**
 * Regression test: the fixed character-sheet tab rail must never overlap page
 * content.
 *
 * The rail is `position: fixed; left: 8px; width: 54px; z-index: 70`
 * (CleanSheetTabsRail.css), so it occupies x = 8-62px. Left-padding
 * reservations existed either side of the tablet band but not inside it:
 * CleanSheetTabs.minimal.css reserves only up to 760px and
 * CleanSheetTabsRail.css only from 1181px, while the tablet rule's
 * `padding: 14px` shorthand reset padding-left to 14px. Content therefore
 * started underneath the rail from 761px to 1180px -- including 768x1024
 * (iPad portrait), which docs/UI_DESIGN_SYSTEM.md lists for QA.
 *
 * Asserted against the real stylesheets so the bands cannot silently drift
 * apart again.
 */
import fs from 'fs';
import path from 'path';

const read = (relative) => fs.readFileSync(path.join(__dirname, '..', '..', relative), 'utf8');

const tabletSheet = read('layouts/tablet/characterSheet.css');
const minimal = read('components/clean-sheet/CleanSheetTabs.minimal.css');
const rail = read('components/clean-sheet/CleanSheetTabsRail.css');
const hammer = read('components/clean-sheet/CleanSheetFinalHammer.css');

// Mirrors layouts/deviceLayout.js.
const MOBILE_MAX_WIDTH = 719;
const TABLET_MAX_WIDTH = 1180;
// Below this the rail becomes a sticky horizontal strip instead of fixed.
const RAIL_FIXED_FROM = 760;

describe('character sheet tab rail reservations', () => {
  test('the rail really is fixed and 54px wide at base', () => {
    expect(rail).toMatch(/position:\s*fixed\s*!important/);
    expect(rail).toMatch(/width:\s*54px\s*!important/);
  });

  test('below 760px the rail is converted to a sticky strip', () => {
    // Which is why the 720-759px slice needs no left reservation.
    expect(hammer).toMatch(/@media\s*\(max-width:\s*759px\)/);
    expect(hammer).toMatch(/position:\s*sticky\s*!important/);
  });

  test('the tablet band reserves room for the rail from 760px up', () => {
    expect(tabletSheet).toMatch(/@media\s*\(min-width:\s*760px\)/);
    // 62px of rail (8px offset + 54px) plus a gutter.
    expect(tabletSheet).toMatch(/padding:\s*14px\s+14px\s+14px\s+76px\s*!important/);
  });

  test('the reservation is scoped to the tablet device layer', () => {
    const band = tabletSheet.slice(tabletSheet.indexOf('@media (min-width: 760px)'));
    expect(band).toContain("[data-rq-device='tablet']");
  });

  test('every width where the rail is fixed has a left reservation', () => {
    const minimalCap = Number(minimal.match(/@media\s*\(max-width:\s*(\d+)px\)/)[1]);
    const desktopFrom = Number(rail.match(/@media\s*\(min-width:\s*(\d+)px\)/)[1]);
    const tabletFrom = Number(tabletSheet.match(/@media\s*\(min-width:\s*(\d+)px\)/)[1]);

    const unreserved = [];
    for (let width = 320; width <= 1600; width += 1) {
      const railIsFixed = width >= RAIL_FIXED_FROM;
      if (!railIsFixed) continue;
      const reserved =
        width <= minimalCap ||
        (width >= tabletFrom && width > MOBILE_MAX_WIDTH && width <= TABLET_MAX_WIDTH) ||
        width >= desktopFrom;
      if (!reserved) unreserved.push(width);
    }

    expect(unreserved).toEqual([]);
  });

  test('the QA viewports specifically are covered', () => {
    const tabletFrom = Number(tabletSheet.match(/@media\s*\(min-width:\s*(\d+)px\)/)[1]);
    // 768 (iPad portrait) and 1024 (iPad landscape) both sit in the band that
    // previously had no reservation at all.
    [768, 1024, 1180].forEach((width) => {
      expect(width).toBeGreaterThanOrEqual(tabletFrom);
      expect(width).toBeLessThanOrEqual(TABLET_MAX_WIDTH);
    });
  });
});
