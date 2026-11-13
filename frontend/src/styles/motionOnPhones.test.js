import fs from 'fs';
import path from 'path';

// Animation is cut only for people who prefer reduced motion, never by screen
// width: a width rule froze the background hexagons and every transition on
// phones and tablets.
const STYLES = path.join(__dirname);
const files = fs.readdirSync(STYLES).filter((name) => name.endsWith('.css'));

test('no stylesheet switches animation off by screen width', () => {
  files.forEach((name) => {
    const css = fs.readFileSync(path.join(STYLES, name), 'utf8');
    const blocks = css.split('@media').slice(1);
    blocks.forEach((block) => {
      const query = block.slice(0, block.indexOf('{'));
      const body = block.slice(block.indexOf('{'), block.indexOf('{') + 600);
      if (/animation-duration:\s*0\.01ms/.test(body)) {
        expect(`${name}: ${query.trim()}`).toMatch(/prefers-reduced-motion: reduce\)?\s*$/);
      }
    });
  });
});

test('the background hexagons turn slowly and stop for reduced motion', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'components', 'guild-motif', 'HexBackdrop.css'), 'utf8');
  const turns = [...css.matchAll(/--turn:\s*(\d+)s/g)].map((match) => Number(match[1]));
  expect(turns.length).toBeGreaterThan(0);
  turns.forEach((seconds) => {
    expect(seconds).toBeGreaterThanOrEqual(30);
    expect(seconds).toBeLessThanOrEqual(120);
  });
  expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*{\s*\.rq-hex-backdrop__hex\s*{\s*animation: none;/);
});
