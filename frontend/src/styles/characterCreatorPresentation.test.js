import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(__dirname, relativePath));
}

describe('Character Creator presentation ownership', () => {
  test('live creator uses the shared navy, cream, gold and blue presentation', () => {
    const base = read('../components/FullCharacterCreatorV2.css');
    const flow = read('../components/FullCharacterCreatorFlow.css');
    const css = `${base}\n${flow}`;

    expect(css).toContain('var(--rq-bg');
    expect(css).toContain('#C9A96B');
    expect(css).toContain('#6E91B4');
    expect(css).toContain('#EADFC8');
    expect(css).not.toMatch(/#FF2DAA|rgba\(255\s*,\s*45\s*,\s*170/i);
    expect(css).not.toMatch(/rqk-creator-sunset|rq-sunset-gradient|rq-sunset-cream/i);
    expect(css).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).not.toMatch(/Cinzel/i);
  });

  test('creator base imports explicit tablet and mobile layout lanes', () => {
    const base = read('../components/FullCharacterCreatorV2.css');
    expect(base).toContain("@import '../layouts/tablet/characterCreator.css';");
    expect(base).toContain("@import '../layouts/mobile/characterCreator.css';");
  });

  test.each([
    ['../layouts/tablet/characterCreator.css', 'tablet'],
    ['../layouts/mobile/characterCreator.css', 'mobile'],
  ])('%s is scoped to the %s device lane', (relativePath, device) => {
    expect(read(relativePath)).toContain(`[data-rq-device='${device}']`);
  });

  test('retired mixed creator presentation files are deleted and not globally imported', () => {
    const stack = read('featurePresentationStack.css');
    expect(exists('mobileAppBoxGrid.css')).toBe(false);
    expect(exists('fullCreatorReadiness.css')).toBe(false);
    expect(stack).not.toMatch(/mobileAppBoxGrid\.css|fullCreatorReadiness\.css/);
  });

  test('readiness styling belongs to the creator base', () => {
    const base = read('../components/FullCharacterCreatorV2.css');
    expect(base).toContain('.full-creator-readiness-panel');
    expect(base).toContain('.full-creator-readiness-list.priority');
  });

  test('base fixed Level 1 control is hidden because the bridge owns starting level', () => {
    const flow = read('../components/FullCharacterCreatorFlow.css');
    expect(flow).toContain("label:has(> select:disabled)");
    expect(flow).toContain('display: none');
  });
});
