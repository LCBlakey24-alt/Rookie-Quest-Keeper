import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('web Guild Ledger navigation and phone readability', () => {
  test('active campaign navigation is wax red while primary actions remain gold', () => {
    const css = read('../CampaignDashboard.css');
    expect(css).toContain('--rqk-campaign-wax: var(--rq-guild-wine, #7E2D2D)');
    expect(css).toMatch(/\.campaign-dashboard-tab\.is-active\s*\{[^}]*background: var\(--rqk-campaign-wax\)/);
    expect(css).toMatch(/\.campaign-dashboard-group\.is-active\s*\{[^}]*background: var\(--rqk-campaign-wax\)/);
    expect(css).toContain('#root .campaign-dashboard-simple .campaign-button-primary {\n  background: var(--rqk-campaign-brass)');
  });

  test('character sheet active tabs use the wax-seal identity', () => {
    const css = read('../clean-sheet/CleanSheetFinalHammer.css');
    expect(css).toMatch(/\.clean-sheet-tabs button\.active\s*\{[^}]*background: var\(--rq-guild-wine, #7E2D2D\)/);
    expect(css).toMatch(/\.clean-sheet-tabs button\.active svg\s*\{[^}]*color: #F8F0E5/);
  });

  test('mobile HP controls and readable skill text retain minimum sizes', () => {
    const css = read('../clean-sheet/CleanSheetMobileTidyFixes.css');
    expect(css).toContain('min-height: 46px !important;');
    expect(css).not.toContain('min-height: 36px !important;');
    expect(css).not.toContain('font-size: 8.5px !important;');
    expect(css).toContain('font-size: 12px !important;');
  });

  test('full labelled sheet rail only activates above tablet widths', () => {
    const css = read('../clean-sheet/CleanSheetTabsRail.css');
    expect(css).toContain('@media (min-width: 1181px) {');
    expect(css).not.toContain('@media (min-width: 760px) {');
  });
});
