import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(__dirname, relativePath), 'utf8');

describe('Neon Coast inset-glow presentation', () => {
  test('shared surfaces pair a restrained one-pixel edge with the inset glow', () => {
    const tokens = read('./guildTokens.css');

    expect(tokens).toMatch(/--guild-line:\s*rgba\([^;]+\);/);
    expect(tokens).toMatch(/--guild-line-hot:\s*rgba\([^;]+\);/);
    expect(tokens).toMatch(/--guild-box:[^;]*var\(--guild-bg\)[^;]*border-box;/);
    expect(tokens).toMatch(/--guild-box:[^;]*--guild-edge-cool/);
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

  test('choice and character wheels use clipped halos with the Home wheel fine edge', () => {
    const choice = read('../components/guild-motif/GuildChoiceWheel.css');
    const sheet = read('../components/hex-sheet/hexSheet.css');

    expect(choice).toMatch(/\.guild-wheel__case\s*\{[^}]*stroke-width:\s*0\.45/);
    expect(choice).toMatch(/\.guild-wheel__edge\s*\{[^}]*stroke-width:\s*0\.4/);
    expect(choice).toContain('.guild-wheel__glow--case');
    expect(sheet).toContain('--hex-resting-edge: var(--hex-orange-soft);');
    expect(sheet).toMatch(/\.hex-glow__edge\s*\{[^}]*stroke-width:\s*0\.45/);
    expect(sheet).toMatch(/\.hex-wheel__wedge \.hex-glow__edge\s*\{[^}]*stroke-width:\s*0\.4/);
    expect(sheet).toMatch(/\.hex-glow__halo\s*\{[^}]*stroke:/);
    expect(sheet).toMatch(/:focus-visible[^\n]*\.hex-glow__edge/);
  });

  test('creator and level-up buttons strengthen both the fine edge and glow', () => {
    const creator = read('../components/FullCharacterCreatorGuild.css');
    const levelUp = read('../components/LevelUpWizardGuild.css');

    [creator, levelUp].forEach((css) => {
      expect(css).toMatch(/border: 1px solid var\(--(?:gl|lu)-line\);/);
      expect(css).toMatch(/border-color: var\(--(?:gl|lu)-hi\); box-shadow: var\(--guild-box-glow-hot\);/);
      expect(css).toContain('outline: 2px solid var(--guild-focus-ring);');
    });
  });
});
