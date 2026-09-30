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

  test('redundant hero badge correction layer stays deleted', () => {
    const stack = read('featurePresentationStack.css');
    const alignment = read('characterSheetColumnAlignmentFix.css');
    const finalAuthority = read('../components/clean-sheet/CleanSheetFinalHammer.css');
    const retired = path.join(__dirname, 'characterSheetHeroBadgeFix.css');

    expect(fs.existsSync(retired)).toBe(false);
    expect(stack).not.toContain('characterSheetHeroBadgeFix.css');
    expect(alignment).toContain('padding-right: 92px !important;');
    expect(alignment).toContain('padding-right: 78px !important;');
    expect(alignment).toContain('padding-right: 70px !important;');
    expect(finalAuthority).toContain('.clean-sheet-identity h1::after');
    expect(finalAuthority).toContain('display: none !important;');
  });

  test('late-loaded live character styles cannot restore gradients or sunset colours', () => {
    const files = [
      '../components/clean-sheet/CleanSheetFinalHammer.css',
      '../components/clean-sheet/CleanSheetDicePolish.css',
      '../components/clean-sheet/CleanSheetTabsRail.css',
      '../components/clean-sheet/CleanSheetHeaderCompact.css',
      '../components/clean-sheet/CleanSheetStatsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetActionsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetInventoryMobileOverrides.css',
      '../components/clean-sheet/CleanSheetSpellsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetMobileTidyFixes.css',
      '../components/clean-sheet/CleanSheetTabAttention.css',
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

  test('retired sunset guard stays deleted and final authority owns its protections', () => {
    const sheet = read('../components/CleanCharacterSheet.js');
    const finalAuthority = read('../components/clean-sheet/CleanSheetFinalHammer.css');
    const retiredGuard = path.join(__dirname, '../components/clean-sheet/CleanSheetSunsetFinal.css');

    expect(fs.existsSync(retiredGuard)).toBe(false);
    expect(sheet).not.toContain('CleanSheetSunsetFinal.css');
    expect(finalAuthority).toContain('.clean-sheet-panel h2::after');
    expect(finalAuthority).toContain("button[aria-selected='true']");
    expect(finalAuthority).toContain("button[aria-pressed='true']");
    expect(finalAuthority).toContain('font-family: var(--rq-body-font');
    expect(finalAuthority).toContain('background: var(--cs-blue-soft) !important;');
  });

  test('Stats, Skills and Saving Throws presentation layers use Guild Ledger tokens', () => {
    const files = [
      read('characterSheetStatsFinalMobileTweaks.css'),
      read('characterSheetStatsTabFinalPolish.css'),
      read('characterSheetSkillsCompact.css'),
      read('characterSheetSavingThrowsCompact.css'),
    ];

    files.forEach((source) => {
      expect(source).toContain('var(--cs-');
      expect(source).not.toMatch(/#0C2234|#112A40|#F7F1E7|#D6A84F|#79BCE8|#071A29|rgba\(\s*214\s*,\s*168\s*,\s*79|rgba\(\s*121\s*,\s*188\s*,\s*232|rgba\(\s*255\s*,\s*255\s*,\s*255/i);
      expect(source).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
    });
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

  test('mobile Stats, Actions, Spells and Inventory use Guild Ledger tokens and phone touch targets', () => {
    const files = [
      '../components/clean-sheet/CleanSheetStatsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetActionsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetSpellsMobileOverrides.css',
      '../components/clean-sheet/CleanSheetInventoryMobileOverrides.css',
    ].map(read);

    files.forEach((source) => {
      expect(source).toContain('var(--cs-');
      expect(source).not.toMatch(/#071522|#0C2234|#112A40|#79BCE8|#D6A84F|#F7F1E7|#17364F|#071A29/i);
    });

    const actions = files[1];
    const spells = files[2];
    const inventory = files[3];

    expect(actions).toContain('min-height: 46px !important;');
    expect(spells).toContain('min-height: 46px !important;');
    expect(inventory).toContain('min-height: 46px !important;');
  });

  test('obsolete vertical mobile rail layer stays deleted', () => {
    const tabs = read('../components/clean-sheet/CleanSheetTabs.js');
    const finalAuthority = read('../components/clean-sheet/CleanSheetFinalHammer.css');
    const retiredRail = path.join(__dirname, '../components/clean-sheet/CleanSheetMobileRail.css');

    expect(fs.existsSync(retiredRail)).toBe(false);
    expect(tabs).not.toContain('CleanSheetMobileRail.css');
    expect(finalAuthority).toContain('flex-direction: row !important;');
    expect(finalAuthority).toContain('min-width: 48px !important;');
    expect(finalAuthority).toContain('height: 48px !important;');
  });

  test('character level badge no longer carries the retired sunset gradient', () => {
    const alignment = read('characterSheetColumnAlignmentFix.css');

    expect(alignment).toContain('.clean-sheet-hero-level-badge');
    expect(alignment).toContain('background: var(--cs-card) !important;');
    expect(alignment).toContain('border: 1px solid var(--cs-accent) !important;');
    expect(alignment).toContain('color: var(--cs-text) !important;');
    expect(alignment).toContain('color: var(--cs-text-soft) !important;');
    expect(alignment).not.toMatch(/linear-gradient|#7357ff|#d84df1|#ff4f81|#ff9542|#160722|#ffffff|rgba\(255\s*,\s*255\s*,\s*255/i);
  });

  test('play header and unified mobile header use Guild Ledger tokens without retired palette colours', () => {
    const playHeader = read('characterSheetPlayHeaderCompact.css');
    const mobileHeader = read('characterSheetUnifiedMobileHeader.css');
    const files = [playHeader, mobileHeader];

    files.forEach((source) => {
      expect(source).toContain('var(--cs-');
      expect(source).not.toMatch(/#071522|#0C2234|#112A40|#79BCE8|#D6A84F|#F7F1E7|#071A29|rgba\(214\s*,\s*168\s*,\s*79|rgba\(121\s*,\s*188\s*,\s*232/i);
    });

    expect(playHeader).toContain('.clean-sheet-inspiration-toggle.is-active');
    expect(playHeader).toContain('background: var(--cs-blue-soft) !important;');
    expect(playHeader).toContain('.clean-sheet-hp-progress span');
    expect(playHeader).toContain('background: var(--cs-blue) !important;');

    expect(mobileHeader).toContain('min-height: 46px !important;');
    expect(mobileHeader).toContain('border: 1px solid var(--cs-border-strong) !important;');
    expect(mobileHeader).toContain('color: var(--cs-text) !important;');
  });

  test('remaining rail, spell-unavailable and attention chrome use Guild Ledger semantic tokens', () => {
    const railHero = read('characterSheetRailAndHeroFix.css');
    const unavailable = read('characterSheetSpellUnavailableState.css');
    const attention = read('../components/clean-sheet/CleanSheetTabAttention.css');
    const css = [railHero, unavailable, attention].join('\n');

    expect(css).toContain('var(--cs-');
    expect(css).not.toMatch(/#7357ff|#d84df1|#ff4f81|#ff9542|#79BCE8|#D6A84F|#F7F1E7|#112A40|#0C2234|#071A29|#050E18|rgba\(214\s*,\s*168\s*,\s*79|rgba\(121\s*,\s*188\s*,\s*232/i);
    expect(css).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);

    expect(railHero).toContain('background: var(--cs-blue-soft) !important;');
    expect(unavailable).toContain('background: var(--cs-panel) !important;');
    expect(attention).toContain('border-color: var(--cs-warning) !important;');
    expect(attention).toContain('background: var(--cs-warning);');
    expect(attention).toContain('background: var(--cs-card) !important;');
  });

  test('header and rail use Guild Ledger tokens and keep phone rail controls touch-friendly', () => {
    const header = read('../components/clean-sheet/CleanSheetHeaderCompact.css');
    const rail = read('../components/clean-sheet/CleanSheetTabsRail.css');

    expect(header).toContain('background: var(--cs-panel) !important;');
    expect(header).toContain('color: var(--cs-text-soft) !important;');
    expect(header).toContain("min-height: 46px !important;");

    expect(rail).toContain('background: var(--cs-bg) !important;');
    expect(rail).toContain('background: var(--cs-blue-soft) !important;');
    expect(rail).toContain('border-color: var(--cs-accent) !important;');
    expect(rail).toContain('width: 46px !important;');
    expect(rail).toContain('height: 46px !important;');

    expect(header).not.toMatch(/#071522|#0C2234|#112A40|#79BCE8|#D6A84F|#F7F1E7/i);
    expect(rail).not.toMatch(/#071522|#0C2234|#112A40|#79BCE8|#D6A84F|#F7F1E7/i);
  });

  test('Guild Ledger hierarchy keeps secondary copy softer than primary values', () => {
    const finalAuthority = read('../components/clean-sheet/CleanSheetFinalHammer.css');
    const list = read('../components/clean-sheet/CleanSheetListPolish.css');

    expect(finalAuthority).toContain('color: var(--cs-text-soft) !important;');
    expect(finalAuthority).toContain('color: var(--cs-muted) !important;');
    expect(finalAuthority).toContain('.clean-sheet-tabs button:not(.active) span');
    expect(list).toContain('color: var(--cs-text-soft) !important;');
    expect(list).toContain('color: var(--cs-muted) !important;');
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
