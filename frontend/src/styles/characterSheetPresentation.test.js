import fs from 'fs';
import path from 'path';

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

describe('Clean Character Sheet presentation ownership', () => {
  test('direct live-sheet presentation files use the professional Keeper palette and no retired sunset palette', () => {
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
    expect(css).not.toMatch(/#d00000|rgba\(208\s*,\s*0\s*,\s*0/i);
    expect(css).toContain('#071522');
    expect(css).toContain('#79BCE8');
    expect(css).toContain('#D6A84F');
    expect(css).toContain('#F7F1E7');
  });

  test('late-loaded live character styles cannot restore gradients or sunset colours', () => {
    const files = [
      '../components/clean-sheet/CleanSheetFinalHammer.css',
      '../components/clean-sheet/CleanSheetDicePolish.css',
      '../components/clean-sheet/CleanSheetTabsRail.css',
      '../components/clean-sheet/CleanSheetMobileRail.css',
      '../components/clean-sheet/CleanSheetHeaderCompact.css',
      '../components/clean-sheet/CleanSheetStatsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetActionsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetInventoryMobileOverrides.css',
      '../components/clean-sheet/CleanSheetSpellsMobileOverrides.css',
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
    expect(css).toContain('#79BCE8');
    expect(css).toContain('#D6A84F');
    expect(css).toContain('#F7F1E7');
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

  test('mobile character-sheet roll and filter controls keep the 46px phone touch target', () => {
    const skills = read('characterSheetSkillsCompact.css');
    const stats = read('../components/clean-sheet/CleanSheetStatsMobileOverrides.css');
    const finalTweaks = read('characterSheetStatsFinalMobileTweaks.css');

    expect(skills).toContain('min-height: 46px !important;');
    expect(skills).toContain('min-width: 46px !important;');
    expect(stats).toContain('width: 46px !important;');
    expect(stats).toContain('height: 46px !important;');
    expect(finalTweaks).toContain('max-height: 46px !important;');
  });

  test('the live sheet authority uses Guild Ledger tokens and a horizontal phone tab rail', () => {
    const finalAuthority = read('../components/clean-sheet/CleanSheetFinalHammer.css');
    const compactStatus = read('../components/clean-sheet/CleanSheetCompactStatus.js');
    const sheet = read('../components/CleanCharacterSheet.js');

    expect(finalAuthority).toContain('--cs-bg: #0B1B2B');
    expect(finalAuthority).toContain('--cs-panel: #1E2936');
    expect(finalAuthority).toContain('--cs-card: #263748');
    expect(finalAuthority).toContain('--cs-accent: #C9A96B');
    expect(finalAuthority).toContain('--cs-blue: #6E91B4');
    expect(finalAuthority).toContain('flex-direction: row !important;');
    expect(finalAuthority).toContain('overflow-x: auto !important;');
    expect(finalAuthority).toContain('inset: 50px auto auto !important;');
    expect(finalAuthority).toContain('display: inline-block !important;');
    expect(finalAuthority).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542/i);
    expect(compactStatus).toContain('<span>Proficiency</span>');
    expect(sheet).toContain('proficiencyBonus={proficiencyBonus}');
  });
});
