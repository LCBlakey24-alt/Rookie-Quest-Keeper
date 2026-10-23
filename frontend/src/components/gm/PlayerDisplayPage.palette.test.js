import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'PlayerDisplayPage.js'), 'utf8');

describe('Guild Ledger player-display visual contract', () => {
  test('uses approved core palette instead of legacy black/red theme fallbacks', () => {
    expect(source).toContain("bg: 'var(--rq-bg-main, #0B1B2B)'");
    expect(source).toContain("panel: 'var(--rq-bg-panel, #1E2936)'");
    expect(source).toContain("card: 'var(--rq-card, #263748)'");
    expect(source).toContain("text: 'var(--rq-text-primary, #EADFC8)'");
    expect(source).toContain("red: 'var(--rq-primary, #C9A96B)'");
    expect(source).not.toContain("'var(--rq-primary, #d00000)'");
    expect(source).not.toContain("'var(--rq-bg-deep, #080808)'");
  });

  test('uses dark navy and slate for the player frame and NPC cards', () => {
    expect(source).toContain("isTable(target) ? 'var(--rq-bg-deep, #07131F)' : theme.bg");
    expect(source).toContain('const npcCardStyle = (target) => ({ background: theme.card');
    expect(source).toContain("const footerStyle = (target) => ({");
    expect(source).not.toContain('linear-gradient(135deg, #050505');
  });

  test('retains danger red for actual damage or danger states', () => {
    expect(source).toContain("danger: 'var(--rq-danger, #B94A4F)'");
    expect(source).toContain("status === 'down' || status === 'bloodied' ? theme.danger");
    expect(source).toContain("tone === 'danger' ? theme.danger : theme.lineStrong");
    expect(source).toContain("border: `2px solid ${theme.red}`");
  });
});
