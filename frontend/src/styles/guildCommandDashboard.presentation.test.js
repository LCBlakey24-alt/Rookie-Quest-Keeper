import fs from 'fs';
import path from 'path';

const read = relative => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');

describe('Approved Guild Command screenshot-to-web implementation', () => {
  const campaign = read('../components/CampaignDashboard.js');
  const css = read('./guildCommandDashboard.css');
  const citrus = read('./citrusCommand.css');
  const entry = read('../index.js');

  test('uses final yellow to ember-red to deep-red gradient with centre blend', () => {
    expect(citrus).toContain('--rq-citrus-yellow: #F2C94C;');
    expect(citrus).toContain('--rq-citrus-orange: #EF6343;');
    expect(citrus).toContain('--rq-citrus-blood: #CE393A;');
    expect(citrus).toContain('var(--rq-citrus-yellow) 28%,');
    expect(citrus).toContain('var(--rq-citrus-orange) 50%,');
    expect(citrus).toContain('var(--rq-citrus-blood) 72%,');
    expect(citrus).not.toContain('background-size: 100% 100%');
    expect(entry.indexOf('guildCommandDashboard.css')).toBeGreaterThan(entry.indexOf('citrusCommand.css'));
    expect(entry).not.toContain('import "@/styles/guildBlueTexture.css"');
  });

  test('show a campaign-scoped party, not sample names or fake HP', () => {
    expect(campaign).toContain('apiClient.get(`/campaigns/${campaignId}/players`)');
    expect(campaign).toContain('rows.map(normalizeCampaignCharacter)');
    expect(campaign).toContain('if (cancelled) return');
    expect(campaign).toContain('className="guild-command-party"');
    expect(campaign).toContain('aria-labelledby="guild-command-party-title"');
    expect(campaign).toContain('Party at a Glance');
    expect(campaign).toContain('member.currentHp');
    expect(campaign).toContain('member.maxHp');
    expect(campaign).toContain("onOpenTab('players')");
    for (const fabricatedName of ['Thalion', 'Brom Stonefist', 'Lira Vale']) {
      expect(campaign).not.toContain(fabricatedName);
    }
  });

  test('protects campaign separation, failed reads and real empty state', () => {
    expect(campaign).toContain('}, [campaignId, partyRefreshNonce]);');
    expect(campaign).toContain('return () => { cancelled = true; };');
    expect(campaign).toContain("status: previous.members.length ? 'stale' : 'unavailable'");
    expect(campaign).toContain('No adventurers linked yet.');
    expect(campaign).toContain('Party records are unavailable.');
    expect(campaign).toContain('aria-label="Campaign library at a glance"');
  });

  test('desktop is a proper responsive two-column command centre, not a fixed 1920px screenshot', () => {
    expect(css).toContain('grid-template-columns: repeat(5, minmax(0,1fr)) !important;');
    expect(css).toContain('grid-template-columns: minmax(0,1.55fr) minmax(290px,1fr) !important;');
    expect(css).toContain('.guild-command-party__member');
    expect(css).toContain('@media (min-width: 1181px)');
    expect(css).toContain('@media (min-width: 761px) and (max-width: 1180px)');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('grid-template-columns: repeat(2,minmax(0,1fr)) !important;');
    expect(css).toContain('overflow-wrap: anywhere !important;');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('normal controls stay navy and gradients only decorate thin edges', () => {
    expect(css).toContain('background-color: #142638 !important;');
    expect(css).toContain('background-size: 100% 3px !important;');
    expect(css).toContain('background-position: left bottom !important;');
    expect(css).not.toContain('background-size: 100% 100%');
    expect(css).not.toMatch(/url\(/);
    expect(css).not.toContain('#7E2D2D');
  });
});
