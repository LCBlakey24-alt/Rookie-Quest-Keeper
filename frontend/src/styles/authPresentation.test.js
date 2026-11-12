import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Guild Ledger authentication presentation', () => {
  test('auth authority uses the approved palette and no decorative gradients', () => {
    const auth = read('../components/AuthPage.css');
    const polish = read('./authExperiencePolish.css');

    expect(auth).toContain('background: #0a2342 !important;');
    expect(auth).toContain('background: #0a2342 !important;');
    expect(auth).toContain('background: #0a2342 !important;');
    expect(auth).not.toContain('background: #f2892f !important;');
    expect(auth).toContain('outline: 3px solid #3C92E0');
    expect(auth).toContain('background: #7F2D2D !important;');
    expect(`${auth}\n${polish}`).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    expect(`${auth}\n${polish}`).not.toMatch(/#ff2daa|#ff4f81|#d84df1|#7357ff|#ff9542/i);
  });

  test('the public pre-bundle auth polish cannot flash the retired neon palette', () => {
    const publicPolish = read('../../public/rq-polish.css');
    const start = publicPolish.indexOf('/* ---------- Login / registration ---------- */');
    const end = publicPolish.indexOf('/* ---------- Responsive behaviour ---------- */', start);
    const authSection = publicPolish.slice(start, end);

    expect(authSection).toContain('background: #0a2342 !important;');
    expect(authSection).toContain('background: #0a2342 !important;');
    expect(authSection).not.toContain('background: #f2892f !important;');
    expect(authSection).toContain('outline: 3px solid #3C92E0');
    expect(authSection).not.toMatch(/#ff2daa|#ff4f81|#d84df1|#7357ff|#ff9542/i);
    expect(authSection).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
  });

  test('the sign-in page carries the hexagon badge, which spells out the name', () => {
    const page = read('../components/AuthPage.js');

    expect(page).toContain('rqk-auth-brand__sigil');
    expect(page).toContain('alt="Rookie Quest Keeper"');
    expect(page).not.toContain('BrandMainLogo');
  });

  test('the sign-in page is one centred card, not a two-column pitch', () => {
    // The layout used to be a marketing panel beside the form, and the panel
    // rendered only when signing up -- so the sign-in page reserved an empty
    // column and pushed the card to one side. Sign-in and sign-up are now the
    // same centred box.
    const page = read('../components/AuthPage.js');
    const css = read('../components/AuthPage.css');

    expect(page).not.toContain('rqk-auth-hero');
    expect(page).not.toContain('rqk-auth-feature-grid');
    expect(page).not.toContain('AuthNextSteps');
    expect(page).not.toContain('AuthAssurancePanel');

    const layout = css.slice(css.indexOf('.rqk-auth-layout {'));
    expect(layout.slice(0, layout.indexOf('}'))).toContain('grid-template-columns: minmax(0, 1fr)');
  });
});
