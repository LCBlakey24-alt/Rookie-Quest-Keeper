import fs from 'fs';
import path from 'path';

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

describe('document scroll ownership', () => {
  test('viewport owns page scrolling while body and root grow naturally', () => {
    const css = read('scrollFixes.css');
    expect(css).toMatch(/html\s*\{[^}]*overflow-y:\s*auto\s*!important/s);
    expect(css).toMatch(/body,\s*#root\s*\{[^}]*overflow-x:\s*clip\s*!important;[^}]*overflow-y:\s*visible\s*!important/s);
    expect(css).not.toMatch(/html,\s*body,\s*#root\s*\{[^}]*overflow-y:\s*auto/s);
  });

  test('base CSS does not give body or #root a second page scrollbar', () => {
    const css = read('../index.css');
    expect(css).toMatch(/html\s*\{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/body,\s*#root\s*\{[^}]*overflow-y:\s*visible;/s);
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*overflow-x:\s*clip;/s);
    expect(css).not.toMatch(/html,\s*body,\s*#root\s*\{[^}]*overflow-y:\s*auto;/s);
  });

  test('global recovery never hijacks wheel events from scrollable panels', () => {
    const recovery = read('../components/ui/GlobalScrollRecovery.js');
    expect(recovery).not.toMatch(/addEventListener\(['"]wheel['"]/);
    expect(recovery).not.toMatch(/onWheel/);
    expect(recovery).not.toMatch(/window\.scrollBy/);
  });

  test('Live Play scroll container does not become an unwanted inner scrollbar', () => {
    const css = read('../components/gm/LiveSessionGridMode.css');
    expect(css).toMatch(/\.rqk-live-grid__tool-body\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*visible/s);
  });
});
