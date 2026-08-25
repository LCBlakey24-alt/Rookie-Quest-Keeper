import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(__dirname, relativePath));
}

describe('Character Creator presentation ownership', () => {
  test('live creator uses the navy/red presentation without retired sunset colours', () => {
    const base = read('../components/FullCharacterCreatorV2.css');
    const flow = read('../components/FullCharacterCreatorFlow.css');
    const css = `${base}\n${flow}`;

    expect(css).toContain('var(--rq-bg, #0a1728)');
    expect(css).toContain('var(--rq-primary, #d00000)');
    expect(css).not.toMatch(/rqk-creator-sunset|rq-sunset-gradient|rq-sunset-cream/i);
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

  test('final flow uses one horizontal step journey instead of a second vertical rail', () => {
    const flow = read('../components/FullCharacterCreatorFlow.css');

    expect(flow).toContain('grid-template-columns: 1fr !important;');
    expect(flow).toContain('display: flex !important;');
    expect(flow).toContain('overflow-x: auto !important;');
    expect(flow).not.toContain('grid-template-columns: 104px minmax(0, 1fr)');
  });

  test('tablet and mobile remove the competing live preview card', () => {
    const flow = read('../components/FullCharacterCreatorFlow.css');

    expect(flow).toContain("[data-rq-device='tablet'] .full-creator-preview");
    expect(flow).toContain("[data-rq-device='mobile'] .full-creator-preview");
    expect(flow.match(/\.full-creator-preview \{\n  display: none !important;/g)?.length || 0).toBeGreaterThanOrEqual(2);
  });

  test('creator header drops duplicate Dashboard navigation in the final flow', () => {
    const flow = read('../components/FullCharacterCreatorFlow.css');
    expect(flow).toContain('.full-creator-header > button:last-child');
    expect(flow).toContain('display: none !important;');
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
