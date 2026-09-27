import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Guild Ledger authentication presentation', () => {
  test('auth authority uses the approved palette and no decorative gradients', () => {
    const auth = read('../components/AuthPage.css');
    const polish = read('./authExperiencePolish.css');

    expect(auth).toContain('background: #0B1B2B !important;');
    expect(auth).toContain('background: #1E2936 !important;');
    expect(auth).toContain('background: #C9A96B !important;');
    expect(auth).toContain('outline: 3px solid #6E91B4');
    expect(auth).toContain('background: #7F2D2D !important;');
    expect(`${auth}\n${polish}`).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    expect(`${auth}\n${polish}`).not.toMatch(/#ff2daa|#ff4f81|#d84df1|#7357ff|#ff9542/i);
  });

  test('the public pre-bundle auth polish cannot flash the retired neon palette', () => {
    const publicPolish = read('../../public/rq-polish.css');
    const start = publicPolish.indexOf('/* ---------- Login / registration ---------- */');
    const end = publicPolish.indexOf('/* ---------- Responsive behaviour ---------- */', start);
    const authSection = publicPolish.slice(start, end);

    expect(authSection).toContain('background: #0B1B2B !important;');
    expect(authSection).toContain('background: #C9A96B !important;');
    expect(authSection).toContain('outline: 3px solid #6E91B4');
    expect(authSection).not.toMatch(/#ff2daa|#ff4f81|#d84df1|#7357ff|#ff9542/i);
    expect(authSection).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
  });

  test('auth copy carries the Guild Ledger campaign language', () => {
    const page = read('../components/AuthPage.js');

    expect(page).toContain('Guild Ledger • Table tools');
    expect(page).toContain('Plan • Organise • Track • Play');
    expect(page).toContain('Everything for the table, kept together.');
  });
});
