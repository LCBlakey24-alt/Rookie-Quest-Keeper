import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FlatDiceResultOverlay from './FlatDiceResultOverlay';

describe('FlatDiceResultOverlay', () => {
  test('fixed damage displays an honest result without a fictitious d2', () => {
    const html = renderToStaticMarkup(
      <FlatDiceResultOverlay total={5} label="Unarmed Damage"
        rollDetail="Fixed damage: 1 + 4" formulaText="Fixed damage: 1 + 4 = 5"
        rolls={[]} isFixedDamage isRevealed onClose={() => {}} />
    );
    expect(html).toContain('Fixed damage');
    expect(html).toContain('Fixed damage: 1 + 4 = 5');
    expect(html).not.toContain('d2');
    expect(html).not.toContain('Individual dice results');
  });

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
