import fs from 'fs';
import path from 'path';

function source(file) {
  return fs.readFileSync(path.join(__dirname, file), 'utf8');
}

describe('GM NPC roster on small screens', () => {
  test('uses a compact list beside exactly one selected full stat block', () => {
    const jsx = source('./NPCsTab.js');
    expect(jsx).toContain('<RosterSplitView');
    expect(jsx).toContain('testId="gm-npc-split-reference"');
    expect(jsx).toContain('getSubtitle={npc => npc.role || npc.occupation || npc.location');
    expect(jsx).toContain('<NpcCompactStatBlock npc={npc} />');
    expect(jsx).toContain('onSelect={setSelectedNpcId}');
    expect(jsx).toContain('aria-label={`Edit ${npc.name}`}');
    expect(jsx).toContain('aria-label={`Delete ${npc.name}`}');
    expect(jsx).not.toContain('filteredNPCs.map(npc => (');
  });

  test('keeps full-size stat sheets and uses the Create NPC tool for generating', () => {
    const css = source('./NPCsTab.css');
    expect(css).toContain('.rqk-npc-master');
    expect(css).toContain('.rqk-npc-selected-sheet');
    expect(css).toContain('.rqk-npc-selected-delete-confirm');
    expect(source('./NPCsTab.js')).not.toContain('{/* ROOK Panel */}');
  });

  test('mobile campaign header cannot cover the add/search controls', () => {
    const css = source('../CampaignDashboard.css');
    const phoneHeader = css.match(/\/\* On phones the GM header should scroll[\s\S]*?\n\}/)?.[0] || '';
    expect(phoneHeader).toContain('position: static !important');
    expect(phoneHeader).toContain('top: auto !important');
  });

  test('failed NPC request is not presented as deletion or an empty campaign', () => {
    const jsx = source('./NPCsTab.js');
    expect(jsx).toContain('npc-roster-load-error');
    expect(jsx).toContain('Retry loading NPCs');
    expect(jsx).toContain('activeCampaignRef.current !== requestedCampaign');
  });
  test('phone campaign header stays in the page flow at narrow viewport widths', () => {
    const css = source('../CampaignDashboard.css');
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain('#root .campaign-dashboard-simple .gm-dashboard-header.campaign-dashboard-header');
    expect(css).toContain('inset: auto !important');
    expect(css).toContain('-webkit-line-clamp: 2 !important');
    expect(css).toContain('calc(104px + env(safe-area-inset-bottom, 0px))');
  });

  test('split reader uses a swipeable short list on phones', () => {
    const css = require('fs').readFileSync(require('path').join(__dirname, '../gm/RosterSplitView.css'), 'utf8');
    expect(css).toContain('grid-template-columns: clamp(208px, 24vw, 284px)');
    expect(css).toContain('@container (max-width: 680px)');
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('scroll-snap-type: x proximity');
    expect(css).toContain(':focus-visible');
  });

});
