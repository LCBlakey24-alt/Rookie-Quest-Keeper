import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'offlineCampaignControl.css'), 'utf8');
const marker = '/* Player-only RQK 1.0 authority. The GM offline control keeps its existing skin. */';
const playerCss = css.slice(css.indexOf(marker));

describe('Offline Player Pack presentation', () => {
  test('owns a flat player-only presentation without altering the GM rules above it', () => {
    expect(css).toContain(marker);
    expect(playerCss).toContain("[data-audience='player']");
    expect(playerCss).toContain('var(--guild-bg-deep)');
    expect(playerCss).toContain('var(--guild-panel)');
    expect(playerCss).toContain('var(--guild-h3)');
    expect(playerCss).toContain('var(--guild-c1)');
    expect(playerCss).toContain('#F7F1E7');
    expect(playerCss).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    expect(playerCss).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542|#eb3fe9/i);
    expect(playerCss).not.toMatch(/backdrop-filter:\s*blur/i);
  });
});
