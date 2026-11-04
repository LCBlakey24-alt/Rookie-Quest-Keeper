/**
 * Regression tests: the NPC relationship workspace must be usable on a phone.
 *
 * Three faults, all in this one file:
 *
 * 1. The edit modal was a hard `width: 640px` with `overflow: hidden`. On a
 *    390px phone it overhung by ~125px each side, putting the header close
 *    button off-screen, and overflow:hidden meant there was no way to scroll
 *    to it either.
 * 2. The AI-generate modal was a hard `width: 480px` with 24px padding.
 * 3. Neither carried `role="dialog"`, so the responsive rule in
 *    mobileUsabilityFix.css (`.modal, [role="dialog"]`) never matched them.
 * 4. The canvas is overflow:hidden over a 4000x3000 space and panning required
 *    a middle-click or Alt+left-click, with no touch handlers at all -- so any
 *    NPC positioned outside the visible area was unreachable on touch, and
 *    zoom-out only reaches 0.4x.
 *
 * Asserted against the source so the fixes cannot silently regress.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'NPCRelationshipMap.js'), 'utf8');
const mobileFix = fs.readFileSync(
  path.join(__dirname, '..', '..', 'styles', 'mobileUsabilityFix.css'),
  'utf8',
);

describe('modals fit a phone viewport', () => {
  test('no hard-coded pixel widths remain on either modal', () => {
    expect(source).not.toContain("width: '640px'");
    expect(source).not.toContain("width: '480px'");
  });

  test('each modal is clamped to the viewport', () => {
    expect(source).toContain("width: 'min(640px, calc(100vw - 24px))'");
    expect(source).toContain("width: 'min(480px, calc(100vw - 24px))'");
  });

  test('the edit modal can scroll instead of hiding its close button', () => {
    expect(source).not.toContain("maxHeight: '85vh', overflow: 'hidden'");
    expect(source).toContain("overflow: 'auto'");
  });

  test('both modals are exposed as dialogs', () => {
    // Also what makes the existing global responsive rule apply to them.
    const dialogs = source.match(/role="dialog"/g) || [];
    expect(dialogs.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('aria-modal="true"');
  });

  test('the global rule they now match really does size dialogs', () => {
    expect(mobileFix).toContain('[role="dialog"]');
    expect(mobileFix).toMatch(/width:\s*min\(96vw,\s*760px\)/);
  });
});

describe('the canvas can be panned by touch', () => {
  test('canvas uses pointer events, not mouse events', () => {
    expect(source).toContain('onPointerDown={handleCanvasMouseDown}');
    expect(source).toContain('onPointerMove={handleCanvasMouseMove}');
    expect(source).toContain('onPointerUp={handleCanvasMouseUp}');
  });

  test('pointercancel is handled so a taken-away touch does not stick', () => {
    expect(source).toContain('onPointerCancel={handleCanvasMouseUp}');
    expect(source).toContain("window.addEventListener('pointercancel'");
  });

  test('touchAction is disabled so the browser does not steal the drag', () => {
    expect(source).toContain("touchAction: 'none'");
  });

  test('touch and pen pan on a plain drag, mouse keeps its modifier gesture', () => {
    // Desktop behaviour must not change: a plain left-drag still belongs to
    // node dragging and selection, not panning.
    expect(source).toContain("e.pointerType !== 'mouse'");
    expect(source).toContain('e.button === 1');
    expect(source).toContain('e.altKey');
  });

  test('no mouse-only handlers are left behind', () => {
    expect(source).not.toContain('onMouseDown=');
    expect(source).not.toContain("window.addEventListener('mousemove'");
    expect(source).not.toContain("window.addEventListener('mouseup'");
  });
});

describe('nodes can be repositioned by touch', () => {
  test('node drag starts from a pointer event', () => {
    expect(source).toContain('onPointerDown={handleMouseDown}');
  });

  test('node drag tracks pointer movement globally', () => {
    expect(source).toContain("window.addEventListener('pointermove'");
    expect(source).toContain("window.addEventListener('pointerup'");
  });

  test('every global pointer listener added is also removed', () => {
    ['pointermove', 'pointerup', 'pointercancel'].forEach((evt) => {
      const added = (source.match(new RegExp(`addEventListener\\('${evt}'`, 'g')) || []).length;
      const removed = (source.match(new RegExp(`removeEventListener\\('${evt}'`, 'g')) || []).length;
      expect(removed).toBe(added);
    });
  });
});
