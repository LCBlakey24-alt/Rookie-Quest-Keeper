import fs from 'fs';
import path from 'path';

const read = rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

describe('Guild Command bookcloth background', () => {
  test('the final optional texture stylesheet loads after Guild Command', () => {
    const index = read('../index.js');
    expect(index.indexOf('guildBlueTexture.css')).toBeGreaterThan(index.indexOf('guildCommand.css'));
  });

  test('uses a small self-hosted original seamless texture behind the signed-in shell', () => {
    const css = read('./guildBlueTexture.css');
    const svg = read('../../public/brand/guild-blue-bookcloth.svg');
    expect(css).toContain('html body #root .rqk-app-shell');
    expect(css).toContain('html body #root .rqk-app-shell .rqk-app-workspace');
    expect(css).toContain("url('/brand/guild-blue-bookcloth.svg')");
    expect(css).toContain('192px 192px');
    expect(css).not.toMatch(/url\(['"]?https?:\/\//i);
    expect(svg).toContain('stitchTiles="stitch"');
    expect(svg).toContain('patternUnits="userSpaceOnUse"');
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org\/2000\/svg)/);
  });

  test('does not texture stat-block cards, tools, public landing, or player TV', () => {
    const css = read('./guildBlueTexture.css');
    expect(css).toContain('html body #root .rqk-app-shell .rqk-app-shell-content');
    expect(css).toContain('background: transparent !important;');
    expect(css).not.toContain('.rqk-reference-browser__detail {');
    expect(css).not.toContain('.rqk-stat-block {');
    expect(css).not.toContain('.keeper-product-site {');
    expect(css).not.toContain('.rqk-auth-page {');
    expect(css).not.toContain('.player-display-page {');
    expect(css).toContain('@media (prefers-contrast: more)');
  });
});
