import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('Neon Coast inset-glow presentation', () => {
  test('shared surfaces reserve border geometry without drawing a resting outline', () => {
    const tokens = read('./guildTokens.css');

    expect(tokens).toMatch(/--guild-line:\s*transparent;/);
    expect(tokens).toMatch(/--guild-line-hot:\s*transparent;/);
    expect(tokens).toMatch(/--guild-box:[^;]*var\(--guild-bg\)[^;]*border-box;/);
    expect(tokens).not.toMatch(/--guild-box:[^;]*--guild-edge-cool/);
    expect(tokens).toMatch(/--guild-box-glow:[\s\S]*?inset/);
    expect(tokens).toMatch(/--guild-control-glow:[\s\S]*?inset/);
  });

  test('editable fields and keyboard focus keep accessible boundaries', () => {
    const tokens = read('./guildTokens.css');
    const creator = read('../components/FullCharacterCreatorGuild.css');

    expect(tokens).toContain('--guild-field-line:');
    expect(tokens).toContain('--guild-field-line-focus:');
    expect(tokens).toContain('--guild-focus-ring:');
    expect(creator).toContain('border-color: var(--guild-field-line);');
    expect(creator).toContain('outline: 2px solid var(--guild-focus-ring);');
  });

  test('choice and character wheels use clipped halos with no resting SVG stroke', () => {
    const choice = read('../components/guild-motif/GuildChoiceWheel.css');
    const sheet = read('../components/hex-sheet/hexSheet.css');

    expect(choice).toMatch(/\.guild-wheel__case\s*\{[^}]*stroke:\s*none/);
    expect(choice).toMatch(/\.guild-wheel__edge\s*\{[^}]*stroke:\s*none/);
    expect(choice).toContain('.guild-wheel__glow--case');
    expect(sheet).toContain('--hex-resting-edge: transparent;');
    expect(sheet).toMatch(/\.hex-glow__edge\s*\{[^}]*stroke:\s*none/);
    expect(sheet).toMatch(/\.hex-glow__halo\s*\{[^}]*stroke:/);
    expect(sheet).toMatch(/:focus-visible[^\n]*\.hex-glow__edge/);
  });

  test('creator and level-up buttons strengthen glow without restoring a border', () => {
    const creator = read('../components/FullCharacterCreatorGuild.css');
    const levelUp = read('../components/LevelUpWizardGuild.css');

    [creator, levelUp].forEach((css) => {
      expect(css).toContain('border: 1px solid transparent;');
      expect(css).toContain('border-color: transparent; box-shadow: var(--guild-box-glow-hot);');
      expect(css).toContain('outline: 2px solid var(--guild-focus-ring);');
    });
  });
});
