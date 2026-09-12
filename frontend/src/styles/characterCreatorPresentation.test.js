import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(__dirname, relativePath));
}

describe('Character Creator presentation ownership', () => {
  test('live creator uses the flat RQK 1.0 presentation without retired sunset colours', () => {
    const base = read('../components/FullCharacterCreatorV2.css');
    const flow = read('../components/FullCharacterCreatorFlow.css');
    const css = `${base}\n${flow}`;

    expect(css).toContain('#071522');
    expect(css).toContain('#7CCBFF');
    expect(css).toContain('#FF2DAA');
    expect(css).toContain('#FFFFFF');
    expect(css).not.toMatch(/#d00000|rgba\(208\s*,\s*0\s*,\s*0/i);
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
});
