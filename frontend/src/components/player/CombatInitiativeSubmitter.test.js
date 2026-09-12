import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, 'CombatInitiativeSubmitter.js'), 'utf8');

describe('player combat initiative widget', () => {
  test('uses the flat player palette instead of the retired red theme', () => {
    expect(source).toContain("panel: '#0C2234'");
    expect(source).toContain("card: '#102B40'");
    expect(source).toContain("blue: '#7CCBFF'");
    expect(source).toContain("lineStrong: '#FF2DAA'");
    expect(source).not.toMatch(/var\(--rq-accent-primary\)|#d00000/i);
  });

  test('polls gently while idle, faster during combat, and pauses hidden tabs', () => {
    expect(source).toContain('const ACTIVE_POLL_MS = 4000;');
    expect(source).toContain('const IDLE_POLL_MS = 15000;');
    expect(source).toContain('combatActive ? ACTIVE_POLL_MS : IDLE_POLL_MS');
    expect(source).toContain("document.visibilityState !== 'hidden'");
    expect(source).toContain("document.addEventListener('visibilitychange', handleVisibility)");
    expect(source).toContain('window.setInterval(refreshIfVisible, pollMs)');
  });
});
