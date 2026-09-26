import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, 'characterCreator.css'), 'utf8');

describe('tablet character creator presentation', () => {
  test('keeps the creator workspace inside the tablet lane', () => {
    expect(css).toContain("[data-rq-device='tablet'] .full-creator-page");
    expect(css).toContain('grid-template-columns: 86px minmax(0, 1fr)');
    expect(css).toContain('grid-template-columns: 1fr !important');
  });

  test('keeps form and summary grids readable without fixed wide columns', () => {
    expect(css).toContain('.full-creator-form-grid');
    expect(css).toContain('.full-creator-score-editor');
    expect(css).toContain('.full-creator-review-grid');
    expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
  });

  test('keeps the preview in normal flow on tablet', () => {
    expect(css).toContain('.full-creator-preview');
    expect(css).toContain('position: static');
  });
});
