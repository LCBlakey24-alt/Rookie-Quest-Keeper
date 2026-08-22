import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FlatDiceResultOverlay from './FlatDiceResultOverlay';

describe('FlatDiceResultOverlay', () => {
  test('renders a flat result without cinematic dice scene markup', () => {
    const html = renderToStaticMarkup(
      <FlatDiceResultOverlay
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

    expect(html).toContain('data-testid="flat-dice-overlay"');
    expect(html).toContain('data-testid="flat-dice-total"');
    expect(html).toContain('>17<');
    expect(html).not.toContain('rq-cinematic-roll');
    expect(html).not.toContain('cinematic-dice-overlay');
  });
});
