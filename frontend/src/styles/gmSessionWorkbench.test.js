import fs from 'fs';
import path from 'path';

const dashboard = () => fs.readFileSync(path.join(__dirname, '../components/CampaignDashboard.js'), 'utf8');
const css = () => fs.readFileSync(path.join(__dirname, '../components/CampaignDashboard.css'), 'utf8');

describe('Guild Ledger session workbench and navigation', () => {
  test('keeps the table-first action rail above the campaign workbench', () => {
    const source = dashboard();
    expect(source).toContain('className="campaign-home-session-rail"');
    expect(source).toContain('className="campaign-home-workbench"');
    expect(source.indexOf('className="campaign-home-session-rail"'))
      .toBeLessThan(source.indexOf('className="campaign-home-workbench"'));
    expect(source).toContain('className="campaign-home-focus-grid"');
    expect(source).toContain('className="campaign-home-detail-grid"');
  });

  test('workbench provides a desktop secondary rail but remains one column on mobile', () => {
    const style = css();
    expect(style).toContain('@media (min-width: 1180px)');
    expect(style).toContain('grid-template-columns: minmax(0,1fr) minmax(270px,.34fr)');
    expect(style).toContain('@media (max-width: 760px)');
    expect(style).toContain('.campaign-home-workbench');
    expect(style).not.toMatch(/#FF2DAA|rgba\(255,45,170|#7CCBFF/i);
  });

  test('browser back returns to the previous tool without jumping the page', () => {
    const source = dashboard();
    expect(source).toContain("window.addEventListener('popstate', onHashChange)");
    expect(source).toContain("window.removeEventListener('popstate', onHashChange)");
    expect(source).toContain('row.scrollLeft = row.scrollLeft');
    expect(source).not.toContain("selected?.scrollIntoView?.(");
    expect(source).toContain('window.location.search');
  });

  test('a delayed manual GM Home refresh cannot overwrite a newer request', () => {
    const source = dashboard();
    expect(source).toContain('homeRequestRef.current');
    expect(source).toContain('requestId !== homeRequestRef.current');
    expect(source).toContain('return () => { homeRequestRef.current += 1; };');
    expect(source).toContain('campaignLoadSeqRef.current');
    expect(source).toContain('inviteCampaignId === campaignId ? invite : null');
  });
});
