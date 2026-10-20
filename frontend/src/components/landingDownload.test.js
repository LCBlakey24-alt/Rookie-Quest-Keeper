import { publicWindowsInstallerUrl } from './landingDownload';

describe('public signed Windows download URL gate', () => {
  const trusted = 'https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/releases/download/desktop-v0.5.0/Rookie%20Quest%20Keeper%20Setup%200.5.0.exe';
  test('permits explicit 0.5.0+ official Windows installer assets', () => {
    expect(publicWindowsInstallerUrl(trusted)).toBe(trusted);
  });
  test('does not expose old, missing, foreign or mutable release URLs', () => {
    for (const value of [
      null,
      '',
      'https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/releases/latest',
      'https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/releases/download/desktop-v0.4.0/Setup.exe',
      'https://example.com/LCBlakey24-alt/Rookie-Quest-Keeper/releases/download/desktop-v0.5.0/Setup.exe',
      'http://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/releases/download/desktop-v0.5.0/Setup.exe',
      'https://github.com/LCBlakey24-alt/Rookie-Quest-Keeper/releases/download/desktop-v0.5.0/Setup.exe?unreviewed=yes',
    ]) {
      expect(publicWindowsInstallerUrl(value)).toBeNull();
    }
  });
});
