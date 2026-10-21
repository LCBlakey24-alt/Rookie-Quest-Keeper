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
    expect(jsx).toContain('Full stat block · HP');
    expect(jsx).toContain('<NpcCompactStatBlock npc={npc} />');
    expect(jsx).toContain('aria-label={`Edit ${npc.name}`}');
    expect(jsx).toContain('aria-label={`Delete ${npc.name}`}');
  });

  test('uses one-column roster, touch-friendly actions and leaves generator in its own tab', () => {
    const css = source('./NPCsTab.css');
    expect(css).toContain('@media (max-width: 719px)');
    expect(css).toContain('grid-template-columns: 40px minmax(0, 1fr) auto !important');
    expect(css).toContain('min-width: 40px !important');
    expect(css).toContain('min-height: 0 !important');
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
});
