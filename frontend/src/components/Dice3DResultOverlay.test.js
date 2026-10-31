import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dice3DResultOverlay from './Dice3DResultOverlay';

describe('Dice3DResultOverlay', () => {
  test('renders a settled 3D cube with the rolled value on the readable face', () => {
    const html = renderToStaticMarkup(
      <Dice3DResultOverlay
        total={17}
        label="1d20"
        rollDetail="d20: 17"
        formulaText="17 = 17"
        rolls={[{ id: 'd20-17', sides: 20, result: 17 }]}
        isRevealed
        onClose={() => {}}
        onRevealNow={() => {}}
      />
    );

    expect(html).toContain('data-testid="dice-3d-overlay"');
    expect(html).toContain('data-testid="dice-3d-total"');
    // A real 3D cube: a perspective stage plus all six faces.
    expect(html).toContain('rq-d3d__stage');
    expect(html).toContain('rq-d3d__face--front');
    expect(html).toContain('rq-d3d__face--back');
    expect(html).toContain('rq-d3d__face--top');
    expect(html).toContain('rq-d3d__face--bottom');
    expect(html).toContain('rq-d3d__face--left');
    expect(html).toContain('rq-d3d__face--right');
    // Settled rather than tumbling once revealed.
    expect(html).toContain('is-settled');
    expect(html).toContain('>17<');
    expect(html).toContain('d20');
  });

  test('hides the value and keeps tumbling until revealed', () => {
    const html = renderToStaticMarkup(
      <Dice3DResultOverlay
        total={17}
        label="1d20"
        rollDetail="d20: 17"
        formulaText="17 = 17"
        rolls={[{ id: 'd20-17', sides: 20, result: 17 }]}
        isRevealed={false}
        onClose={() => {}}
        onRevealNow={() => {}}
      />
    );

    expect(html).toContain('is-tumbling');
    expect(html).toContain('Rolling');
    // The total must not leak before the reveal.
    expect(html).toContain('>—<');
  });

  test('marks dropped dice so they read as excluded', () => {
    const html = renderToStaticMarkup(
      <Dice3DResultOverlay
        total={14}
        label="2d20kh1"
        rollDetail="d20: 14 • d20: 3 dropped"
        formulaText="14 = 14"
        rolls={[
          { id: 'a', sides: 20, result: 14 },
          { id: 'b', sides: 20, result: 3, dropped: true },
        ]}
        isRevealed
        onClose={() => {}}
        onRevealNow={() => {}}
      />
    );

    expect(html).toContain('is-dropped');
    expect(html).toContain('dropped');
  });
});
