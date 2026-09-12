import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Clean Character Sheet presentation ownership', () => {
  test('direct live-sheet presentation files no longer contain the retired sunset palette', () => {
    const files = [
      '../components/clean-sheet/CleanCharacterSheetPolish.css',
      '../components/clean-sheet/CleanSheetListPolish.css',
      '../components/clean-sheet/CleanSheetMobileBoxGrid.css',
      '../components/clean-sheet/CleanSheetSunsetFinal.css',
    ];
    const css = files.map(read).join('\n');

    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(css).not.toMatch(/cs-sunset|sheet-sunset|rq-sunset-gradient/i);
    expect(css).not.toMatch(/Cinzel/i);
    expect(css).toContain('var(--rq-bg, #0a1728)');
    expect(css).toContain('var(--rq-primary, #d00000)');
  });

  test('late-loaded live character styles cannot restore gradients or sunset colours', () => {
    const files = [
      '../components/clean-sheet/CleanSheetFinalHammer.css',
      '../components/clean-sheet/CleanSheetDicePolish.css',
      '../components/clean-sheet/CleanSheetTabsRail.css',
      '../components/clean-sheet/CleanSheetMobileRail.css',
      '../components/clean-sheet/CleanSheetHeaderCompact.css',
      '../components/clean-sheet/CleanSheetStatsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetMobileTidyFixes.css',
      '../components/FloatingDiceRoller.css',
      '../components/FloatingDiceRollerExperience.css',
      './characterSheetRailAndHeroFix.css',
      './characterSheetPlayHeaderCompact.css',
      './characterSheetUnifiedMobileHeader.css',
      './characterSheetSavingThrowsCompact.css',
      './characterSheetSkillsCompact.css',
      './characterSheetStatsFinalMobileTweaks.css',
      './characterSheetStatsTabFinalPolish.css',
      './characterSheetSpellUnavailableState.css',
    ];
    const css = files.map(read).join('\n');

    // Compatibility aliases may keep historical names while they are retired,
    // but they must resolve to flat colours: no gradient syntax or sunset hexes.
    expect(css).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542|#190728|#150721|#12051c/i);
    expect(css).toContain('#071522');
    expect(css).toContain('#7CCBFF');
    expect(css).toContain('#FF2DAA');
    expect(css).toContain('#FFFFFF');
  });

  test('historical mobile import delegates to the explicit mobile lane', () => {
    const bridge = read('../components/clean-sheet/CleanSheetMobileBoxGrid.css');
    expect(bridge).toContain("@import '../../layouts/mobile/characterSheet.css';");
    expect(bridge).not.toMatch(/@media\s*\(max-width/i);
  });

  test.each([
    ['../layouts/tablet/characterSheet.css', 'tablet'],
    ['../layouts/mobile/characterSheet.css', 'mobile'],
  ])('%s is scoped to the %s device lane', (relativePath, device) => {
    expect(read(relativePath)).toContain(`[data-rq-device='${device}']`);
  });

  test('the historical final sheet file is now only a compatibility guard', () => {
    const finalGuard = read('../components/clean-sheet/CleanSheetSunsetFinal.css');
    expect(finalGuard).toMatch(/sunset skin is retired/i);
    expect(finalGuard).not.toMatch(/linear-gradient|radial-gradient/i);
    expect(finalGuard).toContain('background-image: none !important;');
  });
});
