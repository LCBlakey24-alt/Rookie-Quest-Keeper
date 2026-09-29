import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('Level Up wizard presentation', () => {
  const css = read('./clean-sheet/CleanLevelUpWizardPolish.css');
  const component = read('./LevelUpWizard.js');

  test('uses Guild Ledger tokens instead of the retired pink/cyan palette', () => {
    expect(css).toContain('background: var(--cs-panel) !important;');
    expect(css).toContain('color: var(--cs-text-soft) !important;');
    expect(css).toContain('border: 1px solid var(--cs-border-strong) !important;');
    expect(css).toContain('color: var(--cs-danger) !important;');
    expect(css).not.toMatch(/#071522|#0C2234|#102B40|#FFFFFF|#7CCBFF|#14344C|#FF2DAA|#081B2A|rgba\(255\s*,\s*45\s*,\s*170/i);
    expect(component).not.toMatch(/New Rocker/i);
  });

  test('does not flatten stateful step and choice backgrounds', () => {
    const stepRule = css.match(/\[data-testid="level-up-wizard"\] > nav span \{([\s\S]*?)\}/)?.[1] || '';
    const buttonRule = css.match(/\[data-testid="level-up-wizard"\] button \{([\s\S]*?)\}/)?.[1] || '';

    expect(stepRule).not.toMatch(/\bbackground\s*:/i);
    expect(stepRule).not.toMatch(/\bborder\s*:/i);
    expect(buttonRule).not.toMatch(/\bbackground\s*:/i);
    expect(buttonRule).not.toMatch(/\bborder\s*:/i);
    expect(component).toContain("aria-current={index === stepIndex ? 'step' : undefined}");
  });

  test('keeps wizard controls touch-friendly on phones', () => {
    expect(css).toContain('min-height: 46px !important;');
    expect(css).toContain('width: 46px !important;');
    expect(css).toContain('height: 46px !important;');
    expect(component).toContain('iconButton: { width: 44, height: 44');
    expect(component).toContain("input: { width: '100%', boxSizing: 'border-box', minHeight: 44");
    expect(component).toContain('primaryButton: { minHeight: 44');
    expect(component).toContain('secondaryButton: { minHeight: 44');
  });
});
