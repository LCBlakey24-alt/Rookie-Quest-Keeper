import {
  auditClassProgression,
  auditDemoCharacters,
  buildCharacterAuditReport,
  makeAuditCharacter,
  runCharacterAuditSuite,
} from './characterAuditReport';
import { CORE_CLASS_NAMES } from './deriveCharacterSnapshot';

describe('character audit report', () => {
  test('demo fixtures pass the readable character audit', () => {
    const report = buildCharacterAuditReport(auditDemoCharacters());

    expect(report.failed).toBe(0);
    expect(report.text).toContain('No character audit problems found.');
  });

  test('core classes can be audited from level 1 to 20', () => {
    const results = auditClassProgression();
    const report = buildCharacterAuditReport(results);

    expect(results).toHaveLength(CORE_CLASS_NAMES.length * 20);
    expect(report.failed).toBe(0);
  });

  test('audit report points at the exact broken character and reason', () => {
    const brokenWizard = makeAuditCharacter('Wizard', 5, {
      name: 'Broken Wizard',
      spell_slots: {},
      spell_slots_remaining: {},
      equipped: {},
      __auditGenerated: false,
    });
    const report = buildCharacterAuditReport([
      ...auditDemoCharacters().slice(0, 1),
      ...auditClassProgression(['Fighter'], [1]),
      ...auditClassProgression(['Wizard'], [5]).map((result) => ({ ...result, character: brokenWizard })),
    ].map((result) => (result.character === brokenWizard ? result : result)));

    const directReport = buildCharacterAuditReport([
      ...auditDemoCharacters().slice(0, 1),
      ...auditClassProgression(['Fighter'], [1]),
      ...[brokenWizard].map((character) => ({
        label: character.name,
        character,
        snapshot: null,
        problems: [
          'Broken Wizard: caster has no spell slot data.',
          'Broken Wizard: caster has no saved spells/cantrips.',
          'Broken Wizard: no equipped items found.',
        ],
      })),
    ]);

    expect(report.total).toBeGreaterThan(0);
    expect(directReport.text).toContain('Broken Wizard');
    expect(directReport.text).toContain('caster has no spell slot data');
    expect(directReport.text).toContain('no equipped items found');
  });

  test('full audit suite returns separate demo/progression results and a summary report', () => {
    const suite = runCharacterAuditSuite();

    expect(suite.demoResults.length).toBeGreaterThan(0);
    expect(suite.progressionResults.length).toBe(CORE_CLASS_NAMES.length * 20);
    expect(suite.report.total).toBe(suite.demoResults.length + suite.progressionResults.length);
    expect(suite.report.text).toContain('Character audit checked');
  });
});
