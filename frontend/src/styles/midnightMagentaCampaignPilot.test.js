import fs from 'fs';
import path from 'path';

const file = relative => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

describe('Midnight Magenta campaign pilot is colour-only and route-scoped', () => {
  test('shared palette is a separate opt-in set; global Neon Coast and semantic status colours stay unchanged', () => {
    const tokens = file('guildTokens.css');
    const base = file('threeModeMinimalist.css');
    expect(tokens).toContain('--rqk-midnight-bg: #090c20');
    expect(tokens).toContain('--rqk-midnight-panel: #141027');
    expect(tokens).toContain('--rqk-midnight-magenta: #ff1976');
    expect(tokens).toContain('--rqk-midnight-crimson: #f21751');
    expect(tokens).toContain('--rqk-midnight-violet: #8c36dd');
    expect(tokens).toContain('--rqk-midnight-inset: inset ');
    expect(tokens).toContain('--guild-bg: #0a2342');
    for (const [key, value] of [
      ['success', '#5FA67A'], ['warning', '#D39A43'], ['danger', '#B94A4F'],
    ]) expect(base).toContain(`--rq-${key}: ${value}`);
  });

  test('My Campaigns retains responsive grids and has a separate scoped colour authority', () => {
    const css = file('../components/MyCampaignsPage.css');
    const component = file('../components/MyCampaignsPage.js');
    expect(component).toContain("import '@/styles/guildTokens.css'");
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr)) !important');
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr)) !important');
    expect(css).toContain('grid-template-columns: 1fr !important');
    expect(css).toContain('var(--rqk-midnight-panel)');
    expect(css).toContain('var(--rqk-midnight-magenta)');
    expect(css).toContain('var(--rq-danger, #b94a4f)');
    const pilot = css.split('/* Route-scoped colour authority')[1];
    expect(pilot).toContain('@layer rq-controls');
    expect(pilot).toContain('#root .campaigns-library-page--simple');
    expect(pilot).not.toMatch(/\b(grid-template-columns|display|position|width|height|min-height|max-width|gap|padding|margin|transform)\s*:/);
  });

  test('campaign mode chooser retains the two-mode geometry, tap targets and reduced motion', () => {
    const css = file('../components/gm/dashboard/CampaignModeChooser.css');
    const component = file('../components/gm/dashboard/CampaignModeChooser.js');
    expect(component).toContain("import '@/styles/guildTokens.css'");
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-height: 46px');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('var(--rqk-midnight-inset-selected)');
    const pilot = css.split('/* Midnight Magenta: scoped visual-only overrides')[1];
    expect(pilot).toContain('@layer rq-controls');
    expect(pilot).toContain('#root .rqk-campaign-mode-page');
    expect(pilot).not.toMatch(/\b(grid-template-columns|display|position|width|height|min-height|max-width|gap|padding|margin|transform)\s*:/);
  });
});
