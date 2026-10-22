import fs from 'fs';
import path from 'path';

function source(file) {
  return fs.readFileSync(path.join(__dirname, file), 'utf8');
}

describe('GM NPC roster on small screens', () => {
  test('keeps full stat blocks available inside compact NPC cards', () => {
    const jsx = source('./NPCsTab.js');
    expect(jsx).toContain('rqk-npc-card');
    expect(jsx).toContain('rqk-npc-card-header');
    expect(jsx).toContain('rqk-npc-card-content');
    expect(jsx).toContain('Full stat block & lore');
    expect(jsx).toContain('expandedNpcIds.has(npc.id) && <NpcCompactStatBlock npc={npc} />');
    expect(jsx).toContain('Expand visible stat blocks');
    expect(jsx).toContain('Collapse visible stat blocks');
    expect(jsx).toContain('onNpcDetailsToggle(npc.id, event.currentTarget.open)');
    expect(jsx).toContain('aria-label={`Edit ${npc.name}`}');
    expect(jsx).toContain('aria-label={`Delete ${npc.name}`}');
  });

  test('uses one-column roster, touch-friendly actions and leaves generator in its own tab', () => {
    const css = source('./NPCsTab.css');
    expect(css).toContain('@media (max-width: 719px)');
    expect(css).toContain('grid-template-columns: 40px minmax(0, 1fr) auto !important');
    expect(css).toContain('min-width: 44px !important');
    expect(css).toContain('min-height: 0 !important');
    expect(css).toContain('.rqk-npc-roster-toolbar');
    expect(css).toContain('.rqk-npc-summary-stats');
    expect(css).toContain('.rqk-npc-expand-toggle');
    expect(css).toContain('.rqk-npcs-roster-grid > .ai-assistant-panel');
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

  test('phone NPC cards do not inherit oversized header and content heights', () => {
    const css = source('./NPCsTab.css');
    expect(css).toContain('#root .rqk-npc-list .rqk-npc-card-header');
    expect(css).toContain('#root .rqk-npc-list .rqk-npc-card-content');
    expect(css).toContain('height: auto !important');
    expect(css).toContain('min-height: 0 !important');
  });

});
