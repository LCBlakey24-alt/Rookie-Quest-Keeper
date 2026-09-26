import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Player feedback presentation ownership', () => {
  test('global player feedback uses the professional Keeper palette', () => {
    const css = read('globalFeedbackPlayer.css');
    const component = read('../components/GlobalFeedbackButton.js');

    expect(component).toContain("@/styles/globalFeedbackPlayer.css");
    expect(css).not.toMatch(/rq-sunset-gradient|linear-gradient|radial-gradient|conic-gradient|Cinzel/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542|#d00000/i);
    expect(css).toContain('#071522');
    expect(css).toContain('#112A40');
    expect(css).toContain('#79BCE8');
    expect(css).toContain('#D6A84F');
    expect(css).toContain("[data-testid='global-feedback-modal'][data-testid]");
    expect(css).toContain("[data-testid='global-feedback-btn'][data-testid]");
  });

  test('player feedback styling does not target the admin feedback workspace', () => {
    const css = read('globalFeedbackPlayer.css');
    expect(css).not.toMatch(/admin-feedback-tab/);
  });
});
